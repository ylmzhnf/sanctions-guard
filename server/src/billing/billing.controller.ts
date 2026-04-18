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
  ) { }

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
}
