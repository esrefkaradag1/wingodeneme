import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export const OSYM_UYARI_METNI =
  'T.C. Ölçme, Seçme ve Yerleştirme Merkezi — Bu testlerin her hakkı saklıdır. Hangi amaçla olursa olsun, testlerin tamamının veya bir kısmının izinsiz kopyalanması, çoğaltılması veya yayımlanması yasaktır.';

export const TUR_BILGI: Record<string, { ust: string; alt: string; kod: string }> = {
  TYT: { ust: 'YÜKSEKÖĞRETİM KURUMLARI SINAVI', alt: 'TEMEL YETERLİLİK TESTİ', kod: 'TYT' },
  AYT: { ust: 'YÜKSEKÖĞRETİM KURUMLARI SINAVI', alt: 'ALAN YETERLİLİK TESTİ', kod: 'AYT' },
  AYT_TYT: { ust: 'YÜKSEKÖĞRETİM KURUMLARI SINAVI', alt: 'ALAN YETERLİLİK TESTİ', kod: 'AYT' },
  LGS: { ust: 'MİLLÎ EĞİTİM BAKANLIĞI', alt: 'LİSEYE GEÇİŞ SINAVI', kod: 'LGS' },
  KPSS: { ust: 'KAMU PERSONEL SEÇME SINAVI', alt: 'GENEL YETENEK VE GENEL KÜLTÜR', kod: 'KPSS' },
  KPSS_LISANS: { ust: 'KAMU PERSONEL SEÇME SINAVI', alt: 'LİSANS', kod: 'KPSS' },
  KPSS_ONLISANS: { ust: 'KAMU PERSONEL SEÇME SINAVI', alt: 'ÖNLİSANS', kod: 'KPSS' },
  KPSS_ORTAOGRETIM: { ust: 'KAMU PERSONEL SEÇME SINAVI', alt: 'ORTAÖĞRETİM', kod: 'KPSS' },
};

export function tarihMetniUret(baslangicIso: string, ozel?: string | null): string {
  if (ozel?.trim()) return ozel.trim();
  const d = new Date(baslangicIso);
  const s = format(d, 'd MMMM yyyy EEEE', { locale: tr });
  return s.toLocaleUpperCase('tr-TR');
}

export function bolumAdiCoz(kitapcikBolumAdi: string | null | undefined, ilkKonuDers?: string | null): string {
  if (kitapcikBolumAdi?.trim()) return kitapcikBolumAdi.trim().toLocaleUpperCase('tr-TR');
  if (!ilkKonuDers?.trim()) return 'GENEL TEST';
  const d = ilkKonuDers.trim().toLocaleUpperCase('tr-TR');
  if (d.endsWith(' TESTİ') || d.endsWith(' TESTI')) return d;
  return `${d} TESTİ`;
}

export function osymSatirKodu(yil: number, tur: string, bolumAdi: string): string {
  const kod = TUR_BILGI[tur]?.kod || tur;
  return `${yil}-${kod}/TÜR ${bolumAdi}`;
}

/** Sınav başlığından "3. DENEME" gibi sağ üst etiket (yoksa null) */
export function denemeEtiketiCikar(baslik?: string | null): string | null {
  const b = (baslik || '').toLocaleUpperCase('tr-TR');
  const m = b.match(/(\d+)\s*\.?\s*DENEME/);
  if (m?.[1]) return `${m[1]}. DENEME`;
  return null;
}
