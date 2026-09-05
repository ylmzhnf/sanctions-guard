import { Injectable } from '@nestjs/common';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { BaseSyncProvider } from './base-sync.provider';
import { ParsedEntity } from '../interfaces/sync-provider.interface';

const UN_CONSOLIDATED_URL =
  'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

const MIN_EXPECTED_ENTITIES = 500;
@Injectable()
export class UnProvider extends BaseSyncProvider {
  readonly sourceName = ListSource.UN;

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`UN Security Council listesi indiriliyor...`);

    const xmlData = await this.fetchXmlWithRetry(UN_CONSOLIDATED_URL);

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
    });
    const jsonData = parser.parse(xmlData);

    const entities: ParsedEntity[] = [];
    const consolidatedList = jsonData.CONSOLIDATED_LIST || {};

    const individuals = this.toArray(consolidatedList.INDIVIDUALS?.INDIVIDUAL);
    for (const ind of individuals) {
      const parsed = this.safeParseItem(ind, 'INDIVIDUAL');
      if (parsed) entities.push(parsed);
    }

    const orgs = this.toArray(consolidatedList.ENTITIES?.ENTITY);
    for (const org of orgs) {
      const parsed = this.safeParseItem(org, 'ENTITY');
      if (parsed) entities.push(parsed);
    }

    this.logger.log(`UN listesinden ${entities.length} kayıt işlendi.`);
    this.assertMinimumEntityCount(entities, MIN_EXPECTED_ENTITIES, 'UN');

    return entities;
  }

  private safeParseItem(item: any, type: string): ParsedEntity | null {
    try {
      return this.parseItem(item, type);
    } catch (error: any) {
      this.logger.warn(
        `Failed to process UN ${type} entry ${item?.DATAID}: ${error.message}`,
      );
      return null;
    }
  }

  private parseItem(item: any, type: string): ParsedEntity {
    if (!item.DATAID) {
      throw new Error('missing DATAID');
    }

    const nameParts = [
      item.FIRST_NAME,
      item.SECOND_NAME,
      item.THIRD_NAME,
      item.FOURTH_NAME,
    ].filter(Boolean);
    const name = nameParts.join(' ').trim();

    if (!name) {
      throw new Error('no usable name found');
    }

    const aliasesSet = new Set<string>();
    const aliasList = this.toArray(item.INDIVIDUAL_ALIAS || item.ENTITY_ALIAS);
    aliasList.forEach((a) => {
      const aliasName = a?.ALIAS_NAME;
      if (aliasName && aliasName !== name) aliasesSet.add(aliasName.trim());
    });

    const nationalities = this.toArray(item.NATIONALITY)
      .map((n: any) => n?.VALUE)
      .filter(Boolean);
    const nationality =
      nationalities.length > 0 ? nationalities.join(', ') : null;

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
}
