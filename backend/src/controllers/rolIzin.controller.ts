import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Rol → izinli menü listesi haritası.
 * SistemAyarlari tablosunda tek satır olarak saklanır:
 *   anahtar = 'ROL_MENU_IZIN', deger = JSON string
 *
 * Yapı: { [rolAdi: string]: string[] }  // string[] => izinli menü href'leri
 *
 * `*` veya boş dizi = "varsayılan" anlamına gelir; UI bu davranışı yorumlar:
 * ADMIN/SUPER_ADMIN için izin tanımlanmamışsa hepsi görünür.
 * TEACHER/diğer roller için tanım yoksa boş kabul edilir.
 */

const AYAR_ANAHTAR = 'ROL_MENU_IZIN';

const VARSAYILAN_IZINLER: Record<string, string[]> = {
  // ADMIN ve SUPER_ADMIN için '*' her şeyi açar (UI tarafında yorumlanır)
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  // Sınav listesi: hoca branş sırasına göre soru atar; yayın/oluşturma admin’de kalır
  TEACHER: ['/panel', '/panel/sorular', '/panel/ai', '/panel/sinavlar'],
};

/** Eski varsayılan (sinavlar menüsü yok) — soft migration */
const ESKI_TEACHER_MENULER = ['/panel', '/panel/sorular', '/panel/ai'];

function teacherMenuleriMigrate(liste: string[]): string[] {
  if (liste.includes('*') || liste.includes('/panel/sinavlar')) return liste;
  const sirali = [...liste].sort().join(',');
  const eski = [...ESKI_TEACHER_MENULER].sort().join(',');
  if (sirali === eski) return [...liste, '/panel/sinavlar'];
  return liste;
}

async function izinleriOku(): Promise<Record<string, string[]>> {
  const kayit = await prisma.sistemAyarlari.findUnique({ where: { anahtar: AYAR_ANAHTAR } });
  if (!kayit?.deger) return VARSAYILAN_IZINLER;
  try {
    const parsed = JSON.parse(kayit.deger);
    if (parsed && typeof parsed === 'object') {
      const merged: Record<string, string[]> = { ...VARSAYILAN_IZINLER, ...parsed };
      if (Array.isArray(merged.TEACHER)) {
        merged.TEACHER = teacherMenuleriMigrate(merged.TEACHER);
      }
      return merged;
    }
  } catch {}
  return VARSAYILAN_IZINLER;
}

export async function rolIzinleriGetController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const izinler = await izinleriOku();
    res.json({ basarili: true, veri: izinler });
  } catch (err) {
    next(err);
  }
}

export async function rolIzinleriGuncelleController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const yeni = req.body as Record<string, unknown>;
    if (!yeni || typeof yeni !== 'object') {
      res.status(400).json({ basarili: false, mesaj: 'Geçersiz veri' });
      return;
    }
    // sadece string -> string[] yapısına izin ver
    const temiz: Record<string, string[]> = {};
    for (const [rol, deger] of Object.entries(yeni)) {
      if (!Array.isArray(deger)) continue;
      const liste = (deger as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0);
      temiz[rol] = Array.from(new Set(liste));
    }

    const json = JSON.stringify(temiz);
    await prisma.sistemAyarlari.upsert({
      where: { anahtar: AYAR_ANAHTAR },
      update: { deger: json },
      create: { anahtar: AYAR_ANAHTAR, deger: json },
    });

    res.json({ basarili: true, veri: temiz });
  } catch (err) {
    next(err);
  }
}

/**
 * Giriş yapmış kullanıcının kendi rolü için izinli menülerin listesini döner.
 * Frontend bu bilgiyle sidebar'ı filtreler.
 */
export async function rolIzinleriBenimController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rol = req.kullanici?.rol;
    if (!rol) {
      res.status(401).json({ basarili: false, mesaj: 'Yetkisiz' });
      return;
    }
    const izinler = await izinleriOku();
    const liste = izinler[rol] ?? [];
    const tumIzin = liste.includes('*');
    res.json({
      basarili: true,
      veri: { rol, tumIzin, menuler: tumIzin ? [] : liste },
    });
  } catch (err) {
    next(err);
  }
}
