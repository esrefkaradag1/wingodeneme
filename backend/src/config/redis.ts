import Redis from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Redis tamamen opsiyonel.
 * Varsayılan: KAPALI. Sadece REDIS_ENABLED=true ise açılır.
 * Bu sayede lokalde Docker/Redis açmadan Supabase Postgres ile çalıştırmak mümkün olur.
 */
const redisAktif = ['true', '1', 'yes', 'on'].includes((process.env.REDIS_ENABLED || '').toLowerCase());

export const redis = redisAktif
  ? new Redis(process.env.REDIS_URL!, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : null;

if (redis) {
  redis.on('connect', () => logger.info('✅ Redis bağlantısı kuruldu'));
  redis.on('error', (err) => logger.error('❌ Redis hatası:', err));
} else {
  logger.info('ℹ️ Redis devre dışı; cache no-op modunda');
}

export const cache = {
  async al<T>(anahtar: string): Promise<T | null> {
    if (!redis) return null;
    const veri = await redis.get(anahtar);
    return veri ? JSON.parse(veri) : null;
  },

  async yaz(anahtar: string, deger: unknown, ttlSaniye = 3600): Promise<void> {
    if (!redis) return;
    await redis.setex(anahtar, ttlSaniye, JSON.stringify(deger));
  },

  async sil(anahtar: string): Promise<void> {
    if (!redis) return;
    await redis.del(anahtar);
  },

  async siliModeliyle(pattern: string): Promise<void> {
    if (!redis) return;
    let cursor = '0';
    do {
      const [sonrakiCursor, anahtarlar] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = sonrakiCursor;
      if (anahtarlar.length > 0) {
        await redis.del(...anahtarlar);
      }
    } while (cursor !== '0');
  },
};
