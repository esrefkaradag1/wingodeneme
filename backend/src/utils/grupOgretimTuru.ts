import { OgretimTuru } from '@prisma/client';

const KPSS_TURLERI: OgretimTuru[] = [
  OgretimTuru.KPSS_LISANS,
  OgretimTuru.KPSS_ORTAOGRETIM,
  OgretimTuru.KPSS_ONLISANS,
];

/** KPSS üst sekmesi — tüm alt kademeler dahil */
export const KPSS_TUM_TURLER: OgretimTuru[] = [
  OgretimTuru.KPSS,
  ...KPSS_TURLERI,
];

export function ogretimTuruEsdegerleri(tur: OgretimTuru): OgretimTuru[] {
  if (tur === OgretimTuru.KPSS) return KPSS_TUM_TURLER;
  if (tur === OgretimTuru.YKS) return [OgretimTuru.YKS, OgretimTuru.SINIF_9, OgretimTuru.SINIF_10, OgretimTuru.SINIF_11];
  if (tur === OgretimTuru.LGS) return [OgretimTuru.LGS, OgretimTuru.SINIF_6, OgretimTuru.SINIF_7];
  return [tur];
}

export function ogretimTurleriniGenislet(turler: OgretimTuru[]): OgretimTuru[] {
  return [...new Set(turler.flatMap((tur) => ogretimTuruEsdegerleri(tur)))];
}

/**
 * Soru/konu listesinde ogretimTuru filtresi.
 * Üst kademeler alt sınıfları kapsar: LGS → 6/7. sınıf, YKS → 9/10/11. sınıf, KPSS → tüm alt türler.
 */
export function ogretimTuruPrismaFiltre(
  tur: OgretimTuru,
): OgretimTuru | { in: OgretimTuru[] } {
  const esdegerler = ogretimTuruEsdegerleri(tur);
  if (esdegerler.length > 1) return { in: esdegerler };
  return tur;
}

/** Öğretmenin izinli kademeleri seçilen filtreye uyuyor mu */
export function ogretimTuruIzinUyumlu(turFiltre: OgretimTuru, izinliTurler: OgretimTuru[]): boolean {
  const filtreSet = new Set(ogretimTuruEsdegerleri(turFiltre));
  const izinSet = new Set(ogretimTurleriniGenislet(izinliTurler));
  for (const tur of filtreSet) {
    if (izinSet.has(tur)) return true;
  }
  return false;
}

function adNorm(ad: string): string {
  return ad.toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
}

function kpssMetniMi(metin: string): boolean {
  const n = adNorm(metin);
  return n.includes('kpss') || metin.toLocaleLowerCase('tr-TR').includes('kamu personel');
}

function kpssAltTurTahmin(metin: string): OgretimTuru | undefined {
  const n = adNorm(metin);
  if (n.includes('onlisans') || n.includes('önlisans')) {
    return OgretimTuru.KPSS_ONLISANS;
  }
  if (n.includes('ortaogretim') || n.includes('ortaöğretim')) {
    return OgretimTuru.KPSS_ORTAOGRETIM;
  }
  if (n.includes('lisans')) {
    return OgretimTuru.KPSS_LISANS;
  }
  return undefined;
}

export function kpssOgretimTuruMu(tur?: string | null): tur is OgretimTuru {
  return Boolean(tur && KPSS_TURLERI.includes(tur as OgretimTuru));
}

/** Grup kaydındaki ad/türden konu listesi için öğretim türünü çözümler (eski «KPSS» grupları YKS etiketli olabilir). */
export function grupKonuOgretimTuru(
  g?: { ad?: string | null; tur?: string | null } | null,
  tamYol?: string | null
): OgretimTuru | undefined {
  if (!g) return undefined;
  if (kpssOgretimTuruMu(g.tur)) return g.tur;

  const yol = String(tamYol || g.ad || '').trim();
  const adStr = String(g.ad || '');

  const kpssBaglam = g.tur === OgretimTuru.KPSS || kpssMetniMi(yol) || kpssMetniMi(adStr);
  if (kpssBaglam) {
    const tahmin = kpssAltTurTahmin(yol) || kpssAltTurTahmin(adStr);
    if (tahmin) return tahmin;
    if (g.tur === OgretimTuru.KPSS) return undefined;
  }

  const tur = g.tur as OgretimTuru | undefined;
  return tur && (Object.values(OgretimTuru) as string[]).includes(tur) ? tur : undefined;
}

/** Öğretmen kademe filtresine göre grup görünürlüğü (DB tur alanı eski/yanlış olabilir). */
export function grupOgretmenFiltreyeUygun(
  g: { ad?: string | null; tur?: string | null },
  izinliTurler: OgretimTuru[] | undefined
): boolean {
  if (!izinliTurler) return true;
  const efektif = grupKonuOgretimTuru(g);
  if (efektif && izinliTurler.includes(efektif)) return true;
  const dbTur = g.tur as OgretimTuru | undefined;
  if (dbTur && izinliTurler.includes(dbTur)) return true;
  const kpssOgretmeni = izinliTurler.some((t) => kpssOgretimTuruMu(t));
  if (kpssOgretmeni && dbTur === OgretimTuru.KPSS) return true;
  return false;
}
