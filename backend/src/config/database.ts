import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSession?: PrismaClient;
};

function prismaLogLevels(): ('query' | 'info' | 'warn' | 'error')[] {
  const wantsQueries = String(process.env.PRISMA_LOG_QUERIES || '').toLowerCase() === 'true';
  if (wantsQueries) return ['query', 'warn', 'error'];
  return ['warn', 'error'];
}

/**
 * Supabase pooler + Vercel: connection_limit=1 tek eşzamanlı sorguda kolayca
 * «Timed out fetching a new connection» üretir (giriş + site-icerik paralel).
 * Varsayılan 5; PRISMA_CONNECTION_LIMIT ile override.
 */
function prismaUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const envLimit = process.env.PRISMA_CONNECTION_LIMIT;
    const mevcutLimit = u.searchParams.get('connection_limit');
    if (envLimit) {
      u.searchParams.set('connection_limit', envLimit);
    } else if (!mevcutLimit || mevcutLimit === '1') {
      u.searchParams.set('connection_limit', '5');
    }

    const envTimeout = process.env.PRISMA_POOL_TIMEOUT;
    const mevcutTimeout = u.searchParams.get('pool_timeout');
    if (envTimeout) {
      u.searchParams.set('pool_timeout', envTimeout);
    } else if (!mevcutTimeout || Number(mevcutTimeout) < 60) {
      u.searchParams.set('pool_timeout', '60');
    }

    // Transaction pooler (6543) için Prisma önerisi
    if (u.port === '6543' && !u.searchParams.has('pgbouncer')) {
      u.searchParams.set('pgbouncer', 'true');
    }
    return u.toString();
  } catch {
    return raw;
  }
}

function createPrisma(url?: string): PrismaClient {
  const resolved = prismaUrl(url || process.env.DATABASE_URL);
  return new PrismaClient({
    log: prismaLogLevels(),
    ...(resolved ? { datasources: { db: { url: resolved } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

// Production (Vercel) dahil tekil tut — aksi halde her warm isolate ekstra bağlantı açar
globalForPrisma.prisma = prisma;

function ayniVeritabaniMi(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.hostname === ub.hostname && ua.port === ub.port && ua.pathname === ub.pathname;
  } catch {
    return a === b;
  }
}

/**
 * Interactive $transaction için session/direct URL.
 * DATABASE_URL ile aynıysa ikinci client AÇMA (pool’u ikiye katlamasın).
 */
function sessionPrismaClient(): PrismaClient {
  const direct = process.env.DIRECT_URL;
  const primary = process.env.DATABASE_URL;
  if (!direct || ayniVeritabaniMi(direct, primary)) {
    return prisma;
  }
  if (!globalForPrisma.prismaSession) {
    globalForPrisma.prismaSession = createPrisma(direct);
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

/** Pool timeout (P2024) için kısa yeniden deneme — giriş gibi kritik yollar */
export async function prismaPoolRetry<T>(fn: () => Promise<T>, deneme = 3): Promise<T> {
  let sonHata: unknown;
  for (let i = 0; i < deneme; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      sonHata = e;
      const kod =
        e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
      const mesaj = e instanceof Error ? e.message : String(e);
      const poolMu =
        kod === 'P2024' ||
        mesaj.includes('Timed out fetching a new connection') ||
        mesaj.includes('connection pool');
      if (!poolMu || i === deneme - 1) throw e;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw sonHata;
}

/** Geliştirme süreçleri kapanırken bağlantıları bırak */
export async function prismaKapat(): Promise<void> {
  try {
    await prisma.$disconnect();
    if (globalForPrisma.prismaSession) {
      await globalForPrisma.prismaSession.$disconnect();
    }
  } catch {
    /* ignore */
  }
}

if (typeof process !== 'undefined') {
  const kapat = () => {
    void prismaKapat();
  };
  process.once('beforeExit', kapat);
  process.once('SIGINT', kapat);
  process.once('SIGTERM', kapat);
}
