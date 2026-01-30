import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type OpenSanctionsEntity = {
  id: string;
  schema?: string;
  caption?: string;
  target?: boolean;
  properties?: {
    name?: string[];
    country?: string[];
    notes?: string[];
    sanctions?: {
      properties?: {
        reason?: string[];
      };
    }[];
  };
};

async function main() {
  const filePath = path.join(__dirname, '../data/sample_targets.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');

  const entities: OpenSanctionsEntity[] = JSON.parse(
    rawData,
  ) as OpenSanctionsEntity[];
  console.log(`Seeding ${entities.length} targets...`);

  for (const entity of entities) {
    if (!entity.target) continue;

    const fullName =
      entity.caption || entity.properties?.name?.[0] || 'Unknown';

    const country = entity.properties?.country?.[0] || 'Unknown';

    const notes = entity.properties?.notes?.join('');
    const sanctionReason = entity.properties?.sanctions
      ?.map((s) => s.properties?.reason?.join(', '))
      .filter(Boolean)
      .join(' |');
    const reason =
      notes && notes.trim().length > 0
        ? notes
        : sanctionReason && sanctionReason.trim().length > 0
          ? sanctionReason
          : 'No reason provided';

    await prisma.sanctionList.upsert({
      where: { externalId: entity.id },
      update: { fullName, country, reason, type: entity.schema || 'Unknown' },
      create: {
        externalId: entity.id,
        fullName,
        source: 'OpenSanctions',
        country,
        type: entity.schema || 'Unknown',
        reason,
      },
    });
  }
  console.log('Seeding completed.');
}
main()
  .catch((e) => {
    console.error('Send Error ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
