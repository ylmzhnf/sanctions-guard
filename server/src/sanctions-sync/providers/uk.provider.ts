import { Injectable } from '@nestjs/common';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { BaseSyncProvider } from './base-sync.provider';
import { ParsedEntity } from '../interfaces/sync-provider.interface';

const UK_HMT_URL =
  'https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.xml';

@Injectable()
export class UkProvider extends BaseSyncProvider {
  readonly sourceName = ListSource.UK_HMT;

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`UK Sanctions listesi indiriliyor...`);

    const xmlData = await this.fetchXmlWithRetry(UK_HMT_URL);

    const parser = new XMLParser({ ignoreAttributes: true });
    const jsonData = parser.parse(xmlData);

    const entities: ParsedEntity[] = [];
    const designations = this.toArray(jsonData.Designations?.Designation);

    for (const item of designations) {
      const namesList = this.toArray(item.Names?.Name);
      const primaryNameObj =
        namesList.find((n: any) => n.NameType === 'Primary Name') ||
        namesList[0];

      const extractName = (n: any) => {
        return [n.Name1, n.Name2, n.Name3, n.Name4, n.Name5, n.Name6]
          .filter(Boolean)
          .join(' ')
          .trim();
      };

      const primaryName = primaryNameObj
        ? extractName(primaryNameObj)
        : 'Unknown';

      const aliases = namesList
        .filter((n: any) => n.NameType === 'Alias')
        .map((n: any) => extractName(n))
        .filter((akaName: string) => akaName && akaName !== primaryName);

      const entityType =
        item.IndividualEntityShip?.toUpperCase() === 'INDIVIDUAL'
          ? 'INDIVIDUAL'
          : 'ENTITY';

      entities.push({
        externalId: `UK-${item.UniqueID}`,
        name: primaryName,
        aliases: Array.from(new Set(aliases)),
        entityType,
        listSource: this.sourceName,
        country: item.Addresses?.Address?.AddressCountry || null,
        programs: item.RegimeName ? [item.RegimeName] : [],
        remarks: item.OtherInformation || null,
      });
    }

    this.logger.log(`UK listesinden ${entities.length} kayıt işlendi.`);
    return entities;
  }
}
