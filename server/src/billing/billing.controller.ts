import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { SaasOnly } from '../mode/mode.guard';

@ApiTags('Billing & Subscription')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  
  @Post('checkout')
  @SaasOnly()
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({ 
    summary: 'Stripe Checkout oturumu oluşturur (Sadece SaaS)',
    description: 'Kullanıcıyı plan seçimine göre Stripe ödeme sayfasına yönlendirecek URL döner.'
  })
  @ApiBody({ schema: { example: { priceId: 'price_1Q...' } } })
  async createCheckout(
    @GetUser('orgId') orgId: string,
    @Body('priceId') priceId: string,
  ) {
    if (!priceId) throw new BadRequestException('Price ID is required');
    return this.billingService.createCheckoutSession(orgId, priceId);
  }

  
  @Post('portal')
  @SaasOnly()
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({ 
    summary: 'Stripe Müşteri Portalı URL oluşturur (Sadece SaaS)',
    description: 'Kullanıcının fatura ve abonelik yönetimi yapabileceği güvenli bağlantıyı döner.'
  })
  async createPortal(@GetUser('orgId') orgId: string) {
    return this.billingService.createPortalSession(orgId);
  }

  
  @Post('webhook')
  @ApiOperation({ 
    summary: 'Stripe olaylarını yakalar ve işler',
    description: 'Abonelik güncellemeleri, ödemeler ve iptaller bu endpoint üzerinden senkronize edilir.'
  })
  async handleWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') sig: string,
  ) {
    if (!sig) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    
    await this.billingService.handleWebhook(req.rawBody, sig);

    return { received: true };
  }
}