/** API'den gelen paket kategori kaydı */
export interface PaketKategoriKayit {
  id: string;
  ad: string;
  slug: string;
  sira: number;
  renk?: string | null;
  aktif?: boolean;
  _count?: { paketler: number };
}

export const VARSAYILAN_KATEGORI_RENKLERI = [
  { id: 'sky', label: 'Mavi', renk: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'indigo', label: 'İndigo', renk: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'violet', label: 'Mor', renk: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'emerald', label: 'Yeşil', renk: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'amber', label: 'Turuncu', renk: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'rose', label: 'Pembe', renk: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'gray', label: 'Gri', renk: 'bg-gray-100 text-gray-700 border-gray-200' },
] as const;

const FALLBACK_RENK = 'bg-gray-100 text-gray-700 border-gray-200';

export function kategoriHaritasi(liste: PaketKategoriKayit[]): Map<string, PaketKategoriKayit> {
  return new Map(liste.map((k) => [k.slug, k]));
}

export function paketKategoriEtiket(slug?: string | null, harita?: Map<string, PaketKategoriKayit>): string {
  if (!slug) return 'Genel';
  return harita?.get(slug)?.ad || slug;
}

export function paketKategoriRenk(slug?: string | null, harita?: Map<string, PaketKategoriKayit>): string {
  if (!slug) return FALLBACK_RENK;
  return harita?.get(slug)?.renk || FALLBACK_RENK;
}

export function paketKategoriFromPaket(
  paket: { kategori?: string | null; kategoriKayit?: { ad?: string; slug?: string; renk?: string | null } | null },
  harita?: Map<string, PaketKategoriKayit>
): { slug: string; ad: string; renk: string } {
  const slug = paket.kategoriKayit?.slug || paket.kategori || 'GENEL';
  const kayit = harita?.get(slug);
  return {
    slug,
    ad: paket.kategoriKayit?.ad || kayit?.ad || slug,
    renk: paket.kategoriKayit?.renk || kayit?.renk || FALLBACK_RENK,
  };
}

export function slugOnizle(ad: string): string {
  return ad
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-Z0-9ÇĞİÖŞÜ]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'KATEGORI';
}
