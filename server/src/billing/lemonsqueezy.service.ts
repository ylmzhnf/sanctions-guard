import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class LemonSqueezyService {
  private readonly logger = new Logger(LemonSqueezyService.name);

  constructor(private prisma: PrismaService) {}

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error(
        'CRITICAL: LEMONSQUEEZY_WEBHOOK_SECRET is not defined!',
      );
      throw new BadRequestException('Webhook configuration error');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
      throw new BadRequestException('Geçersiz Webhook İmzası');
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const data = payload.data.attributes;

    const orgId = payload.meta.custom_data?.orgId;

    if (!orgId) {
      this.logger.error(
        'Ödeme alındı ama custom_data içinde orgId bulunamadı!',
      );
      return;
    }

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        await this.upgradeOrg(orgId, data);
        break;
      case 'subscription_cancelled':
      case 'subscription_expired':
        await this.downgradeOrg(orgId);
        break;
      default:
        break;
    }
  }

  private async upgradeOrg(orgId: string, data: any) {
    const planName = data.product_name.toUpperCase().includes('BUSINESS')
      ? Plan.BUSINESS
      : Plan.STARTER;
    const limit = planName === Plan.BUSINESS ? 999_999 : 500;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: planName,
        queriesLimit: limit,
        queriesUsed: 0,
        lemonCustomerId: String(data.customer_id),
        lemonSubscriptionId: String(
          data.first_subscription_item.subscription_id,
        ),
        billingPeriodEnd: new Date(data.renews_at),
      },
    });

    this.logger.log(
      `💰 Yeni Abonelik! Org: ${orgId} -> ${planName} Paketine yükseltildi.`,
    );
  }

  private async downgradeOrg(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (org?.isLifetime) return;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: Plan.FREE,
        queriesLimit: 10,
        lemonSubscriptionId: null,
      },
    });
    this.logger.log(
      `📉 Abonelik İptali: Org ${orgId} Ücretsiz pakete düşürüldü.`,
    );
  }

  async createCheckoutUrl(orgId: string, variantId: string): Promise<string> {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!apiKey) {
      this.logger.warn('LemonSqueezy API Key eksik, test linki dönülüyor.');
      return `https://app.lemonsqueezy.com/checkout/test?variant=${variantId}&custom_orgId=${orgId}`;
    }

    try {
      const response = await fetch(
        'https://api.lemonsqueezy.com/v1/checkouts',
        {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            data: {
              type: 'checkouts',
              attributes: {
                checkout_data: {
                  custom: { orgId: orgId },
                },
              },
              relationships: {
                store: { data: { type: 'stores', id: storeId } },
                variant: { data: { type: 'variants', id: variantId } },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Lemon Squeezy API responded with error');
      }

      const result = await response.json();
      return result.data.attributes.url; 
    } catch (error) {
      this.logger.error('Checkout URL oluşturulamadı', error);
      throw new BadRequestException('Ödeme altyapısına bağlanılamadı.');
    }
  }

  async getCustomerPortalUrl(orgId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org || !org.lemonCustomerId) {
      throw new BadRequestException('Geçerli bir aboneliğiniz bulunmuyor.');
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;

    try {
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/customers/${org.lemonCustomerId}`,
        {
          headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Lemon Squeezy API responded with error');
      }

      const result = await response.json();
      return result.data.attributes.urls.customer_portal; 
    } catch (error) {
      this.logger.error('Portal URL oluşturulamadı', error);
      throw new BadRequestException('Fatura portalına erişilemiyor.');
    }
  }
}
