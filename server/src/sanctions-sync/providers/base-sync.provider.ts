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
    delay = 2000,
  ): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.text();
        this.logger.warn(
          `Fetch denemesi ${i + 1} başarısız: ${response.statusText}`,
        );
      } catch (error: any) {
        this.logger.warn(
          `Fetch denemesi ${i + 1} hata verdi: ${error.message}`,
        );
      }

      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay * (i + 1)));
      }
    }
    throw new Error(
      `${retries} denemeden sonra ${url} adresinden veri çekilemedi.`,
    );
  }

  protected toArray(item: any): any[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}
