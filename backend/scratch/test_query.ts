import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('Starting findMany...');
  const s1 = Date.now();
  const sorular = await prisma.soru.findMany({
    skip: 0,
    take: 20,
    include: { 
      konu: { select: { ad: true, ders: true } },
      sinav: { select: { id: true, baslik: true, grup: { select: { id: true, ad: true } } } }
    },
    orderBy: [{ olusturuldu: 'desc' }],
  });
  const e1 = Date.now();
  console.log(`findMany took ${e1 - s1}ms`);

  console.log('Starting count...');
  const s2 = Date.now();
  const toplam = await prisma.soru.count();
  const e2 = Date.now();
  console.log(`count took ${e2 - s2}ms`);

  await prisma.$disconnect();
}

test();
