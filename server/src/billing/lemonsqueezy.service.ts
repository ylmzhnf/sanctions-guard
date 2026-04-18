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
      this.logger.error('CRITICAL: LEMONSQUEEZY_WEBHOOK_SECRET is not defined!');
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
}
