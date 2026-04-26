import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { OfacProvider } from './providers/ofac.provider';
import { EuProvider } from './providers/eu.provider';
import { UnProvider } from './providers/un.provider';
import { UkProvider } from './providers/uk.provider';
import { SyncProvider } from './interfaces/sync-provider.interface';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class SanctionsSyncService {
  private readonly logger = new Logger(SanctionsSyncService.name);
  private readonly providers: SyncProvider[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ofacProvider: OfacProvider,
    private readonly euProvider: EuProvider,
    private readonly unProvider: UnProvider,
    private readonly ukProvider: UkProvider,
  ) {
    this.providers = [
      this.ofacProvider,
      this.euProvider,
      this.unProvider,
      this.ukProvider,
    ];
  }

  @Cron('0 3 * * *')
  async syncAll() {
    const lockKey = 'lock:sanctions_sync';
    const lockValue = randomUUID();
    const lockTTL = 60 * 60;

    try {
      const acquired = await this.redis
        .getClient()
        .set(lockKey, lockValue, 'EX', lockTTL, 'NX');

      if (!acquired) {
        this.logger.log(
          'Synchronization is already running on another instance. Skipping this execution.',
        );
        return;
      }

      this.logger.log(
        'Lock acquired. Starting global sanctions synchronization...',
      );

      for (const provider of this.providers) {
        await this.syncProvider(provider);
      }

      this.logger.log('Global synchronization completed successfully.');
    } catch (error: any) {
      this.logger.error(
        `Unexpected error during global synchronization: ${error.message}`,
      );
    } finally {
      try {
        const currentValue = await this.redis.getClient().get(lockKey);
        if (currentValue === lockValue) {
          await this.redis.getClient().del(lockKey);
          this.logger.log('Lock released successfully.');
        }
      } catch (redisError: any) {
        this.logger.error(
          `Failed to release Redis lock: ${redisError.message}`,
        );
      }
    }
  }

  private async syncProvider(provider: SyncProvider) {
    const source = provider.sourceName;
    const syncStartTime = new Date();

    let recordsAdded = 0;
    let recordsUpdated = 0;
    let recordsRemoved = 0;
    let errorMessage: string | null = null;

    try {
      this.logger.log(`[${source}] senkronizasyonu başlatılıyor...`);

      const entities = await provider.fetchAndParse();

      if (entities.length > 0) {
        const BATCH_SIZE = 500;

        for (let i = 0; i < entities.length; i += BATCH_SIZE) {
          const batch = entities.slice(i, i + BATCH_SIZE);

          try {
            const results = await this.prisma.$transaction(
              batch.map((entity) => {
                const formattedCountry = Array.isArray(entity.country)
                  ? entity.country.join(', ')
                  : entity.country || null;

                return this.prisma.sanctionedEntity.upsert({
                  where: { externalId: entity.externalId },
                  update: {
                    name: entity.name,
                    aliases: entity.aliases,
                    country: formattedCountry,
                    programs: entity.programs,
                    reason: entity.remarks,
                    isActive: true,
                    lastSyncedAt: syncStartTime,
                  },
                  create: {
                    externalId: entity.externalId,
                    name: entity.name,
                    aliases: entity.aliases,
                    entityType: entity.entityType,
                    listSource: source,
                    country: formattedCountry,
                    programs: entity.programs,
                    reason: entity.remarks,
                    isActive: true,
                    lastSyncedAt: syncStartTime,
                  },
                });
              }),
            );

            for (const result of results) {
              if (result.createdAt >= syncStartTime) {
                recordsAdded++;
              } else {
                recordsUpdated++;
              }
            }
          } catch (batchError: any) {
            this.logger.warn(
              `[${source}] Batch işleme hatası (Satır ${i}-${i + BATCH_SIZE}): ${batchError.message}`,
            );
          }
        }

        const deactivated = await this.prisma.sanctionedEntity.updateMany({
          where: {
            listSource: source,
            lastSyncedAt: { lt: syncStartTime },
            isActive: true,
          },
          data: { isActive: false },
        });

        recordsRemoved = deactivated.count;
      }

      this.logger.log(
        `[${source}] İşlem bitti. Eklenen: ${recordsAdded}, Güncellenen: ${recordsUpdated}, Pasife Çekilen: ${recordsRemoved}`,
      );
    } catch (error: any) {
      errorMessage = error.message;
      this.logger.error(`[${source}] Senkronizasyon hatası: ${errorMessage}`);
    }

    await this.prisma.listSyncLog.create({
      data: {
        source,
        status: errorMessage ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        recordsAdded,
        recordsUpdated,
        recordsRemoved,
        error: errorMessage,
      },
    });
  }
}
