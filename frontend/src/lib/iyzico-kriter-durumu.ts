import type { SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { VARSAYILAN_SITE_ICERIK } from '@/lib/site-icerik-defaults';
import { IYZICO_WEB_KRITERLERI, type YasalSayfaAnahtar } from '@/lib/yasal-sayfalar';

export type IyzicoKriterDurum = {
  id: string;
  etiket: string;
  tamam: boolean;
  aciklama?: string;
};

function sayfaHazir(
  icerik: SiteGenelIcerik,
  anahtar: YasalSayfaAnahtar
): boolean {
  const yasal = icerik.yasalSayfalar ?? VARSAYILAN_SITE_ICERIK.yasalSayfalar;
  const s = yasal[anahtar];
  return Boolean(s?.yayinda && (s.icerikHtml?.trim().length ?? 0) > 40);
}

export function iyzicoKriterDurumlari(icerik: SiteGenelIcerik): IyzicoKriterDurum[] {
  const og =
    icerik.odemeGostergeleri ?? VARSAYILAN_SITE_ICERIK.odemeGostergeleri;

  return IYZICO_WEB_KRITERLERI.map((k) => {
    if (k.tur === 'ssl') {
      const https =
        typeof window !== 'undefined'
          ? window.location.protocol === 'https:'
          : process.env.NODE_ENV === 'production';
      return {
        id: k.id,
        etiket: k.etiket,
        tamam: https,
        aciklama: https
          ? 'HTTPS aktif'
          : 'Canlı ortamda SSL/HTTPS gerekli (localhost hariç)',
      };
    }
    if (k.tur === 'kart') {
      const tamam = og.visaGoster && og.mastercardGoster;
      return {
        id: k.id,
        etiket: k.etiket,
        tamam,
        aciklama: tamam ? 'Visa ve Mastercard gösteriliyor' : 'Her iki logo da açılmalı',
      };
    }
    if (k.tur === 'iyzico') {
      return {
        id: k.id,
        etiket: k.etiket,
        tamam: Boolean(og.iyzicoGoster && og.iyzicoLogoUrl?.trim()),
        aciklama: og.iyzicoGoster ? 'iyzico logosu etkin' : 'iyzico logosunu etkinleştirin',
      };
    }
    const tamam = sayfaHazir(icerik, k.anahtar);
    return {
      id: k.id,
      etiket: k.etiket,
      tamam,
      aciklama: tamam ? 'Yayında ve içerik dolu' : 'Site Yönetimi → Yasal & iyzico bölümünü doldurun',
    };
  });
}
