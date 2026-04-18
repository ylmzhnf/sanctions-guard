import { Module } from '@nestjs/common';
import { ScreeningService } from './screening.service';
import { ScreeningController } from './screening.controller';
import { AuditModule } from 'src/audit/audit.module';
import { AiExplainerModule } from 'src/ai-explainer/ai-explainer.module';

@Module({
  imports: [AuditModule, AiExplainerModule],
  controllers: [ScreeningController],
  providers: [ScreeningService],
})
export class ScreeningModule {}
