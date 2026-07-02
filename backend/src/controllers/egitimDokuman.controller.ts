/**
 * WingoDeneme — Eğitim Dokümanı (RAG) controller'ı
 * Upload / list / get / sil / yeniden işle endpoint'leri.
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { dokumanIsle } from '../services/rag.service';
import { egitimStorageBucket, supabaseAdminHazir } from '../config/supabaseAdmin';
import { s3ImzaliYuklemeUrlOlustur } from '../utils/s3';
import { sayfaAraligiParse } from '../utils/sayfaAraligi';
import { s3AnahtarlariGecerli } from '../utils/storageYapilandirma';
import { supabaseImzaliYuklemeUrlOlustur } from '../utils/supabaseStorage';
import {
  egitimDosyaKaydet,
  egitimDosyaMutlakYol,
  egitimDosyaSil,
  yerelEgitimDosyasiMi,
} from '../utils/egitimDosyaDeposu';
import * as fs from 'fs/promises';

const STORAGE_BUCKET = egitimStorageBucket();
const MAKS_DOGRUDAN_YUKLEME_BOYUTU = 25 * 1024 * 1024;
/** Varsayılan: sunucu diski. Supabase için EGITIM_STORAGE=supabase */
const EGITIM_STORAGE = (process.env.EGITIM_STORAGE || 'local').toLowerCase();

const KABUL_EDILEN_TIPLER = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function dosyaTipiKabulEdiliyor(muhtemelTip?: string, dosyaAdi?: string): boolean {
  return Boolean(
    (muhtemelTip && KABUL_EDILEN_TIPLER.has(muhtemelTip)) ||
    (dosyaAdi && /\.(pdf|txt|md|docx)$/i.test(dosyaAdi)),
  );
}

function guvenliDosyaAdi(raw: unknown): string {
  const ad = String(raw || 'dokuman').trim() || 'dokuman';
  return ad.replace(/[^\w.\-]/g, '_').slice(0, 160);
}

/** POST /admin/egitim-dokumanlar/yukleme-url */
export async function egitimDokumanImzaliYuklemeUrlController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { dosyaAd, dosyaTipi, dosyaBoyut } = req.body || {};
    const ad = guvenliDosyaAdi(dosyaAd);
    const tip = String(dosyaTipi || 'application/octet-stream');
    const boyut = Number(dosyaBoyut || 0);

    if (!dosyaTipiKabulEdiliyor(tip, ad)) {
      res.status(400).json({
        basarili: false,
        mesaj: 'Desteklenmeyen dosya tipi. Yalnızca PDF, TXT, MD, DOCX kabul edilir.',
      });
      return;
    }

    if (!Number.isFinite(boyut) || boyut <= 0 || boyut > MAKS_DOGRUDAN_YUKLEME_BOYUTU) {
      res.status(400).json({
        basarili: false,
        mesaj: 'Dosya boyutu geçersiz. En fazla 25 MB yüklenebilir.',
      });
      return;
    }

    if (EGITIM_STORAGE !== 'supabase') {
      res.status(400).json({
        basarili: false,
        mesaj: 'Dosyalar doğrudan sunucuya yüklenir. Lütfen form ile yükleyin.',
      });
      return;
    }

    let veri;
    if (supabaseAdminHazir()) {
      veri = await supabaseImzaliYuklemeUrlOlustur(ad, tip);
    } else if (s3AnahtarlariGecerli()) {
      const s3 = await s3ImzaliYuklemeUrlOlustur(ad, tip);
      veri = { ...s3, yontem: 's3' as const, bucket: egitimStorageBucket(), path: s3.key };
    } else {
      res.status(503).json({
        basarili: false,
        mesaj:
          'Büyük dosya yüklemesi yapılandırılmamış. Backend ortamına SUPABASE_SERVICE_ROLE_KEY ekleyin (Supabase → Settings → API → service_role).',
      });
      return;
    }
    res.json({ basarili: true, veri });
  } catch (e) {
    next(e);
  }
}

const KABUL_EDILEN_DOKUMAN_TURLERI = new Set([
  'KONU_ANLATIMI',
  'DENEME_SINAVI',
  'SORU_ORNEKLERI',
  'COZUM',
  'DIGER',
]);

