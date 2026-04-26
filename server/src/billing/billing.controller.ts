import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtGuard)
  async createCheckout(
    @GetUser('orgId') orgId: string,
    @Body('priceId') priceId: string,
  ) {
    return this.billingService.createCheckoutSession(orgId, priceId);
  }

  @Post('portal')
  @UseGuards(JwtGuard)
  async createPortal(@GetUser('orgId') orgId: string) {
    return this.billingService.createPortalSession(orgId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.billingService.handleWebhook(req.rawBody, sig);

    return { received: true };
  }
}
