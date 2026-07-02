import { prisma } from '../config/database';

export const SINAV_SEPET_FIYAT_AYAR_ANAHTAR = 'SINAV_SEPET_FIYAT_KADEMELERI';

export type FiyatKademesi = {
  minAdet: number;
  indirimYuzde: number;
};

export type SinavSepetFiyatAyarlari = {
  aktif: boolean;
  tekDenemeFiyati: number;
  kademeler: FiyatKademesi[];
};

export const VARSAYILAN_SINAV_SEPET_FIYAT_AYARLARI: SinavSepetFiyatAyarlari = {
  aktif: false,
  tekDenemeFiyati: 0,
  kademeler: [],
};

function yuvarlaTl(tutar: number): number {
  return Math.round(tutar * 100) / 100;
}

function kademeSatiriniCoz(k: Record<string, unknown>): FiyatKademesi | null {
  const minAdet = Math.max(1, Math.floor(Number(k.minAdet) || 0));
  if (minAdet < 1) return null;

  if (k.indirimYuzde != null && k.indirimYuzde !== '') {
    const indirimYuzde = Math.min(100, Math.max(0, Number(k.indirimYuzde) || 0));
    if (indirimYuzde <= 0) return null;
    return { minAdet, indirimYuzde };
  }

  return null;
}

function kademeleriDogrula(kademeler: unknown[]): FiyatKademesi[] {
  const temiz = kademeler
    .map((k) => (k && typeof k === 'object' ? kademeSatiriniCoz(k as Record<string, unknown>) : null))
    .filter((k): k is FiyatKademesi => k != null);

  const benzersiz = new Map<number, FiyatKademesi>();
  for (const k of temiz) {
    benzersiz.set(k.minAdet, k);
  }

  const sirali = [...benzersiz.values()].sort((a, b) => a.minAdet - b.minAdet);

  for (let i = 1; i < sirali.length; i++) {
    if (sirali[i].indirimYuzde < sirali[i - 1].indirimYuzde) {
      throw new Error(
        `Kademe hatası: ${sirali[i].minAdet} adet için indirim (%${sirali[i].indirimYuzde}), ${sirali[i - 1].minAdet} adetten (%${sirali[i - 1].indirimYuzde}) düşük olamaz.`
      );
    }
  }

  return sirali;
}

export function sinavSepetFiyatAyarlariParse(raw: unknown): SinavSepetFiyatAyarlari {
  if (!raw || typeof raw !== 'object') return { ...VARSAYILAN_SINAV_SEPET_FIYAT_AYARLARI };
  const o = raw as Record<string, unknown>;
  return {
    aktif: o.aktif === true,
    tekDenemeFiyati: Math.max(0, Number(o.tekDenemeFiyati) || 0),
    kademeler: kademeleriDogrula(Array.isArray(o.kademeler) ? o.kademeler : []),
  };
}

export async function sinavSepetFiyatAyarlariGetir(): Promise<SinavSepetFiyatAyarlari> {
  const kayit = await prisma.sistemAyarlari.findUnique({
    where: { anahtar: SINAV_SEPET_FIYAT_AYAR_ANAHTAR },
  });
  if (!kayit?.deger) return { ...VARSAYILAN_SINAV_SEPET_FIYAT_AYARLARI };
  try {
    return sinavSepetFiyatAyarlariParse(JSON.parse(kayit.deger));
  } catch {
    return { ...VARSAYILAN_SINAV_SEPET_FIYAT_AYARLARI };
  }
}

export async function sinavSepetFiyatAyarlariKaydet(
  veri: Partial<SinavSepetFiyatAyarlari>
): Promise<SinavSepetFiyatAyarlari> {
  const mevcut = await sinavSepetFiyatAyarlariGetir();
  const kademeler =
    veri.kademeler != null ? kademeleriDogrula(veri.kademeler as unknown[]) : mevcut.kademeler;

  const birlesik: SinavSepetFiyatAyarlari = {
    aktif: veri.aktif ?? mevcut.aktif,
    tekDenemeFiyati:
      veri.tekDenemeFiyati != null ? Math.max(0, Number(veri.tekDenemeFiyati) || 0) : mevcut.tekDenemeFiyati,
    kademeler,
  };

  await prisma.sistemAyarlari.upsert({
    where: { anahtar: SINAV_SEPET_FIYAT_AYAR_ANAHTAR },
    update: { deger: JSON.stringify(birlesik) },
    create: {
      anahtar: SINAV_SEPET_FIYAT_AYAR_ANAHTAR,
      deger: JSON.stringify(birlesik),
      aciklama: 'Takvim sepeti kademeli deneme fiyatlandırması (yüzde indirim)',
    },
  });

  return birlesik;
}

export type KademeliFiyatSonuc = {
  toplam: number;
  listeToplam: number;
  indirim: number;
  kademe?: FiyatKademesi;
  kademeAktif: boolean;
};

/** Sepet adedine göre ödenecek tutarı hesaplar */
export function kademeliSepetToplamHesapla(
  adet: number,
  listeToplam: number,
  ayarlar: SinavSepetFiyatAyarlari | null | undefined
): KademeliFiyatSonuc {
  const liste = Math.max(0, listeToplam);
  if (adet <= 0) {
    return { toplam: 0, listeToplam: liste, indirim: 0, kademeAktif: false };
  }

  if (!ayarlar?.aktif) {
    return { toplam: liste, listeToplam: liste, indirim: 0, kademeAktif: false };
  }

  const kademeler = [...(ayarlar.kademeler || [])].sort((a, b) => b.minAdet - a.minAdet);
  const uygun = kademeler.find((k) => adet >= k.minAdet);

  if (uygun && uygun.indirimYuzde > 0) {
    const toplam = yuvarlaTl(liste * (1 - uygun.indirimYuzde / 100));
    return {
      toplam,
      listeToplam: liste,
      indirim: Math.max(0, yuvarlaTl(liste - toplam)),
      kademe: uygun,
      kademeAktif: true,
    };
  }

  if (ayarlar.tekDenemeFiyati > 0) {
    const toplam = yuvarlaTl(adet * ayarlar.tekDenemeFiyati);
    return {
      toplam,
      listeToplam: liste,
      indirim: Math.max(0, yuvarlaTl(liste - toplam)),
      kademeAktif: true,
    };
  }

  return { toplam: liste, listeToplam: liste, indirim: 0, kademeAktif: true };
}

/** Kademeli toplamı sınav sayısına eşit böler (son kayıt kuruş farkını alır) */
export function kademeliMiktarDagit(odenecekToplam: number, adet: number): number[] {
  if (adet <= 0) return [];
  const toplam = yuvarlaTl(odenecekToplam);
  const birim = Math.floor((toplam / adet) * 100) / 100;
  const miktarlar = Array.from({ length: adet }, () => birim);
  const fark = yuvarlaTl(toplam - birim * adet);
  if (miktarlar.length > 0) {
    miktarlar[miktarlar.length - 1] = yuvarlaTl(miktarlar[miktarlar.length - 1] + fark);
  }
  return miktarlar;
}
