import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { paketKategorileriSeedEt, slugUret } from '../services/paketKategoriSeed';

async function kategoriCacheTemizle(): Promise<void> {
  await cache.siliModeliyle('paketler:aktif*');
  await cache.siliModeliyle('paket-kategorileri:*');
}

export async function aktifPaketKategorileriGetir(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = 'paket-kategorileri:aktif:v1';
    const cached = await cache.al(cacheKey);
    if (cached) {
      res.json({ basarili: true, veri: cached });
      return;
    }

    const say = await prisma.paketKategoriKayit.count();
    if (say === 0) await paketKategorileriSeedEt();

    const veri = await prisma.paketKategoriKayit.findMany({
      where: { aktif: true },
      orderBy: [{ sira: 'asc' }, { ad: 'asc' }],
      select: { id: true, ad: true, slug: true, sira: true, renk: true },
    });

    await cache.yaz(cacheKey, veri, 300);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function paketKategorileriGetir(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const say = await prisma.paketKategoriKayit.count();
    if (say === 0) await paketKategorileriSeedEt();

    const veri = await prisma.paketKategoriKayit.findMany({
      orderBy: [{ sira: 'asc' }, { ad: 'asc' }],
    });
    const paketSayilari = await prisma.paket.groupBy({
      by: ['kategori'],
      _count: { id: true },
    });
    const sayMap = new Map(paketSayilari.map((p) => [p.kategori, p._count.id]));
    res.json({
      basarili: true,
      veri: veri.map((k) => ({ ...k, _count: { paketler: sayMap.get(k.slug) || 0 } })),
    });
  } catch (err) {
    next(err);
  }
}

export async function paketKategoriOlustur(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ad, slug, sira, renk, aktif } = req.body as Record<string, unknown>;
    const adStr = String(ad || '').trim();
    if (!adStr) {
      res.status(400).json({ basarili: false, mesaj: 'Kategori adı zorunludur' });
      return;
    }
    const slugStr = String(slug || slugUret(adStr)).trim().toUpperCase();

    const kayit = await prisma.paketKategoriKayit.create({
      data: {
        ad: adStr,
        slug: slugStr,
        sira: typeof sira === 'number' ? sira : parseInt(String(sira || '0'), 10) || 0,
        renk: typeof renk === 'string' && renk.trim() ? renk.trim() : null,
        aktif: aktif !== false,
      },
    });

    await kategoriCacheTemizle();
    res.status(201).json({ basarili: true, veri: kayit });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ basarili: false, mesaj: 'Bu slug zaten kullanılıyor' });
      return;
    }
    next(err);
  }
}

export async function paketKategoriGuncelle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ad, sira, renk, aktif } = req.body as Record<string, unknown>;
    const mevcut = await prisma.paketKategoriKayit.findUnique({ where: { id: req.params.id } });
    if (!mevcut) {
      res.status(404).json({ basarili: false, mesaj: 'Kategori bulunamadı' });
      return;
    }

    const kayit = await prisma.paketKategoriKayit.update({
      where: { id: req.params.id },
      data: {
        ...(ad !== undefined ? { ad: String(ad).trim() } : {}),
        ...(sira !== undefined ? { sira: parseInt(String(sira), 10) || 0 } : {}),
        ...(renk !== undefined ? { renk: renk ? String(renk).trim() : null } : {}),
        ...(aktif !== undefined ? { aktif: Boolean(aktif) } : {}),
      },
    });

    await kategoriCacheTemizle();
    res.json({ basarili: true, veri: kayit });
  } catch (err) {
    next(err);
  }
}

export async function paketKategoriSil(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const mevcut = await prisma.paketKategoriKayit.findUnique({
      where: { id: req.params.id },
    });
    if (!mevcut) {
      res.status(404).json({ basarili: false, mesaj: 'Kategori bulunamadı' });
      return;
    }
    const paketSayisi = await prisma.paket.count({ where: { kategori: mevcut.slug } });
    if (paketSayisi > 0) {
      res.status(400).json({
        basarili: false,
        mesaj: `Bu kategoride ${paketSayisi} paket var. Önce paketleri başka kategoriye taşıyın.`,
      });
      return;
    }
    if (mevcut.slug === 'GENEL') {
      res.status(400).json({ basarili: false, mesaj: 'Genel kategorisi silinemez' });
      return;
    }

    await prisma.paketKategoriKayit.delete({ where: { id: req.params.id } });
    await kategoriCacheTemizle();
    res.json({ basarili: true, mesaj: 'Kategori silindi' });
  } catch (err) {
    next(err);
  }
}

/** Paket kaydı için geçerli kategori slug döndürür */
export async function paketKategoriSlugDogrula(raw: unknown): Promise<string> {
  const slug = String(raw || 'GENEL').trim().toUpperCase();
  const say = await prisma.paketKategoriKayit.count();
  if (say === 0) await paketKategorileriSeedEt();
  const kayit = await prisma.paketKategoriKayit.findFirst({
    where: { slug, aktif: true },
  });
  if (kayit) return kayit.slug;
  const genel = await prisma.paketKategoriKayit.findUnique({ where: { slug: 'GENEL' } });
  return genel?.slug || 'GENEL';
}
