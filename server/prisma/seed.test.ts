import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_TEST_URL is not defined');
}
async function main() {
  await prisma.sanctionedEntity.deleteMany();
  await prisma.sanctionedEntity.createMany({
    data: [
      {
        externalId: 'TEST-1',
        name: 'Mohamed Ali',
        listSource: 'OTHER',
        entityType: 'Individual',
        reason: 'Known alias variations',
        country: 'EG',
      },
      {
        externalId: 'TEST-2',
        name: 'Muhammad Ali',
        listSource: 'OTHER',
        entityType: 'Individual',
        reason: 'Alternate spelling',
        country: 'PK',
      },
      {
        externalId: 'TEST-3',
        name: 'Osama Bin Laden',
        listSource: 'OTHER',
        entityType: 'Individual',
        reason: 'Terrorism financing',
        country: 'SA',
      },
      {
        externalId: 'TEST-3',
        name: 'Usama Bin Ladin',
        listSource: 'OTHER',
        entityType: 'Individual',
        reason: 'Alias name',
        country: 'AF',
      },
      {
        externalId: 'TEST-5',
        name: 'John Doe',
        listSource: 'OTHER',
        entityType: 'Individual',
        reason: 'False positive control record',
        country: 'US',
      },
      {
        externalId: 'TEST-6',
        name: 'Jane Smith',
        listSource: 'OTHER',
        entityType: 'Individual',
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
