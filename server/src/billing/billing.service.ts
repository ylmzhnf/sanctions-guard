import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: InstanceType<typeof Stripe>;

  private readonly PLAN_LIMITS: Record<Plan, number> = {
    FREE: 10,
    STARTER: 500,
    BUSINESS: 10000,
    ENTERPRISE: 1000000,
    SELF_HOSTED: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2025-01-27.acacia' as any,
      },
    );
  }

  async createCheckoutSession(orgId: string, priceId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organization not found');

    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: org.name.toLowerCase().replace(/\s/g, '-') + '@customer.com',
        metadata: { orgId },
      });
      customerId = customer.id;
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
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
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });

    if (!org.stripeCustomerId) {
      throw new BadRequestException(
        'No active billing record found for this organization.',
      );
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${frontendUrl}/dashboard/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, sig: string): Promise<void> {
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        sig,
        this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChange(event.data.object as any);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as any);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as any);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleSubscriptionChange(sub: any) {
    const customerId = sub.customer as string;
    const priceId = sub.items.data[0]?.price.id;
    const plan = this.mapPriceToPlan(priceId);

    await this.prisma.organization.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        plan,
        queriesLimit: this.PLAN_LIMITS[plan],
        billingPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });
  }

  private async handleInvoicePaid(invoice: any) {
    const customerId = invoice.customer as string;

    await this.prisma.organization.updateMany({
      where: { stripeCustomerId: customerId },
      data: { queriesUsed: 0 },
    });

    this.logger.log(`Usage limits reset for customer: ${customerId}`);
  }

  private async handleSubscriptionDeleted(sub: any) {
    const customerId = sub.customer as string;
    await this.prisma.organization.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        plan: Plan.FREE,
        queriesLimit: this.PLAN_LIMITS.FREE,
      },
    });
  }

  private mapPriceToPlan(priceId: string): Plan {
    const starterId = this.configService.get<string>('STRIPE_STARTER_PRICE_ID');
    const businessId = this.configService.get<string>(
      'STRIPE_BUSINESS_PRICE_ID',
    );

    if (priceId === starterId) return Plan.STARTER;
    if (priceId === businessId) return Plan.BUSINESS;
    return Plan.FREE;
  }
}
