import type { Request } from 'express';
import { prisma } from '../config/database';
import { satinAlimPaketHaklariniUygula } from '../services/paket-erisim.service';
import { fiyatYuvarla } from './fiyat';

export const IYZICO_GRUP_ONEK = 'iyzicoGrup:';

export function iyzicoGrupEtiketi(anaSiparisId: string): string {
  return `${IYZICO_GRUP_ONEK}${anaSiparisId}`;
}

/** Grup üyesi siparişten ana (iyzico) sipariş kimliğini çözer */
export function iyzicoAnaSiparisIdFromNot(notlar: string | null | undefined, fallbackId: string): string {
  if (!notlar?.includes(IYZICO_GRUP_ONEK)) return fallbackId;
  const idx = notlar.indexOf(IYZICO_GRUP_ONEK);
  const rest = notlar.slice(idx + IYZICO_GRUP_ONEK.length);
  const id = rest.split(/[\s|]/)[0]?.trim();
  return id || fallbackId;
}

type IyzicoKullanici = {
  email: string;
  telefon?: string | null;
  ogrenciProfil?: { ad: string; soyad: string; sehir?: string | null } | null;
};

export function iyzicoAdresBilgileri(uid: string, kullanici: IyzicoKullanici, req: Request) {
  const profil = kullanici.ogrenciProfil;
  const ip = req.ip && req.ip.includes(':') ? '85.31.226.21' : req.ip || '85.31.226.21';
  const adSoyad = `${profil?.ad || 'Müşteri'} ${profil?.soyad || ''}`.trim();

  return {
    buyer: {
      id: uid,
      name: profil?.ad || 'Ad belirtilmemiş',
      surname: profil?.soyad || 'Soyad belirtilmemiş',
      gsmNumber: kullanici.telefon || '+905000000000',
      email: kullanici.email,
      identityNumber: '11111111111',
      registrationAddress: profil?.sehir || 'Adres belirtilmemiş',
      ip,
      city: profil?.sehir || 'Istanbul',
      country: 'Turkey',
    },
    shippingAddress: {
      contactName: adSoyad,
      city: profil?.sehir || 'Istanbul',
      country: 'Turkey',
      address: profil?.sehir || 'Adres belirtilmemiş',
    },
    billingAddress: {
      contactName: adSoyad,
      city: profil?.sehir || 'Istanbul',
      country: 'Turkey',
      address: profil?.sehir || 'Adres belirtilmemiş',
    },
  };
}

/** Iyzico'ya gönderilecek tutar formatı (2 ondalık, nokta ayraç) */
export function iyzicoTutarStr(tutar: number): string {
  return fiyatYuvarla(tutar).toFixed(2);
}

export type IyzicoSepetKalem = {
  id: string;
  name: string;
  /** Ödenecek tutar (kalem başına) */
  tutar: number;
};

/**
 * Çoklu sepet kalemleri için iyzico price/paidPrice/basketItems üretir.
 * Kırılım toplamı ile ana tutarın birebir eşleşmesini garanti eder (hata 5062 önlenir).
 */
export function iyzicoCokluSepetOlustur(kalemler: IyzicoSepetKalem[]): {
  price: string;
  paidPrice: string;
  basketItems: Array<{ id: string; name: string; category1: string; itemType: string; price: string }>;
} {
  const tutarlar = kalemler.map((k) => fiyatYuvarla(k.tutar));
  let toplam = fiyatYuvarla(tutarlar.reduce((a, b) => a + b, 0));
  const fark = fiyatYuvarla(toplam - tutarlar.reduce((a, b) => a + b, 0));
  if (tutarlar.length > 0 && fark !== 0) {
    tutarlar[tutarlar.length - 1] = fiyatYuvarla(tutarlar[tutarlar.length - 1] + fark);
    toplam = fiyatYuvarla(tutarlar.reduce((a, b) => a + b, 0));
  }

  const basketItems = kalemler.map((k, i) => ({
    id: k.id,
    name: k.name,
    category1: 'Eğitim',
    itemType: 'VIRTUAL',
    price: iyzicoTutarStr(tutarlar[i]),
  }));

  const toplamStr = iyzicoTutarStr(toplam);
  return {
    price: toplamStr,
    paidPrice: toplamStr,
    basketItems,
  };
}

export async function iyzicoBekleyenGrupSiparisleri(anaSiparisId: string) {
  const etiket = iyzicoGrupEtiketi(anaSiparisId);
  return prisma.satinAlim.findMany({
    where: {
      durum: 'BEKLEMEDE',
      OR: [{ id: anaSiparisId }, { notlar: { contains: etiket } }],
    },
    include: { paket: true, sinav: true, kullanici: { include: { ogrenciProfil: true, veliProfil: true, adminProfil: true } } },
  });
}

export async function iyzicoGrupSiparisleriniTamamla(anaSiparisId: string) {
  const siparisler = await iyzicoBekleyenGrupSiparisleri(anaSiparisId);
  for (const siparis of siparisler) {
    await prisma.satinAlim.update({
      where: { id: siparis.id },
      data: { durum: 'TAMAMLANDI', odemeZamani: new Date() },
    });
    await satinAlimPaketHaklariniUygula(siparis.id);
  }
  return siparisler;
}

export async function iyzicoGrupSiparisleriniIptal(anaSiparisId: string, hataMesaji: string) {
  const etiket = iyzicoGrupEtiketi(anaSiparisId);
  const siparisler = await prisma.satinAlim.findMany({
    where: {
      durum: 'BEKLEMEDE',
      OR: [{ id: anaSiparisId }, { notlar: { contains: etiket } }],
    },
  });

  for (const siparis of siparisler) {
    const mevcutNot = siparis.notlar?.trim() || '';
    await prisma.satinAlim.update({
      where: { id: siparis.id },
      data: {
        durum: 'IPTAL_EDILDI',
        notlar: mevcutNot ? `${mevcutNot} | Hata: ${hataMesaji}` : `Hata: ${hataMesaji}`,
      },
    });
  }
}
