import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OfacProvider } from './providers/ofac.provider';
import { SyncProvider } from './interfaces/sync-provider.interface';
import { Cron } from '@nestjs/schedule';
import { SyncStatus } from '@prisma/client';

@Injectable()
export class SanctionsSyncService {
  private readonly logger = new Logger(SanctionsSyncService.name);
  private providers: SyncProvider[];

  constructor(
    private prisma: PrismaService,
    private ofacProvider: OfacProvider,
  ) {
    this.providers = [this.ofacProvider];
  }

  @Cron('0 3 * * *')
  async syncAll() {
    this.logger.log('Starting sanctions data synchronization...');
    for (const provider of this.providers) {
      await this.syncProvider(provider);
    }
    this.logger.log('Sanctions data synchronization completed.');
  }

  private async syncProvider(provider: SyncProvider) {
    const source = provider.sourceName;
    let status: SyncStatus = SyncStatus.FAILED;
    let recordsAdded = 0;
    let recordsUpdated = 0;
    let recordsRemoved = 0;
    let errorMessage: string | undefined;

    const syncStartTime = new Date();

    try {
      this.logger.log(`Starting sync for ${source}...`);
      const entities = await provider.fetchAndParse();

      if (entities.length > 0) {
        const BATCH_SIZE = 500;
        for (let i = 0; i < entities.length; i += BATCH_SIZE) {
          const batch = entities.slice(i, i + BATCH_SIZE);

          const upsertPromises = batch.map(async (entity) => {
            try {
              const { remarks, ...rest } = entity;
              const result = await this.prisma.sanctionedEntity.upsert({
                where: { externalId: entity.externalId },
                update: {
                  name: entity.name,
                  aliases: entity.aliases,
                  country: entity.country,
                  programs: entity.programs,
                  reason: entity.remarks,
                  isActive: true,
                  lastSyncedAt: syncStartTime,
                },
                create: {
                  ...rest,
                  reason: entity.remarks,
                  isActive: true,
                  lastSyncedAt: syncStartTime,
                },
              });

              if (result.createdAt >= syncStartTime) {
                recordsAdded++;
              } else {
                recordsUpdated++;
              }
            } catch (err) {
              this.logger.warn(
                `Failed to upsert entity ${entity.externalId}: ${err.message}`,
              );
            }
          });

          await Promise.all(upsertPromises);
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
      status = SyncStatus.SUCCESS;
      this.logger.log(
        `Completed sync for ${source}. Added: ${recordsAdded}, Updated: ${recordsUpdated}, Removed: ${recordsRemoved}`,
      );
    } catch (error) {
      errorMessage = error.message;
      this.logger.error(
        `Error syncing [${source}] Sync failed: ${errorMessage}`,
      );
    }

    await this.prisma.listSyncLog.create({
      data: {
        source,
        status,
        recordsAdded,
        recordsUpdated,
        recordsRemoved,
        error: errorMessage,
      },
    });
  }
}
