import { Injectable, Logger } from '@nestjs/common';
import { ParsedEntity, SyncProvider } from '../interfaces/sync-provider.interface';
import { ListSource } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const UK_HMT_URL = 'https://ofsiconsoidatedlists.hmtreasury.gov.uk/xml/conlist.xml';

@Injectable()
export class UkProvider implements SyncProvider {
  readonly sourceName = ListSource.UK_HMT;
  private readonly logger = new Logger(UkProvider.name);

  async fetchAndParse(): Promise<ParsedEntity[]> {
    this.logger.log(`Fetching UK HMT list from ${UK_HMT_URL}`);
    try {
      const response = await fetch(UK_HMT_URL);
      if (!response.ok) throw new Error(`UK HMT fetch failed: ${response.statusText}`);

      const xmlData = await response.text();
      const parser = new XMLParser({ ignoreAttributes: true });
      const jsonData = parser.parse(xmlData);

      const entities: ParsedEntity[] = [];
      const financials = this.toArray(jsonData.ArrayOfFinancialSanctionsTarget?.FinancialSanctionsTarget);

      for (const item of financials) {
        const nameParts = [item.Name1, item.Name2, item.Name3, item.Name4, item.Name5, item.Name6].filter(Boolean);
        const name = nameParts.length > 0 ? nameParts.join(' ').trim() : 'Unknown';
        
        const entityType = item.GroupType === 'Individual' ? 'INDIVIDUAL' : 'ENTITY';
        const groupId = item.GroupID;
        
        const aliasesSet = new Set<string>();
        if (item.AliasName) aliasesSet.add(item.AliasName);

        entities.push({
          externalId: `UK-${groupId}`,
          name,
          aliases: Array.from(aliasesSet),
          entityType,
          listSource: this.sourceName,
          country: item.Nationality || item.Country || null,
          programs: item.RegimeName ? [item.RegimeName] : [],
          remarks: item.OtherInformation || null,
        });
      }

      this.logger.log(`Parsed ${entities.length} entities from UK HMT List.`);
      return entities;
    } catch (error: any) {
      this.logger.error(`UK HMT Sync Error: ${error.message}`);
      throw error;
    }
  }

  private toArray(item: any): any[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}