import { prisma } from '../config/database';

export function grupAdindanSlug(ad: string): string {
  return ad
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-Z0-9ÇĞİÖŞÜ]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'GENEL';
}

/** Seçili gruplara alt grupları da ekler */
export async function grupIdleriniGenislet(grupIds: string[]): Promise<string[]> {
  if (grupIds.length === 0) return [];

  const gruplar = await prisma.grup.findMany({
    where: { aktif: true },
    select: { id: true, parentId: true },
  });

  const set = new Set<string>(grupIds.filter(Boolean));
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const g of gruplar) {
      if (g.parentId && set.has(g.parentId) && !set.has(g.id)) {
        set.add(g.id);
        degisti = true;
      }
    }
  }
  return [...set];
}

/** Eski paketlerde kategori slug'ından grup eşlemesi (KPSS, TYT vb.) */
export async function kategoridenGrupIdleriBul(kategori: string): Promise<string[]> {
  const slug = String(kategori || '').trim().toUpperCase();
  if (!slug || slug === 'GENEL') return [];

  const gruplar = await prisma.grup.findMany({
    where: { aktif: true },
    select: { id: true, ad: true },
  });

  const eslesen = gruplar.filter((g) => {
    const norm = grupAdindanSlug(g.ad);
    const adBuyuk = g.ad.trim().toLocaleUpperCase('tr-TR');
    return norm === slug || adBuyuk === slug || adBuyuk.includes(slug);
  });

  return grupIdleriniGenislet(eslesen.map((g) => g.id));
}

export async function paketIcinGrupIdleriCoz(paket: {
  grupIds: string[];
  kategori?: string | null;
}): Promise<string[]> {
  const temel = paket.grupIds?.length
    ? paket.grupIds
    : await kategoridenGrupIdleriBul(paket.kategori || '');
  return grupIdleriniGenislet(temel);
}

/** Paket kaydında grup seçimine göre market kategorisi slug üretir */
export async function paketKategoriGrupSenkronla(grupIds: string[]): Promise<string> {
  if (!grupIds.length) return 'GENEL';

  const grup = await prisma.grup.findUnique({
    where: { id: grupIds[0] },
    include: { parent: { select: { id: true, ad: true } } },
  });
  if (!grup) return 'GENEL';

  const kok = grup.parent ?? grup;
  const slug = grupAdindanSlug(kok.ad);

  await prisma.paketKategoriKayit.upsert({
    where: { slug },
    create: {
      ad: kok.ad,
      slug,
      sira: 50,
      aktif: true,
    },
    update: {
      ad: kok.ad,
      aktif: true,
    },
  });

  return slug;
}

export async function paketSinavlariniGetir(paket: {
  sinavIds: string[];
  grupIds: string[];
  kategori?: string | null;
}) {
  const genisletilmisGrupIds = await paketIcinGrupIdleriCoz(paket);
  const orKosullar: Array<Record<string, unknown>> = [];

  if (paket.sinavIds.length > 0) {
    orKosullar.push({ id: { in: paket.sinavIds } });
  }
  if (genisletilmisGrupIds.length > 0) {
    orKosullar.push({ grupId: { in: genisletilmisGrupIds } });
  }
  if (orKosullar.length === 0) return [];

  const sinavlar = await prisma.sinav.findMany({
    where: {
      OR: orKosullar,
      yayinlandi: true,
      takvimdeGoster: true,
    },
    orderBy: { baslangicZamani: 'asc' },
    include: {
      grup: { select: { id: true, ad: true, tur: true } },
      _count: { select: { sorular: true } },
    },
  });

  const benzersiz = new Map<string, (typeof sinavlar)[0]>();
  for (const s of sinavlar) benzersiz.set(s.id, s);
  return [...benzersiz.values()].sort(
    (a, b) => a.baslangicZamani.getTime() - b.baslangicZamani.getTime()
  );
}
