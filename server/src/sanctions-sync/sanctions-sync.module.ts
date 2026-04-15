import { Module } from '@nestjs/common';
import { SanctionsSyncService } from './sanctions-sync.service';
import { OfacProvider } from './providers/ofac.provider';

@Module({
  providers: [SanctionsSyncService, OfacProvider],
  exports: [SanctionsSyncService],
})
export class SanctionsSyncModule {}
