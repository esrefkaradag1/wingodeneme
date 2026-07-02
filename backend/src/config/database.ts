import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  prismaSession?: PrismaClient;
};

function prismaLogLevels(): ('query' | 'info' | 'warn' | 'error')[] {
  // Query logları dev ortamda ciddi I/O yükü ve yavaşlama yapabiliyor.
  // İhtiyaç halinde PRISMA_LOG_QUERIES=true ile açılabilir.
  const wantsQueries = String(process.env.PRISMA_LOG_QUERIES || '').toLowerCase() === 'true';
  if (wantsQueries) return ['query', 'warn', 'error'];
  return ['warn', 'error'];
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: prismaLogLevels(),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Supabase transaction pooler (6543) interactive $transaction desteklemez; session/direct URL kullan. */
function sessionPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaSession) {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    globalForPrisma.prismaSession = new PrismaClient({
      datasources: { db: { url } },
      log: prismaLogLevels(),
    });
  }
  return globalForPrisma.prismaSession;
}

export async function prismaInteraktifTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return sessionPrismaClient().$transaction(fn, {
    maxWait: options?.maxWait ?? 10_000,
    timeout: options?.timeout ?? 20_000,
  });
}

export async function baglantiKontrol(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL bağlantısı kuruldu');
  } catch (error) {
    logger.error('❌ PostgreSQL bağlantı hatası:', error);
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
      throw error;
    }
    process.exit(1);
  }
}
