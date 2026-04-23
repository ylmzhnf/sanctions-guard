import { Injectable, Logger } from '@nestjs/common';
import { ParsedEntity, SyncProvider } from '../interfaces/sync-provider.interface';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const UK_HMT_URL = 'https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.xml';

@Injectable()
export class UkProvider implements SyncProvider {
  readonly sourceName = ListSource.UK_HMT;
  private readonly logger = new Logger(UkProvider.name);

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`Fetching UK Sanctions List from ${UK_HMT_URL}`);
    try {
      const response = await fetch(UK_HMT_URL);
      if (!response.ok)
        throw new Error(`UK Sanctions List fetch failed: ${response.statusText}`);

      const xmlData = await response.text();
      const parser = new XMLParser({ ignoreAttributes: true });
      const jsonData = parser.parse(xmlData);

      const entities: ParsedEntity[] = [];
      const designations = this.toArray(jsonData.Designations?.Designation);

      for (const item of designations) {
        const namesList = this.toArray(item.Names?.Name);
        const primaryNameObj = namesList.find((n: any) => n.NameType === 'Primary Name') || namesList[0];
        
        // Extract names from Name1 to Name6
        const extractName = (n: any) => {
          return [n.Name1, n.Name2, n.Name3, n.Name4, n.Name5, n.Name6]
            .filter(Boolean)
            .join(' ')
            .trim();
        };

        const primaryName = primaryNameObj ? extractName(primaryNameObj) : 'Unknown';
        
        const aliases = namesList
          .filter((n: any) => n.NameType === 'Alias')
          .map((n: any) => extractName(n))
          .filter(Boolean);

        const entityType = item.IndividualEntityShip?.toUpperCase() === 'INDIVIDUAL' 
          ? 'INDIVIDUAL' 
          : 'ENTITY';

        entities.push({
          externalId: `UK-${item.UniqueID}`,
          name: primaryName,
          aliases,
          entityType,
          listSource: this.sourceName,
          country: item.Addresses?.Address?.AddressCountry || null,
          programs: item.RegimeName ? [item.RegimeName] : [],
          remarks: item.OtherInformation || null,
        });
      }

      this.logger.log(`Parsed ${entities.length} entities from UK Sanctions List.`);
      return entities;
    } catch (error: any) {
      this.logger.error(`UK Sanctions List Sync Error: ${error.message}`);
      throw error;
    }
  }

  private toArray(item: any): any[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}