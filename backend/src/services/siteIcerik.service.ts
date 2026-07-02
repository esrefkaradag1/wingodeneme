import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  SITE_ICERIK_TEK_ID,
  VARSAYILAN_SITE_ICERIK,
  type SiteGenelIcerikTip,
} from '../config/siteIcerik.varsayilan';

function derinBirlestir<T extends object>(varsayilan: T, uzerine: unknown): T {
  if (uzerine === null || uzerine === undefined) return varsayilan;
  if (typeof uzerine !== 'object') return varsayilan;
  if (Array.isArray(varsayilan)) {
    return (Array.isArray(uzerine) ? (uzerine as T) : varsayilan) as T;
  }
  const base = varsayilan as Record<string, unknown>;
  const over = uzerine as Record<string, unknown>;
  const sonuc: Record<string, unknown> = {};
  const tumAnahtarlar = new Set([...Object.keys(base), ...Object.keys(over)]);
  for (const key of tumAnahtarlar) {
    const b = base[key];
    const o = over[key];
    if (o === undefined) {
      if (b !== undefined) sonuc[key] = b;
      continue;
    }
    if (b === undefined) {
      sonuc[key] = o;
      continue;
    }
    if (Array.isArray(b)) {
      sonuc[key] = Array.isArray(o) ? o : b;
    } else if (typeof b === 'object' && b !== null && !Array.isArray(b)) {
      sonuc[key] =
        typeof o === 'object' && o !== null && !Array.isArray(o)
          ? derinBirlestir(b as object, o)
          : o;
    } else {
      sonuc[key] = o;
    }
  }
  return sonuc as T;
}

let siteIcerikCache: SiteGenelIcerikTip | null = null;
let cacheZamani = 0;
const CACHE_SURESI = 5 * 60 * 1000; // 5 dakika

export async function siteIcerikBirlestirilmisGetir(): Promise<SiteGenelIcerikTip> {
  const simdi = Date.now();
  if (siteIcerikCache && (simdi - cacheZamani < CACHE_SURESI)) {
    return siteIcerikCache;
  }

  const row = await prisma.siteGenelIcerik.findUnique({
    where: { id: SITE_ICERIK_TEK_ID },
  });
  const ham = row?.icerik;
  const birlestirilmis = derinBirlestir(
    { ...VARSAYILAN_SITE_ICERIK } as unknown as SiteGenelIcerikTip,
    ham
  );

  siteIcerikCache = birlestirilmis;
  cacheZamani = simdi;
  
  return birlestirilmis;
}

const MAX_JSON_BOYUT = 3_000_000; // 3 MB — logo/favicon base64 görselleri için arttırıldı

export async function siteIcerikKaydet(ham: unknown): Promise<void> {
  if (!ham || typeof ham !== 'object') {
    throw new Error('Geçersiz içerik');
  }
  const json = JSON.stringify(ham);
  if (json.length > MAX_JSON_BOYUT) {
    throw new Error('İçerik çok büyük');
  }
  const birlestirilmis = derinBirlestir(
    { ...VARSAYILAN_SITE_ICERIK } as unknown as SiteGenelIcerikTip,
    ham
  );
  await prisma.siteGenelIcerik.upsert({
    where: { id: SITE_ICERIK_TEK_ID },
    create: {
      id: SITE_ICERIK_TEK_ID,
      icerik: birlestirilmis as unknown as Prisma.InputJsonValue,
    },
    update: {
      icerik: birlestirilmis as unknown as Prisma.InputJsonValue,
    },
  });

  // Invalidate cache
  siteIcerikCache = null;
}
