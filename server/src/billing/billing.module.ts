import { Module } from '@nestjs/common';
import { AppSumoService } from './appsumo.service';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AppSumoService, LemonSqueezyService],
  controllers: [BillingController],
})
export class BillingModule {}
