import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('--- Database Latency Test ---');
  const start = Date.now();
  try {
    await prisma.$connect();
    const connectTime = Date.now() - start;
    console.log(`Connection established in: ${connectTime}ms`);

    const qStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - qStart;
    console.log(`Simple query (SELECT 1) took: ${queryTime}ms`);

    const pStart = Date.now();
    const count = await prisma.paket.count();
    const pTime = Date.now() - pStart;
    console.log(`Paket count query took: ${pTime}ms (Count: ${count})`);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
