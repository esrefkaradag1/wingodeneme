import { PrismaClient } from '@prisma/client';
import { paketKategorileriSeedEt } from '../src/services/paketKategoriSeed';

const prisma = new PrismaClient();

async function main() {
  await paketKategorileriSeedEt();
  console.log('Paket kategorileri yüklendi.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
