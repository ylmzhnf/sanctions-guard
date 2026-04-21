import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { AppSumoService } from './appsumo.service';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly appSumoService: AppSumoService,
    private readonly lemonSqueezyService: LemonSqueezyService,
  ) {}

  // 🎟️ APPSUMO KOD BOZDURMA
  @Post('appsumo/redeem')
  @UseGuards(JwtGuard)
  redeemAppSumoCode(
    @GetUser('orgId') orgId: string,
    @Body('code') code: string,
  ) {
    return this.appSumoService.redeemCode(orgId, code);
  }

  // 🍋 LEMON SQUEEZY WEBHOOK
  @Post('webhook/lemonsqueezy')
  async handleLemonSqueezyWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    await this.lemonSqueezyService.handleWebhook(
      req.rawBody as Buffer,
      signature,
    );
    return { received: true };
  }

  // 🛒 LEMON SQUEEZY CHECKOUT
  @Post('checkout')
  @UseGuards(JwtGuard)
  async createCheckout(
    @GetUser('orgId') orgId: string,
    @Body('priceId') priceId: string,
  ) {
    const checkoutUrl = await this.lemonSqueezyService.createCheckoutUrl(
      orgId,
      priceId,
    );
    return { success: true, url: checkoutUrl };
  }

  // 🚪 LEMON SQUEEZY PORTAL (Müşteri Fatura Paneli)
  @Post('portal')
  @UseGuards(JwtGuard)
  async getCustomerPortal(@GetUser('orgId') orgId: string) {
    const portalUrl = await this.lemonSqueezyService.getCustomerPortalUrl(orgId);
    return { success: true, url: portalUrl };
  }
}