/** POST /admin/egitim-dokumanlar  (multipart/form-data veya JSON) */
export async function egitimDokumanYukleController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { baslik, ders, konuId, ogretimTuru, tur, kaynakUrl, sayfaBaslangic, sayfaBitis } = req.body || {};
    const hariciDosyaUrl = req.body?.dosyaUrl ? String(req.body.dosyaUrl).trim() : '';
    const hariciDosyaAd = req.body?.dosyaAd ? guvenliDosyaAdi(req.body.dosyaAd) : '';
    const hariciDosyaTipi = req.body?.dosyaTipi ? String(req.body.dosyaTipi) : '';
    const hariciDosyaBoyut = Number(req.body?.dosyaBoyut || 0);
    const dosya = (req as AuthRequest & { file?: Express.Multer.File }).file;

    if (!dosya && !kaynakUrl && !hariciDosyaUrl) {
      res.status(400).json({ basarili: false, mesaj: 'Lütfen bir dosya yükleyin veya bir URL adresi girin.' });
      return;
    }

    if (dosya && !dosyaTipiKabulEdiliyor(dosya.mimetype, dosya.originalname)) {
      res.status(400).json({
        basarili: false,
        mesaj: 'Desteklenmeyen dosya tipi. Yalnızca PDF, TXT, MD, DOCX kabul edilir.',
      });
      return;
    }

    if (!baslik || String(baslik).trim().length < 2) {
      res.status(400).json({ basarili: false, mesaj: 'Başlık zorunludur.' });
      return;
    }

    const dokumanTuru = KABUL_EDILEN_DOKUMAN_TURLERI.has(String(tur || 'DIGER'))
      ? String(tur || 'DIGER')
      : 'DIGER';

    let sayfaAraligi: { baslangic: number | null; bitis: number | null } | null = null;
    try {
      sayfaAraligi = sayfaAraligiParse(sayfaBaslangic, sayfaBitis);
    } catch (e) {
      res.status(400).json({ basarili: false, mesaj: (e as Error).message });
      return;
    }

    let dosyaUrl: string | null = null;
    let dosyaAd = 'URL_KAYNAK';
    let dosyaTipi = 'text/html';
    let dosyaBoyut = 0;

    if (dosya) {
      const dosyaBuf: Buffer = dosya.buffer ?? await fs.readFile(dosya.path);
      dosyaAd = dosya.originalname;
      dosyaTipi = dosya.mimetype || 'application/octet-stream';
      dosyaBoyut = dosya.size;

      // Önce DB kaydı (id için)
      const dokuman = await prisma.egitimDokuman.create({
        data: {
          baslik: String(baslik).trim(),
          ders: ders ? String(ders) : null,
          konuId: konuId ? String(konuId) : null,
          ogretimTuru: ogretimTuru || null,
          tur: dokumanTuru as any,
          dosyaAd,
          dosyaTipi,
          dosyaBoyut,
          dosyaUrl: null,
          kaynakUrl: kaynakUrl ? String(kaynakUrl).trim() : null,
          sayfaBaslangic: sayfaAraligi?.baslangic ?? null,
          sayfaBitis: sayfaAraligi?.bitis ?? null,
          durum: 'BEKLIYOR',
          yukleyenId: req.kullanici?.id || null,
        },
      });

      // Sunucu diskinde sakla (varsayılan)
      if (EGITIM_STORAGE !== 'supabase') {
        const localRef = await egitimDosyaKaydet(dokuman.id, dosyaBuf, dosyaAd);
        await prisma.egitimDokuman.update({
          where: { id: dokuman.id },
          data: { dosyaUrl: localRef },
        });
        const absYol = egitimDosyaMutlakYol(localRef);
        void dokumanIsle(dokuman.id, absYol);
        res.status(201).json({
          basarili: true,
          veri: { ...dokuman, dosyaUrl: localRef },
          depolama: 'local',
        });
        return;
      }

      // Opsiyonel: Supabase Storage (EGITIM_STORAGE=supabase)
      const yolKey = `${Date.now()}-${dosya.originalname.replace(/[^\w.\-]/g, '_')}`;
      try {
        const upload = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(yolKey, dosyaBuf, {
            contentType: dosya.mimetype || 'application/octet-stream',
            upsert: false,
          });
        if (upload.error) throw upload.error;
        const pub = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(yolKey);
        dosyaUrl = pub.data.publicUrl;
      } catch (e) {
        logger.warn(`[RAG] Supabase Storage başarısız, sunucu diski kullanılıyor: ${(e as Error).message}`);
        const localRef = await egitimDosyaKaydet(dokuman.id, dosyaBuf, dosyaAd);
        dosyaUrl = localRef;
      }

      const guncel = await prisma.egitimDokuman.update({
        where: { id: dokuman.id },
        data: { dosyaUrl },
      });

      if (yerelEgitimDosyasiMi(dosyaUrl)) {
        void dokumanIsle(dokuman.id, egitimDosyaMutlakYol(dosyaUrl!));
      } else {
        const tmpYol = `/tmp/wingo-egitim-${dokuman.id}`;
        await fs.writeFile(tmpYol, dosyaBuf);
        void dokumanIsle(dokuman.id, tmpYol).finally(async () => {
          await fs.unlink(tmpYol).catch(() => undefined);
        });
      }

      res.status(201).json({ basarili: true, veri: guncel });
      return;
    } else if (hariciDosyaUrl) {
      if (!dosyaTipiKabulEdiliyor(hariciDosyaTipi, hariciDosyaAd || hariciDosyaUrl)) {
        res.status(400).json({
          basarili: false,
          mesaj: 'Desteklenmeyen dosya tipi. Yalnızca PDF, TXT, MD, DOCX kabul edilir.',
        });
        return;
      }
      dosyaUrl = hariciDosyaUrl;
      dosyaAd = hariciDosyaAd || 'S3_KAYNAK';
      dosyaTipi = hariciDosyaTipi || 'application/octet-stream';
      dosyaBoyut = Number.isFinite(hariciDosyaBoyut) ? hariciDosyaBoyut : 0;
    }

    const dokuman = await prisma.egitimDokuman.create({
      data: {
        baslik: String(baslik).trim(),
        ders: ders ? String(ders) : null,
        konuId: konuId ? String(konuId) : null,
        ogretimTuru: ogretimTuru || null,
        tur: dokumanTuru as any,
        dosyaAd,
        dosyaTipi,
        dosyaBoyut,
        dosyaUrl,
        kaynakUrl: kaynakUrl ? String(kaynakUrl).trim() : null,
        sayfaBaslangic: sayfaAraligi?.baslangic ?? null,
        sayfaBitis: sayfaAraligi?.bitis ?? null,
        durum: 'BEKLIYOR',
        yukleyenId: req.kullanici?.id || null,
      },
    });

    // 3) İşlemeyi BAŞLAT (non-blocking)
    void dokumanIsle(dokuman.id);

    res.status(201).json({ basarili: true, veri: dokuman });
  } catch (e) {
    next(e);
  }
}

