import { Injectable } from '@nestjs/common';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { BaseSyncProvider } from './base-sync.provider';
import { ParsedEntity } from '../interfaces/sync-provider.interface';

const UN_CONSOLIDATED_URL =
  'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

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
      entities.push(this.parseItem(ind, 'INDIVIDUAL'));
    }

    const orgs = this.toArray(consolidatedList.ENTITIES?.ENTITY);
    for (const org of orgs) {
      entities.push(this.parseItem(org, 'ENTITY'));
    }

    this.logger.log(`UN listesinden ${entities.length} kayıt işlendi.`);
    return entities;
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
}
