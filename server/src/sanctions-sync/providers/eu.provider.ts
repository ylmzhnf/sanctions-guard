import { Injectable, Logger } from '@nestjs/common';
import {
  ParsedEntity,
  SyncProvider,
} from '../interfaces/sync-provider.interface';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const EU_SANCTIONS_URL =
  'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw';

@Injectable()
export class EuProvider implements SyncProvider {
  readonly sourceName = ListSource.EU;
  private readonly logger = new Logger(EuProvider.name);

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`Fetching EU Consolidated list from ${EU_SANCTIONS_URL}`);
    try {
      const response = await fetch(EU_SANCTIONS_URL);
      if (!response.ok)
        throw new Error(`EU fetch failed: ${response.statusText}`);

      const xmlData = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      const jsonData = parser.parse(xmlData);

      const entities: ParsedEntity[] = [];
      const sanctionEntities = this.toArray(jsonData.export?.sanctionEntity);

      for (const entity of sanctionEntities) {
        const nameAliasGroup = this.toArray(entity.nameAlias);
        let primaryName = 'Unknown';
        const aliases = new Set<string>();

        for (const na of nameAliasGroup) {
          const fullName =
            `${na['@_firstName'] || ''} ${na['@_lastName'] || ''}`.trim();
          if (na['@_strong'] === 'true' && primaryName === 'Unknown') {
            primaryName = fullName || na['@_wholeName'] || 'Unknown';
          } else {
            if (fullName) aliases.add(fullName);
          }
        }

        const logicalId = entity['@_logicalId'];
        const entityType =
          entity.subjectType?.['@_code'] === 'person' ? 'INDIVIDUAL' : 'ENTITY';
        const remarks = entity.remark || null;

        entities.push({
          externalId: `EU-${logicalId}`,
          name: primaryName,
          aliases: Array.from(aliases),
          entityType,
          listSource: this.sourceName,
          country: null, 
          programs: ['EU_SANCTIONS'],
          remarks,
        });
      }

      this.logger.log(`Parsed ${entities.length} entities from EU List.`);
      return entities;
    } catch (error: any) {
      this.logger.error(`EU Sync Error: ${error.message}`);
      throw error;
    }
  }

  private toArray(item: any): any[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}
