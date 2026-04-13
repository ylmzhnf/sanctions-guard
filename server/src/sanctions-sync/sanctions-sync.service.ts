import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class SanctionsSyncService {
  private readonly logger = new Logger(SanctionsSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *', {
    name: 'global-sanctions-daily-sync',
    timeZone: 'UTC',
  })
  async syncAllSanctionsData() {
    this.logger.log('Starting global sanctions data synchronization...');

    const results = await Promise.allSettled([
      this.syncOfac(),
      this.syncEu(),
      this.syncUn(),
    ]);

    results.forEach((result, index) => {
      const source = ['OFAC', 'EU', 'UN'][index];
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to sync ${source} sanctions data: ${result.reason}`,
        );
      } else {
        this.logger.log(`Successfully synced ${source} sanctions data.`);
      }
    });

    this.logger.log('Global sanctions data synchronization completed.');
  }

  private async syncOfac() {
    this.logger.log('Syncing OFAC sanctions data...');
    const ofacUrl =
      'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV';

    const response = await fetch(ofacUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        accept: 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OFAC sanctions data: ${response.status}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const results: any[] = [];

    await new Promise((resolve, reject) => {
      Readable.from(buffer)
        .pipe((csv as any)({ headers: false }))
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const item of results) {
      const ofacId = item['0'];
      const ofacName = item['1'];
      const ofacType = item['2'];

      if (!ofacId || !ofacName) continue;

      await this.prisma.sanctionedEntity.upsert({
        where: { externalId: `OFAC-${ofacId}` },
        update: { name: ofacName, entityType: ofacType },
        create: {
          externalId: `OFAC-${ofacId}`,
          name: ofacName,
          listSource: 'OFAC',
          entityType: ofacType,
        },
      });
    }
  }

  private async syncEu() {
    this.logger.log('Syncing EU sanctions data...');
    const euUrl =
      'https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw';

    const response = await fetch(euUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok)
      throw new Error(`Failed to fetch EU sanctions data: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const results: any[] = [];

    await new Promise((resolve, reject) => {
      Readable.from(buffer)
        .pipe((csv as any)({ separator: ';' }))
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const item of results) {
      const euId = item['Entity_LogicalId'] || item['LogicalId'];
      const euName = item['NameAlias_WholeName'] || item['Name'];

      if (!euId || !euName) continue;

      await this.prisma.sanctionedEntity.upsert({
        where: { externalId: `EU-${euId}` },
        update: { name: euName },
        create: {
          externalId: `EU-${euId}`,
          name: euName,
          listSource: 'EU',
          entityType: 'Unknown',
        },
      });
    }
  }

  private async syncUn() {
    this.logger.log('Syncing UN sanctions data...');
    const unUrl =
      'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

    const response = await fetch(unUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok)
      throw new Error(`Failed to fetch UN sanctions data: ${response.status}`);

    const xmlData = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedData = parser.parse(xmlData);

    const individuals =
      parsedData?.CONSOLIDATED_LIST?.INDIVIDUALS?.INDIVIDUAL || [];
    const entities = parsedData?.CONSOLIDATED_LIST?.ENTITIES?.ENTITY || [];

    const allUnTargets: any[] = [].concat(individuals, entities);

    for (const item of allUnTargets) {
      const unId = item.DATAID;
      const unName =
        `${item.FIRST_NAME || ''} ${item.SECOND_NAME || ''}`.trim();
      const type = item.TYPE_OF_DOCUMENT ? 'Entity' : 'Individual';

      if (!unId || !unName) continue;

      await this.prisma.sanctionedEntity.upsert({
        where: { externalId: `UN-${unId}` },
        update: { name: unName, entityType: type },
        create: {
          externalId: `UN-${unId}`,
          name: unName,
          listSource: 'UN',
          entityType: type,
        },
      });
    }
  }
}
