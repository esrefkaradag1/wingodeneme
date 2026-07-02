export type OgretimTuruKpss = 'KPSS_LISANS' | 'KPSS_ORTAOGRETIM' | 'KPSS_ONLISANS';

const KPSS_TURLERI: OgretimTuruKpss[] = ['KPSS_LISANS', 'KPSS_ORTAOGRETIM', 'KPSS_ONLISANS'];

function adNorm(ad: string): string {
  return ad.toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
}

function kpssMetniMi(metin: string): boolean {
  const n = adNorm(metin);
  return n.includes('kpss') || metin.toLocaleLowerCase('tr-TR').includes('kamu personel');
}

/** Grup adı/yolundan KPSS alt kademesini çıkarır (önlisans önce kontrol edilir). */
export function kpssAltTurTahmin(metin: string): OgretimTuruKpss | undefined {
  const n = adNorm(metin);
  if (n.includes('onlisans') || n.includes('önlisans')) {
    return 'KPSS_ONLISANS';
  }
  if (n.includes('ortaogretim') || n.includes('ortaöğretim')) {
    return 'KPSS_ORTAOGRETIM';
  }
  if (n.includes('lisans')) {
    return 'KPSS_LISANS';
  }
  return undefined;
}

export function kpssOgretimTuruMu(tur?: string | null): tur is OgretimTuruKpss {
  return Boolean(tur && KPSS_TURLERI.includes(tur as OgretimTuruKpss));
}

/** Grup adı/türünden konu listesi için öğretim türü (eski KPSS grupları YKS etiketli olabilir). */
export function grupKonuOgretimTuru(
  g?: { ad?: string | null; tur?: string | null } | null,
  tamYol?: string | null
): string | undefined {
  if (!g) return undefined;
  if (kpssOgretimTuruMu(g.tur)) return g.tur;

  const yol = String(tamYol || g.ad || '').trim();
  const adStr = String(g.ad || '');

  const kpssBaglam = g.tur === 'KPSS' || kpssMetniMi(yol) || kpssMetniMi(adStr);
  if (kpssBaglam) {
    const tahmin = kpssAltTurTahmin(yol) || kpssAltTurTahmin(adStr);
    if (tahmin) return tahmin;
    if (g.tur === 'KPSS') return undefined;
  }

  return g.tur || undefined;
}

/** Dropdown rozeti — DB tur alanı yanlış olsa bile ad/yol üzerinden düzeltir. */
export function grupEtiketTuru(
  g?: { ad?: string | null; tur?: string | null } | null,
  tamYol?: string | null
): string | undefined {
  const efektif = grupKonuOgretimTuru(g, tamYol);
  if (efektif) return efektif;
  const yol = String(tamYol || g?.ad || '').trim();
  if (kpssMetniMi(yol)) return 'KPSS';
  return g?.tur || undefined;
}

export function kpssOgretimTuruEtiket(tur?: string | null): string {
  if (tur === 'KPSS_LISANS') return 'KPSS Lisans';
  if (tur === 'KPSS_ORTAOGRETIM') return 'KPSS Ortaöğretim';
  if (tur === 'KPSS_ONLISANS') return 'KPSS Önlisans';
  return 'KPSS';
}

/** Grup satırı / dropdown için kısa öğretim türü etiketi */
export function ogretimTuruKisaEtiket(tur?: string | null): string {
  if (tur === 'KPSS_LISANS') return 'KPSS Lisans';
  if (tur === 'KPSS_ORTAOGRETIM') return 'KPSS Ortaöğretim';
  if (tur === 'KPSS_ONLISANS') return 'KPSS Önlisans';
  if (tur === 'YKS') return 'YKS';
  if (tur === 'LGS') return 'LGS';
  if (tur === 'SINIF_6') return '6. Sınıf';
  if (tur === 'SINIF_7') return '7. Sınıf';
  if (tur === 'SINIF_10') return '10. Sınıf';
  if (tur === 'SINIF_11') return '11. Sınıf';
  if (tur === 'KPSS') return 'KPSS';
  return tur || '—';
}

/** Grup adı/türünden liste etiketi (eski KPSS kayıtları YKS etiketli olabilir). */
export function grupListeEtiketi(
  g: { ad?: string | null; tur?: string | null },
  yol?: string
): string {
  const adYol = yol || String(g.ad || '').trim();
  const efektif = grupEtiketTuru(g, adYol);
  return `${adYol} (${ogretimTuruKisaEtiket(efektif)})`;
}

export const KPSS_KADEME_SECENEKLERI = [
  { value: 'KPSS_LISANS' as const, label: 'KPSS Lisans' },
  { value: 'KPSS_ONLISANS' as const, label: 'KPSS Önlisans' },
  { value: 'KPSS_ORTAOGRETIM' as const, label: 'KPSS Ortaöğretim' },
];
