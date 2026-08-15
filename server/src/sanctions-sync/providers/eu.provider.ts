import { Injectable } from '@nestjs/common';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { BaseSyncProvider } from './base-sync.provider';
import { ParsedEntity } from '../interfaces/sync-provider.interface';

const EU_SANCTIONS_URL =
  'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw';

@Injectable()
export class EuProvider extends BaseSyncProvider {
  readonly sourceName = ListSource.EU;

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`EU Consolidated listesi indiriliyor...`);

    const xmlData = await this.fetchXmlWithRetry(EU_SANCTIONS_URL);

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

      entities.push({
        externalId: `EU-${entity['@_logicalId']}`,
        name: primaryName,
        aliases: Array.from(aliases),
        entityType:
          entity.subjectType?.['@_code'] === 'person' ? 'INDIVIDUAL' : 'ENTITY',
        listSource: this.sourceName,
        country: null,
        programs: ['EU_SANCTIONS'],
        remarks: entity.remark || null,
      });
    }

    this.logger.log(`EU listesinden ${entities.length} kayıt işlendi.`);
    return entities;
  }
}
