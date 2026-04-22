import { Injectable, Logger } from '@nestjs/common';
import {
  ParsedEntity,
  SyncProvider,
} from '../interfaces/sync-provider.interface';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const UN_CONSOLIDATED_URL =
  'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

@Injectable()
export class UnProvider implements SyncProvider {
  readonly sourceName = ListSource.UN;
  private readonly logger = new Logger(UnProvider.name);

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(
      `Fetching UN Security Council list from ${UN_CONSOLIDATED_URL}`,
    );
    try {
      const response = await fetch(UN_CONSOLIDATED_URL);
      if (!response.ok)
        throw new Error(`UN fetch failed: ${response.statusText}`);

      const xmlData = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: false,
      });
      const jsonData = parser.parse(xmlData);

      const entities: ParsedEntity[] = [];
      const consolidatedList = jsonData.CONSOLIDATED_LIST || {};

      const individuals = this.toArray(
        consolidatedList.INDIVIDUALS?.INDIVIDUAL,
      );
      for (const ind of individuals) {
        entities.push(this.parseItem(ind, 'INDIVIDUAL'));
      }

      const orgs = this.toArray(consolidatedList.ENTITIES?.ENTITY);
      for (const org of orgs) {
        entities.push(this.parseItem(org, 'ENTITY'));
      }

      this.logger.log(`Parsed ${entities.length} entities from UN List.`);
      return entities;
    } catch (error: any) {
      this.logger.error(`UN Sync Error: ${error.message}`);
      throw error;
    }
  }

  private parseItem(item: any, type: string): ParsedEntity {
    const nameParts = [
      item.FIRST_NAME,
      item.SECOND_NAME,
      item.THIRD_NAME,
    ].filter(Boolean);
    const name = nameParts.length > 0 ? nameParts.join(' ').trim() : 'Unknown';

    const aliasesSet = new Set<string>();
    const aliasList = this.toArray(item.INDIVIDUAL_ALIAS || item.ENTITY_ALIAS);
    aliasList.forEach((a) => {
      const aliasName = a.ALIAS_NAME;
      if (aliasName && aliasName !== name) aliasesSet.add(aliasName.trim());
    });

    const nationality = item.NATIONALITY?.VALUE || null;
    const programs = this.toArray(item.UN_LIST_TYPE).map((p: string) =>
      String(p).trim(),
    );

    return {
      externalId: `UN-${item.DATAID}`,
      name,
      aliases: Array.from(aliasesSet),
      entityType: type,
      listSource: this.sourceName,
      country: nationality,
      programs,
      remarks: item.COMMENTS1 || null,
    };
  }

  private toArray(item: any): any[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}
