import { Injectable } from '@nestjs/common';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { BaseSyncProvider } from './base-sync.provider';
import { ParsedEntity } from '../interfaces/sync-provider.interface';

const OFAC_SDN_URL = 'https://www.treasury.gov/ofac/downloads/sdn.xml';

@Injectable()
export class OfacProvider extends BaseSyncProvider {
  readonly sourceName = ListSource.OFAC;

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`Downloading OFAC SDN list...`);

    const xmlData = await this.fetchXmlWithRetry(OFAC_SDN_URL);

    const parser = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: false,
    });

    const jsonData = parser.parse(xmlData);
    const entities = this.parseXml(jsonData);

    this.logger.log(
      `Successfully parsed ${entities.length} entities from OFAC`,
    );
    return entities;
  }

  private parseXml(jsonData: any): ParsedEntity[] {
    const entities: ParsedEntity[] = [];
    const sdnList = this.toArray(jsonData?.sdnList?.sdnEntry);

    for (const entry of sdnList) {
      if (!entry?.uid) continue;

      const name =
        [entry.firstName || '', entry.lastName || '']
          .filter(Boolean)
          .join(' ')
          .trim() ||
        entry.sdnName ||
        'Unknown';

      const entityType =
        entry.sdnType === 'Individual' ? 'INDIVIDUAL' : 'ENTITY';
      const programs = this.toArray(entry.programList?.program).map(String);

      const aliases = this.toArray(entry.akaList?.aka)
        .map((aka) =>
          [aka.firstName || '', aka.lastName || '']
            .filter(Boolean)
            .join(' ')
            .trim(),
        )
        .filter((akaName) => akaName && akaName !== name);

      const country =
        this.toArray(entry.nationalityList?.nationality)[0]?.country ||
        this.toArray(entry.placeOfBirthList?.placeOfBirth)[0]?.country ||
        null;

      entities.push({
        externalId: `OFAC-SDN-${entry.uid}`,
        name,
        aliases: Array.from(new Set(aliases)),
        entityType,
        listSource: this.sourceName,
        country,
        programs,
        remarks: entry.remarks || null,
      });
    }

    return entities;
  }
}
