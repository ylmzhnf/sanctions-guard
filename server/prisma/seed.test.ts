import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_TEST_URL) {
  throw new Error('DATABASE_TEST_URL is not defined');
}
const pool = new Pool({
  connectionString: process.env.DATABASE_TEST_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.sanctionList.createMany({
    data: [
      {
        fullName: 'Mohamed Ali',
        source: 'OpenSanctions-TEST',
        reason: 'Known alias variations',
        country: 'EG',
      },
      {
        fullName: 'Muhammad Ali',
        source: 'OpenSanctions-TEST',
        reason: 'Alternate spelling',
        country: 'PK',
      },
      {
        fullName: 'Osama Bin Laden',
        source: 'OpenSanctions-TEST',
        reason: 'Terrorism financing',
        country: 'SA',
      },
      {
        fullName: 'Usama Bin Ladin',
        source: 'OpenSanctions-TEST',
        reason: 'Alias name',
        country: 'AF',
      },
      {
        fullName: 'John Doe',
        source: 'Synthetic-TEST',
        reason: 'False positive control record',
        country: 'US',
      },
      {
        fullName: 'Jane Smith',
        source: 'Synthetic-TEST',
        reason: 'Noise data for similarity threshold testing',
        country: 'GB',
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error('Send Error ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
