import { Module } from '@nestjs/common';
import { ModeGuard, QuotaGuard, FeatureGuard } from './mode.guard';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ModeGuard, QuotaGuard, FeatureGuard],
  exports: [ModeGuard, QuotaGuard, FeatureGuard],
})
export class ModeModule {}
