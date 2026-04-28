import { Module } from '@nestjs/common';
import { ScreeningService } from './screening.service';
import { ScreeningController } from './screening.controller';
import { AuditModule } from 'src/audit/audit.module';
import { AiExplainerModule } from 'src/ai-explainer/ai-explainer.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { ScreeningProcessor } from './screening.processor';
import { BullModule } from '@nestjs/bullmq';
import { OsintModule } from 'src/osint/osint.module';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    AuditModule,
    AiExplainerModule,
    RedisModule,
    OsintModule,
    BullModule.registerQueue({
      name: 'bulk-screening-queue',
    }),
  ],
  controllers: [ScreeningController],
  providers: [ScreeningService, ScreeningProcessor, ReportsService],
  exports: [ScreeningService],
})
export class ScreeningModule {}
