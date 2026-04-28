import { Logger } from '@nestjs/common';
import { ListSource } from '@prisma/client';
import {
  ParsedEntity,
  SyncProvider,
} from '../interfaces/sync-provider.interface';

export abstract class BaseSyncProvider implements SyncProvider {
  abstract readonly sourceName: ListSource;
  protected readonly logger = new Logger(this.constructor.name);

  abstract fetchAndParse(): Promise<ParsedEntity[]>;

  protected async fetchXmlWithRetry(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'SanctionsGuard-Sync-Engine/1.0' },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      } catch (error) {
        if (i === retries - 1) throw error;
        this.logger.warn(`Fetch retry ${i + 1}/${retries} for ${url}`);
        await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
      }
    }
    return '';
  }

  protected toArray<T>(item: T | T[] | undefined): T[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}
