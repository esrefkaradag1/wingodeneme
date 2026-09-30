import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoPushMesaj = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
};

function expoTokenMu(token: string | null | undefined): token is string {
  if (!token) return false;
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

async function expoPushGonder(mesajlar: ExpoPushMesaj[]): Promise<void> {
  if (mesajlar.length === 0) return;

  const parcaBoyutu = 100;
  for (let i = 0; i < mesajlar.length; i += parcaBoyutu) {
    const parca = mesajlar.slice(i, i + parcaBoyutu);
    try {
      const yanit = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parca),
      });

      if (!yanit.ok) {
        const metin = await yanit.text().catch(() => '');
        logger.warn(`Expo Push HTTP ${yanit.status}: ${metin.slice(0, 200)}`);
        continue;
      }

      const json = (await yanit.json()) as {
        data?: Array<{ status?: string; message?: string; details?: { error?: string } }>;
      };
      const gecersiz: string[] = [];
      for (let j = 0; j < (json.data?.length || 0); j++) {
        const ticket = json.data![j];
        if (ticket?.status === 'error') {
          const err = ticket.details?.error || ticket.message || '';
          if (err === 'DeviceNotRegistered' || String(err).includes('not a registered')) {
            gecersiz.push(parca[j].to);
          } else {
            logger.warn(`Expo Push ticket hata: ${err}`);
          }
        }
      }
      if (gecersiz.length) {
        await prisma.kullanici.updateMany({
          where: { fcmToken: { in: gecersiz } },
          data: { fcmToken: null },
        });
      }
    } catch (err) {
      logger.warn('Expo Push gönderilemedi:', err);
    }
  }
}

/** Tek kullanıcıya push (fcmToken alanında Expo Push Token saklanır) */
export async function kullaniciyaPushGonder(opts: {
  kullaniciId: string;
  baslik: string;
  mesaj: string;
  veri?: Record<string, unknown>;
}): Promise<void> {
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: opts.kullaniciId },
    select: { fcmToken: true },
  });
  if (!expoTokenMu(kullanici?.fcmToken)) return;

  await expoPushGonder([
    {
      to: kullanici!.fcmToken!,
      title: opts.baslik,
      body: opts.mesaj,
      data: opts.veri,
      sound: 'default',
      channelId: 'default',
    },
  ]);
}

/** Toplu push — duyuru gibi senaryolar */
export async function kullanicilaraPushGonder(opts: {
  kullaniciIdleri: string[];
  baslik: string;
  mesaj: string;
  veri?: Record<string, unknown>;
}): Promise<void> {
  if (opts.kullaniciIdleri.length === 0) return;

  const kullanicilar = await prisma.kullanici.findMany({
    where: {
      id: { in: opts.kullaniciIdleri },
      fcmToken: { not: null },
    },
    select: { id: true, fcmToken: true },
  });

  const mesajlar: ExpoPushMesaj[] = [];
  for (const k of kullanicilar) {
    if (!expoTokenMu(k.fcmToken)) continue;
    mesajlar.push({
      to: k.fcmToken!,
      title: opts.baslik,
      body: opts.mesaj,
      data: opts.veri,
      sound: 'default',
      channelId: 'default',
    });
  }

  await expoPushGonder(mesajlar);
}
