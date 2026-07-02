import type { SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { VARSAYILAN_SITE_ICERIK } from '@/lib/site-icerik-defaults';
import {
  YASAL_SAYFA_ETIKET,
  YASAL_SAYFA_YOLLAR,
  type YasalSayfaAnahtar,
} from '@/lib/yasal-sayfalar';

export type FooterLinkGrup = {
  baslik: string;
  linkler: { href: string; label: string }[];
};

const SOZLESME_BASLIK_ANAHTARLARI = ['yasal', 'sözleşme', 'sozlesme'];

function grupSozlesmeMi(baslik: string): boolean {
  const b = baslik.toLocaleLowerCase('tr-TR');
  return SOZLESME_BASLIK_ANAHTARLARI.some((k) => b.includes(k));
}

/** Yasal sayfa içeriklerinden footer sözleşme linkleri */
export function sozlesmeGrubuOlustur(site: SiteGenelIcerik): FooterLinkGrup | null {
  const yasal = site.yasalSayfalar ?? VARSAYILAN_SITE_ICERIK.yasalSayfalar;
  const baslik =
    site.footer.sozlesmelerBaslik?.trim() ||
    VARSAYILAN_SITE_ICERIK.footer.sozlesmelerBaslik ||
    'Sözleşmeler';

  const anahtarlar = Object.keys(YASAL_SAYFA_YOLLAR) as YasalSayfaAnahtar[];
  const linkler = anahtarlar
    .filter((k) => yasal[k]?.yayinda !== false)
    .map((k) => ({
      href: YASAL_SAYFA_YOLLAR[k],
      label: (yasal[k]?.baslik || YASAL_SAYFA_ETIKET[k]).trim(),
    }))
    .filter((l) => l.label);

  if (linkler.length === 0) return null;
  return { baslik, linkler };
}

/** Footer’da gösterilecek link grupları (sözleşmeler sütunu otomatik eklenir) */
export function footerLinkGruplari(site: SiteGenelIcerik): FooterLinkGrup[] {
  const gruplar = [...(site.footer.gruplar ?? VARSAYILAN_SITE_ICERIK.footer.gruplar)].map((g) => ({
    ...g,
    linkler: g.linkler.filter(
      (l) => !l.href.includes('/rehber') && l.label.toLowerCase() !== 'rehber'
    ),
  }));

  if (gruplar.some((g) => grupSozlesmeMi(g.baslik))) {
    return gruplar;
  }

  const goster = site.footer.sozlesmelerGoster !== false;
  if (!goster) return gruplar;

  const sozlesme = sozlesmeGrubuOlustur(site);
  if (!sozlesme) return gruplar;

  return [...gruplar, sozlesme];
}
