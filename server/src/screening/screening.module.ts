import { Module } from '@nestjs/common';
import { ScreeningService } from './screening.service';
import { ScreeningController } from './screening.controller';
import { AuditModule } from 'src/audit/audit.module';
import { AiExplainerModule } from 'src/ai-explainer/ai-explainer.module';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
  imports: [AuditModule, AiExplainerModule, RedisModule],
  controllers: [ScreeningController],
  providers: [ScreeningService],
})
export class ScreeningModule {}
