import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const org = await prisma.organization.findFirst();
  console.log('Org:', org?.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
