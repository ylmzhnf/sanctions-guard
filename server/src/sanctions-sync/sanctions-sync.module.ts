import { Module } from '@nestjs/common';
import { SanctionsSyncService } from './sanctions-sync.service';
import { OfacProvider } from './providers/ofac.provider';
import { EuProvider } from './providers/eu.provider';
import { UnProvider } from './providers/un.provider';
import { UkProvider } from './providers/uk.provider';
import { SanctionSyncController } from './sanction-sync.controller';

@Module({
  controllers: [SanctionSyncController],
  providers: [
    SanctionsSyncService,
    OfacProvider,
    EuProvider,
    UnProvider,
    UkProvider,
  ],
  exports: [SanctionsSyncService],
})
export class SanctionsSyncModule {}
