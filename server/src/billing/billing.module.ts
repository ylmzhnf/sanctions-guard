import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BillingController],
})
export class BillingModule {}
