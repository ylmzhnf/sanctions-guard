import { Injectable } from '@nestjs/common';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { BaseSyncProvider } from './base-sync.provider';
import { ParsedEntity } from '../interfaces/sync-provider.interface';

const EU_SANCTIONS_URL =
  'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw';

const MIN_EXPECTED_ENTITIES = 1500;

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
      try {
        const parsed = this.parseEntity(entity);
        if (parsed) entities.push(parsed);
      } catch (error: any) {
        this.logger.warn(
          `Failed to process EU entity ${entity?.['@_logicalId']}: ${error.message}`,
        );
      }
    }

    this.logger.log(`EU listesinden ${entities.length} kayıt işlendi.`);
    this.assertMinimumEntityCount(entities, MIN_EXPECTED_ENTITIES, 'EU');

    return entities;
  }

  private parseEntity(entity: any): ParsedEntity | null {
    const logicalId = entity['@_logicalId'];
    if (!logicalId) {
      throw new Error('missing @_logicalId');
    }

    const nameAliasGroup = this.toArray(entity.nameAlias);
    let primaryName: string | null = null;
    const aliases = new Set<string>();

    for (const na of nameAliasGroup) {
      const fullName =
        `${na['@_firstName'] || ''} ${na['@_lastName'] || ''}`.trim();
      const candidateName = fullName || na['@_wholeName'] || '';
      if (!candidateName) continue;

      if (na['@_strong'] === 'true' && !primaryName) {
        primaryName = candidateName;
      } else {
        aliases.add(candidateName);
      }
    }

    if (!primaryName) {
      const fallback = Array.from(aliases)[0];
      if (fallback) {
        primaryName = fallback;
        aliases.delete(fallback);
      }
    }

    if (!primaryName) {
      throw new Error('no usable name found (no strong or fallback name)');
    }

    return {
      externalId: `EU-${logicalId}`,
      name: primaryName,
      aliases: Array.from(aliases),
      entityType:
        entity.subjectType?.['@_code'] === 'person' ? 'INDIVIDUAL' : 'ENTITY',
      listSource: this.sourceName,
      country: null,
      programs: ['EU_SANCTIONS'],
      remarks: entity.remark || null,
    };
  }
}