/** GET /admin/egitim-dokumanlar */
export async function egitimDokumanListeleController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { ders, konuId, durum } = req.query;
    const [dokumanlar, ozet] = await Promise.all([
      prisma.egitimDokuman.findMany({
        where: {
          ders: ders ? String(ders) : undefined,
          konuId: konuId ? String(konuId) : undefined,
          durum: durum ? (String(durum) as 'BEKLIYOR' | 'ISLENIYOR' | 'HAZIR' | 'HATA') : undefined,
        },
        orderBy: { olusturuldu: 'desc' },
      }),
      prisma.egitimDokuman.aggregate({
        where: {
          ders: ders ? String(ders) : undefined,
          konuId: konuId ? String(konuId) : undefined,
          durum: durum ? (String(durum) as 'BEKLIYOR' | 'ISLENIYOR' | 'HAZIR' | 'HATA') : undefined,
        },
        _sum: { dosyaBoyut: true, chunkSayisi: true },
        _count: true,
      }),
    ]);
    res.json({
      basarili: true,
      veri: dokumanlar,
      ozet: {
        toplam: ozet._count,
        toplamBoyut: ozet._sum.dosyaBoyut || 0,
        toplamChunk: ozet._sum.chunkSayisi || 0,
      },
    });
  } catch (e) {
    next(e);
  }
}

/** GET /admin/egitim-dokumanlar/:id */
export async function egitimDokumanDetayController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const dokuman = await prisma.egitimDokuman.findUnique({
      where: { id: req.params.id },
      include: {
        chunklar: {
          select: { id: true, sira: true, metin: true, baslangic: true, bitis: true },
          orderBy: { sira: 'asc' },
          take: 50,
        },
      },
    });
    if (!dokuman) {
      res.status(404).json({ basarili: false, mesaj: 'Doküman bulunamadı.' });
      return;
    }
    res.json({ basarili: true, veri: dokuman });
  } catch (e) {
    next(e);
  }
}

/** DELETE /admin/egitim-dokumanlar/:id */
export async function egitimDokumanSilController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const dokuman = await prisma.egitimDokuman.findUnique({ where: { id: req.params.id } });
    if (!dokuman) {
      res.status(404).json({ basarili: false, mesaj: 'Doküman bulunamadı.' });
      return;
    }

    // Storage'taki dosyayı sil (varsa)
    if (dokuman.dosyaUrl) {
      if (yerelEgitimDosyasiMi(dokuman.dosyaUrl)) {
        await egitimDosyaSil(dokuman.dosyaUrl);
      } else {
        try {
          const url = new URL(dokuman.dosyaUrl);
          const segments = url.pathname.split('/');
          const i = segments.indexOf(STORAGE_BUCKET);
          if (i >= 0 && i < segments.length - 1) {
            const key = decodeURIComponent(segments.slice(i + 1).join('/'));
            await supabase.storage.from(STORAGE_BUCKET).remove([key]);
          }
        } catch (e) {
          logger.warn(`[RAG] Storage temizleme atlandı: ${(e as Error).message}`);
        }
      }
    }

    await prisma.egitimDokuman.delete({ where: { id: dokuman.id } });
    res.json({ basarili: true });
  } catch (e) {
    next(e);
  }
}

/** POST /admin/egitim-dokumanlar/:id/yeniden-isle */
export async function egitimDokumanYenidenIsleController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const dokuman = await prisma.egitimDokuman.findUnique({ where: { id: req.params.id } });
    if (!dokuman) {
      res.status(404).json({ basarili: false, mesaj: 'Doküman bulunamadı.' });
      return;
    }
    if (!dokuman.dosyaUrl && !dokuman.hamMetin) {
      res.status(400).json({
        basarili: false,
        mesaj: 'Bu kayıtta kaynak dosya/metin yok. Lütfen dokümanı silip tekrar yükleyin.',
      });
      return;
    }
    void dokumanIsle(dokuman.id);
    res.json({ basarili: true, mesaj: 'Yeniden işleme başlatıldı.' });
  } catch (e) {
    next(e);
  }
}
