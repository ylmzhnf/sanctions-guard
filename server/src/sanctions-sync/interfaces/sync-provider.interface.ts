import { ListSource } from '@prisma/client';

export interface ParsedEntity {
  externalId: string;
  name: string;
  aliases: string[];
  entityType: string;
  country: string | null;
  programs: string[];
  remarks: string | null;
  listSource: ListSource;
}

export interface SyncProvider {
  sourceName: ListSource;
  fetchAndParse(): Promise<ParsedEntity[]>;
}
