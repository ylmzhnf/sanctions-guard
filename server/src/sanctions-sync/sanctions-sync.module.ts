import { Module } from '@nestjs/common';
import { SanctionsSyncService } from './sanctions-sync.service';

@Module({
  providers: [SanctionsSyncService],
})
export class SanctionsSyncModule {}
