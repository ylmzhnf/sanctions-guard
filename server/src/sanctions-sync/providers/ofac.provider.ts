import { Injectable, Logger } from '@nestjs/common';
import {
  ParsedEntity,
  SyncProvider,
} from '../interfaces/sync-provider.interface';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const OFAC_SDN_URL = 'https://www.treasury.gov/ofac/downloads/sdn.xml';

@Injectable()
export class OfacProvider implements SyncProvider {
  readonly sourceName = ListSource.OFAC;
  private readonly logger = new Logger(OfacProvider.name);

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`Fetching data from OFAC SDN list at ${OFAC_SDN_URL}`);
    try {
      this.logger.log('OFAC SDN list is downloading...');
      const response = await this.fetchWithRetry(OFAC_SDN_URL);

      const xmlData = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: true,
        parseTagValue: false,
      });
      this.logger.log('Parsing OFAC SDN list XML data...');
      const jsonData = parser.parse(xmlData);
      const entities = this.parseXml(jsonData);
      this.logger.log(
        `Successfully parsed ${entities.length} entities from OFAC SDN list`,
      );
      return entities;
    } catch (error) {
      this.logger.error(
        `Error fetching or parsing OFAC SDN list: ${error.message}`,
      );
      throw error;
    }
  }

  private async fetchWithRetry(
    url: string,
    retries = 3,
    delay = 2000,
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;
        this.logger.warn(
          `Fetch attempt ${i + 1} failed: ${response.statusText}`,
        );
      } catch (error) {
        this.logger.warn(`Fetch attempt ${i + 1} errored: ${error.message}`);
      }
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay * (i + 1)));
      }
    }
    throw new Error(`Failed to fetch OFAC SDN list after ${retries} attempts`);
  }

  private parseXml(jsonData: any): ParsedEntity[] {
    const entities: ParsedEntity[] = [];

    const toArray = (item: any) => {
      if (!item) return [];
      return Array.isArray(item) ? item : [item];
    };

    try {
      const sdnList = toArray(jsonData?.sdnList?.sdnEntry);

      for (const entry of sdnList) {
        if (!entry) continue;
        const uid = entry.uid;
        if (!uid) continue;

        const firstName = entry.firstName || '';
        const lastName = entry.lastName || '';
        const name =
          [firstName, lastName].filter(Boolean).join(' ').trim() ||
          entry.sdnName ||
          'Unknown';

        const sdnType = entry.sdnType || 'ENTITY';
        const entityType =
          sdnType === 'Individual' ? 'INDIVIDUAL' : sdnType.toUpperCase();

        const programs = toArray(entry.programList?.program).map((p: any) =>
          String(p).trim(),
        );

        const aliasesSet = new Set<string>();
        const akas = toArray(entry.akaList?.aka);
        for (const aka of akas) {
          if (!aka) continue;
          const akaName = [aka.firstName || '', aka.lastName || '']
            .filter(Boolean)
            .join(' ')
            .trim();
          if (akaName && akaName !== name) {
            aliasesSet.add(akaName);
          }
        }
        const aliases = Array.from(aliasesSet);

        const nationalities = toArray(entry.nationalityList?.nationality);
        const placesOfBirth = toArray(entry.placeOfBirthList?.placeOfBirth);
        const country =
          nationalities[0]?.country || placesOfBirth[0]?.country || null;

        const remarks = entry.remarks || null;

        entities.push({
          externalId: `OFAC-SDN-${uid}`,
          name,
          aliases,
          entityType,
          listSource: this.sourceName,
          country,
          programs,
          remarks,
        });
      }
    } catch (error) {
      this.logger.error(`Error parsing OFAC SDN XML data: ${error.message}`);
    }
    return entities;
  }
}
