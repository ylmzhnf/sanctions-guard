import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { Plan } from '@prisma/client';

type StripeInstance = ReturnType<typeof Stripe>;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: StripeInstance | null = null;

  
  private readonly PLAN_LIMITS: Record<Plan, number> = {
    FREE: 10,
    STARTER: 500,
    BUSINESS: 10000,
    ENTERPRISE: -1, 
    SELF_HOSTED: -1, 
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {
    
    if (this.config.isSaas()) {
      const secretKey = this.config.getEnv<string>('STRIPE_SECRET_KEY');
      if (secretKey) {
        this.stripe = new Stripe(secretKey, {
          apiVersion: '2024-11-20.acacia' as any,
        });
      } else {
        this.logger.warn('SaaS mode active but STRIPE_SECRET_KEY is missing!');
      }
    }
  }

  
  async createCheckoutSession(orgId: string, priceId: string) {
    this.ensureSaaS();

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });

    let customerId = org.stripeCustomerId;

    
    if (!customerId) {
      const customer = await this.stripe!.customers.create({
        email: `org_${orgId}@customer.com`, 
        metadata: { orgId },
      });
      customerId = customer.id;
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl = this.config.getEnv<string>('FRONTEND_URL', 'http://localhost:3000');

    const session = await this.stripe!.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard/billing?success=true`,
      cancel_url: `${frontendUrl}/dashboard/billing?canceled=true`,
      metadata: { orgId },
    });

    return { url: session.url };
  }

  
  async createPortalSession(orgId: string) {
    this.ensureSaaS();

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });

    if (!org.stripeCustomerId) {
      throw new BadRequestException('No active billing record found.');
    }

    const frontendUrl = this.config.getEnv<string>('FRONTEND_URL', 'http://localhost:3000');

    const session = await this.stripe!.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${frontendUrl}/dashboard/billing`,
    });

    return { url: session.url };
  }

  
  async handleWebhook(payload: Buffer, sig: string): Promise<void> {
    this.ensureSaaS();

    let event;

    try {
      const webhookSecret = this.config.getEnv<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }
      
      event = this.stripe!.webhooks.constructEvent(
        payload,
        sig,
        webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await this.resetUsage(event.data.object);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  
  private async syncSubscription(sub: any) {
    const priceId = sub.items.data[0]?.price.id;
    const plan = this.mapPriceToPlan(priceId);

    await this.prisma.organization.updateMany({
      where: { stripeCustomerId: sub.customer as string },
      data: {
        plan,
        queriesLimit: this.PLAN_LIMITS[plan],
        billingPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });

    this.logger.log(`Subscription synced for customer: ${sub.customer}`);
  }

  
  private async resetUsage(invoice: any) {
    await this.prisma.organization.updateMany({
      where: { stripeCustomerId: invoice.customer as string },
      data: { queriesUsed: 0 },
    });
    this.logger.log(`Usage limits reset for invoice: ${invoice.id}`);
  }

  
  private async handleSubscriptionDeleted(sub: any) {
    await this.prisma.organization.updateMany({
      where: { stripeCustomerId: sub.customer as string },
      data: {
        plan: Plan.FREE,
        queriesLimit: this.PLAN_LIMITS.FREE,
      },
    });
  }

  
  private mapPriceToPlan(priceId: string): Plan {
    const starterId = this.config.getEnv<string>('STRIPE_STARTER_PRICE_ID');
    const businessId = this.config.getEnv<string>('STRIPE_BUSINESS_PRICE_ID');
    const enterpriseId = this.config.getEnv<string>('STRIPE_ENTERPRISE_PRICE_ID');

    if (priceId === starterId) return Plan.STARTER;
    if (priceId === businessId) return Plan.BUSINESS;
    if (priceId === enterpriseId) return Plan.ENTERPRISE;
    return Plan.FREE;
  }

  
  private ensureSaaS() {
    if (this.config.isEnterprise()) {
      throw new BadRequestException(
        'Billing operations are disabled in Enterprise/Self-hosted mode.',
      );
    }
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe service is not initialized.');
    }
  }
}