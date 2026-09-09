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

  protected async fetchXmlWithRetry(
    url: string,
    retries = 3,
    timeoutMs = 30_000,
  ): Promise<string> {
    let lastError: any = null;

    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'SanctionsGuard-Sync-Engine/1.0' },
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response body received');
        }

        return text;
      } catch (error: any) {
        lastError =
          error?.name === 'AbortError'
            ? new Error(`Request timed out after ${timeoutMs}ms`)
            : error;

        if (i === retries - 1) {
          this.logger.error(
            `Fetch failed permanently for ${url}: ${lastError.message}`,
          );
          throw lastError;
        }
        this.logger.warn(
          `Fetch retry ${i + 1}/${retries} for ${url} (${lastError.message})`,
        );
        await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
      } finally {
        clearTimeout(timeoutHandle);
      }
    }

    throw (
      lastError ?? new Error(`Failed to fetch ${url} after ${retries} retries`)
    );
  }

  protected toArray<T>(item: T | T[] | undefined | null): T[] {
    if (item === undefined || item === null) return [];
    return Array.isArray(item) ? item : [item];
  }

  protected assertMinimumEntityCount(
    entities: unknown[],
    minExpected: number,
    sourceLabel: string,
  ): void {
    if (entities.length < minExpected) {
      const message =
        `${sourceLabel} sync produced only ${entities.length} entities ` +
        `(expected at least ${minExpected}). This likely indicates a broken ` +
        `parser or a changed upstream XML schema — refusing to treat this as ` +
        `a valid full list.`;
      this.logger.error(message);
      throw new Error(message);
    }
  }
}
