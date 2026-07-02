
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const uniCount = await prisma.universite.count();
  const bolumCount = await prisma.universiteBolum.count();
  console.log(`Universiteler: ${uniCount}`);
  console.log(`Bolumler: ${bolumCount}`);
  await prisma.$disconnect();
}
main();
