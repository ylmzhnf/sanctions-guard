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
    this.logger.log(`Downloading OFAC SDN list from ${OFAC_SDN_URL}...`);

    try {
      const xmlData = await this.fetchXmlWithRetry(OFAC_SDN_URL);
      
      if (!xmlData || xmlData.trim().length === 0) {
        throw new Error('Empty XML response received from OFAC');
      }

      const parser = new XMLParser({
        ignoreAttributes: true,
        parseTagValue: false,
        trimValues: true,
      });

      let jsonData;
      try {
        jsonData = parser.parse(xmlData);
      } catch (parseError: any) {
        this.logger.error(`XML parsing failed: ${parseError.message}`);
        throw new Error(`Failed to parse OFAC XML: ${parseError.message}`);
      }

      if (!jsonData) {
        throw new Error('Parsed JSON data is null or undefined');
      }

      const entities = this.parseXml(jsonData);

      this.logger.log(
        `Successfully parsed ${entities.length} entities from OFAC`,
      );
      return entities;
    } catch (error: any) {
      this.logger.error(`OFAC fetch and parse failed: ${error.message}`);
      throw error;
    }
  }

  private parseXml(jsonData: any): ParsedEntity[] {
    const entities: ParsedEntity[] = [];
    
    try {
      if (!jsonData?.sdnList) {
        this.logger.warn('No sdnList found in parsed JSON data');
        return entities;
      }

      const sdnList = this.toArray(jsonData.sdnList.sdnEntry);
      
      if (sdnList.length === 0) {
        this.logger.warn('No sdnEntry found in sdnList');
        return entities;
      }

      this.logger.log(`Processing ${sdnList.length} SDN entries...`);

      for (const entry of sdnList) {
        try {
          if (!entry?.uid) {
            this.logger.debug('Skipping entry without UID');
            continue;
          }

          const name =
            [entry.firstName || '', entry.lastName || '']
              .filter(Boolean)
              .join(' ')
              .trim() ||
            entry.sdnName ||
            'Unknown';

          const entityType =
            entry.sdnType === 'Individual' ? 'INDIVIDUAL' : 'ENTITY';
          
          const programs = this.toArray(entry.programList?.program)
            .map(p => typeof p === 'string' ? p : String(p))
            .filter(Boolean);

          const aliases = this.toArray(entry.akaList?.aka)
            .map((aka) => {
              if (!aka) return '';
              return [aka.firstName || '', aka.lastName || '']
                .filter(Boolean)
                .join(' ')
                .trim();
            })
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
        } catch (entryError: any) {
          this.logger.warn(`Failed to process entry ${entry?.uid}: ${entryError.message}`);
          continue;
        }
      }

      this.logger.log(`Successfully processed ${entities.length} valid entities`);
    } catch (error: any) {
      this.logger.error(`XML parsing error: ${error.message}`);
      throw new Error(`Failed to parse OFAC XML structure: ${error.message}`);
    }

    return entities;
  }
}
