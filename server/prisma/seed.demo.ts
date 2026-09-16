import 'dotenv/config';
import { PrismaClient, ListSource, SanctionedEntity } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_ENTITIES = [
  {
    externalId: 'DEMO-ENTITY-1',
    name: 'Viktor A. Bout',
    aliases: ['Viktor Anatoliyevich Bout', 'The Merchant of Death'],
    entityType: 'INDIVIDUAL',
    country: 'RU',
    programs: ['SDGT'],
    reason: 'Sample record: arms trafficking sanctions designation.',
  },
  {
    externalId: 'DEMO-ENTITY-2',
    name: 'Northwind Trading Corp',
    aliases: ['Northwind Trade Corporation'],
    entityType: 'ENTITY',
    country: 'IR',
    programs: ['IRAN'],
    reason: 'Sample record: front company for sanctions evasion.',
  },
  {
    externalId: 'DEMO-ENTITY-3',
    name: 'Mikhail Ivanovich Petrov',
    aliases: ['M. I. Petrov'],
    entityType: 'INDIVIDUAL',
    country: 'RU',
    programs: ['UKRAINE-EO13662'],
    reason: 'Sample record: illustrative sanctions designation.',
  },
] as const;

async function main() {
  console.log('Seeding demo sanctioned entities...');

  const entities: SanctionedEntity[] = [];
  for (const e of DEMO_ENTITIES) {
    const entity = await prisma.sanctionedEntity.upsert({
      where: { externalId: e.externalId },
      update: {
        name: e.name,
        aliases: [...e.aliases],
        entityType: e.entityType,
        country: e.country,
        programs: [...e.programs],
        reason: e.reason,
        listSource: ListSource.OTHER,
        isActive: true,
      },
      create: {
        externalId: e.externalId,
        name: e.name,
        aliases: [...e.aliases],
        entityType: e.entityType,
        country: e.country,
        programs: [...e.programs],
        reason: e.reason,
        listSource: ListSource.OTHER,
        isActive: true,
      },
    });
    entities.push(entity);
  }

  console.log(`Demo sanctioned entities ready (${entities.length}):`);
  for (const entity of entities) {
    console.log(` - ${entity.name}`);
  }
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
