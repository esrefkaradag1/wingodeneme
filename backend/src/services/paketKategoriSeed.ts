import { prisma } from '../config/database';

export const VARSAYILAN_PAKET_KATEGORILERI = [
  { slug: 'TYT', ad: 'TYT', sira: 1, renk: 'bg-sky-100 text-sky-800 border-sky-200' },
  { slug: 'AYT', ad: 'AYT', sira: 2, renk: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { slug: 'YKS', ad: 'YKS', sira: 3, renk: 'bg-violet-100 text-violet-800 border-violet-200' },
  { slug: 'LGS', ad: 'LGS', sira: 4, renk: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { slug: 'KPSS', ad: 'KPSS', sira: 5, renk: 'bg-amber-100 text-amber-800 border-amber-200' },
  { slug: 'GENEL', ad: 'Genel', sira: 99, renk: 'bg-gray-100 text-gray-700 border-gray-200' },
] as const;

export async function paketKategorileriSeedEt(): Promise<void> {
  for (const k of VARSAYILAN_PAKET_KATEGORILERI) {
    await prisma.paketKategoriKayit.upsert({
      where: { slug: k.slug },
      create: { ...k, aktif: true },
      update: {},
    });
  }
}

export function slugUret(ad: string): string {
  return ad
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-Z0-9ÇĞİÖŞÜ]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'KATEGORI';
}
