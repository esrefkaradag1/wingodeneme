/** Backend `BRANS_DERS_HARITASI` ile uyumlu — öğretmen izinli dersler */
const BRANS_DERS: Record<string, string[]> = {
  Matematik: ['Matematik', 'Geometri'],
  Geometri: ['Geometri', 'Matematik'],
  'Fen Bilimleri': ['Fen Bilimleri', 'Fizik', 'Kimya', 'Biyoloji'],
  'Sosyal Bilgiler': ['Sosyal Bilgiler', 'Tarih', 'Coğrafya', 'İnkılap Tarihi ve Atatürkçülük', 'T.C. İnkılap Tarihi ve Atatürkçülük'],
};

const BRANS_AYRAC = /[,;|]+/;

export function branslarParse(bransHam: string | null | undefined): string[] {
  if (!bransHam?.trim()) return [];
  return [
    ...new Set(
      bransHam
        .split(BRANS_AYRAC)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

function bransIcinTekBrans(brans: string): string[] {
  if (!brans) return [];
  const b = brans.trim();
  if (BRANS_DERS[b]) return BRANS_DERS[b];
  const eslesen = Object.keys(BRANS_DERS).find(
    (k) => b.toLowerCase() === k.toLowerCase() || b.toLowerCase().includes(k.toLowerCase())
  );
  if (eslesen) return BRANS_DERS[eslesen];
  return [b];
}

export function bransIcinDersler(bransHam: string): string[] {
  if (!bransHam?.trim()) return [];
  const liste = branslarParse(bransHam);
  const kaynak = liste.length ? liste : [bransHam.trim()];
  const dersler = new Set<string>();
  for (const b of kaynak) {
    bransIcinTekBrans(b).forEach((d) => dersler.add(d));
  }
  return [...dersler];
}

export function ogretmenIzinliDersEtiketi(brans: string, izinliDersler?: string[]): string {
  if (izinliDersler?.length) return izinliDersler.join(', ');
  return bransIcinDersler(brans).join(', ');
}

export function ogretmenBransEtiketi(brans?: string, branslar?: string[]): string {
  if (branslar?.length) return branslar.join(', ');
  if (brans) return branslarParse(brans).join(', ') || brans;
  return '—';
}
