import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { SyncProvider } from './interfaces/sync-provider.interface';

import { OfacProvider } from './providers/ofac.provider';
import { EuProvider } from './providers/eu.provider';
import { UnProvider } from './providers/un.provider';
import { UkProvider } from './providers/uk.provider';

@Injectable()
export class SanctionsSyncService implements OnModuleInit {
  private readonly logger = new Logger(SanctionsSyncService.name);
  private providers: SyncProvider[];
  private readonly LOCK_KEY = 'lock:sanctions_sync';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ofacProvider: OfacProvider,
    private readonly euProvider: EuProvider,
    private readonly unProvider: UnProvider,
    private readonly ukProvider: UkProvider,
  ) {}

  onModuleInit() {
    this.providers = [
      this.ofacProvider,
      this.euProvider,
      this.unProvider,
      this.ukProvider,
    ];
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleScheduledSync() {
    this.logger.log('Scheduled sync triggered...');
    await this.syncAll();
  }

  async syncAll(force = false) {
    const lockValue = randomUUID();
    const lockTTL = 1800;

    try {
      if (force) await this.redis.getClient().del(this.LOCK_KEY);

      const acquired = await this.redis
        .getClient()
        .set(this.LOCK_KEY, lockValue, 'EX', lockTTL, 'NX');
      if (!acquired) {
        this.logger.warn('Sync already running on another instance. Skipping.');
        return { success: false, message: 'Sync in progress' };
      }

      this.logger.log('Lock acquired. Starting global sync...');

      for (const provider of this.providers) {
        await this.runProviderSync(provider);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Global sync failed: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      await this.releaseLock(lockValue);
    }
  }

  private async runProviderSync(provider: SyncProvider) {
    const source = provider.sourceName;
    const startTime = new Date();
    const stats = { added: 0, updated: 0, removed: 0 };
    let errorMsg: string | null = null;

    try {
      const entities = await provider.fetchAndParse();
      if (!entities.length) return;

      const BATCH_SIZE = 300;
      for (let i = 0; i < entities.length; i += BATCH_SIZE) {
        const batch = entities.slice(i, i + BATCH_SIZE);

        await this.prisma.$transaction(
          batch.map((e) =>
            this.prisma.sanctionedEntity.upsert({
              where: { externalId: e.externalId },
              update: {
                ...this.mapEntity(e),
                lastSyncedAt: startTime,
                isActive: true,
              },
              create: {
                ...this.mapEntity(e),
                lastSyncedAt: startTime,
                isActive: true,
              },
            }),
          ),
        );
        stats.added += batch.length;
      }

      const deactivated = await this.prisma.sanctionedEntity.updateMany({
        where: {
          listSource: source,
          lastSyncedAt: { lt: startTime },
          isActive: true,
        },
        data: { isActive: false },
      });
      stats.removed = deactivated.count;

      this.logger.log(
        `[${source}] Sync complete. Processed: ${stats.added}, Removed: ${stats.removed}`,
      );
    } catch (err) {
      errorMsg = err.message;
      this.logger.error(`[${source}] Provider failed: ${errorMsg}`);
    }

    await this.logSync(source, stats, errorMsg);
  }

  private mapEntity(e: any) {
    let formattedReason: string | null = null;

    if (Array.isArray(e.remarks)) {
      formattedReason = e.remarks.filter(Boolean).join(' \n ');
    } else if (typeof e.remarks === 'string' && e.remarks.trim() !== '') {
      formattedReason = e.remarks.trim();
    } else if (e.remarks) {
      formattedReason = String(e.remarks);
    }
    return {
      externalId: e.externalId,
      name: e.name,
      aliases: e.aliases,
      entityType: e.entityType,
      listSource: e.listSource,
      country: Array.isArray(e.country) ? e.country.join(', ') : e.country,
      programs: e.programs,
      reason: formattedReason,
    };
  }

  private async releaseLock(value: string) {
    const script = `
      if redis.call("get",KEYS[1]) == ARGV[1] then
        return redis.call("del",KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.getClient().eval(script, 1, this.LOCK_KEY, value);
  }

  private async logSync(source: any, stats: any, error: string | null) {
    await this.prisma.listSyncLog.create({
      data: {
        source,
        status: error ? SyncStatus.FAILED : SyncStatus.SUCCESS,
        recordsAdded: stats.added,
        recordsRemoved: stats.removed,
        error,
      },
    });
  }
}
