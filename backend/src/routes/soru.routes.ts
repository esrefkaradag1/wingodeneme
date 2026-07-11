import { Router } from 'express';
import { kimlikDogrula, rolKontrol, AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { OgretimTuru, SoruOnayDurumu, YksKonuSegmenti } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { soruGrubaTopluAtaController } from '../controllers/admin.controller';
import { reqOgretmenKisit, ogretmenDersiUretebilirMi, ogretmenSoruIslemIzni, ogretmenSoruIdsIslemIzni, ogretmenKendiSorulariWhere, ogretmenIcinGrupTurlari } from '../services/ogretmenSinirlama';
import { soruKullaniciOzetSelect, kullaniciGorunenAd } from '../utils/soruDuzenleyen';
import { soruKonuFiltre, soruKonuMetaFiltre, alanKonuWhere } from '../utils/soruKonuEtiket';
import { soruUygunGrupInclude, soruAlanFiltreKosulu } from '../utils/soruUygunGrup';
import { kpssOgretimTuruMu, ogretimTuruPrismaFiltre, ogretimTuruEsdegerleri } from '../utils/grupOgretimTuru';
import { soruOlusturulduAraligi } from '../utils/tarihAraligi';
import { oturumAktiviteMiddleware } from '../middlewares/oturumAktivite.middleware';

const router = Router();
router.use(kimlikDogrula, oturumAktiviteMiddleware);

/** Toplu gruba atama — `GET /:id` ile çakışmaması için önce tanımlı */
router.post('/gruba-ata', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), soruGrubaTopluAtaController);

// Tüm sorular (admin için) - Sayfalamalı
router.get('/hepsi', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sayfa = Math.max(1, parseInt(req.query.sayfa as string || '1'));
    const boyut = Math.min(100, Math.max(1, parseInt(req.query.boyut as string || '20')));
    const atla = (sayfa - 1) * boyut;

    const { ders, zorluk, sinavId, onayDurumu, konuId, q, ogretimTuru, olusturanId, baslangicTarihi, bitisTarihi, yksKapsam } = req.query;
    const onayFiltre =
      typeof onayDurumu === 'string' &&
      (Object.values(SoruOnayDurumu) as string[]).includes(onayDurumu)
        ? (onayDurumu as SoruOnayDurumu)
        : undefined;

    const turFiltre =
      typeof ogretimTuru === 'string' && (Object.values(OgretimTuru) as string[]).includes(ogretimTuru)
        ? (ogretimTuru as OgretimTuru)
        : undefined;

    const yksKapsamStr = typeof yksKapsam === 'string' && yksKapsam.length > 0 ? yksKapsam : undefined;
    const dersStr = typeof ders === 'string' && ders.length > 0 ? ders : undefined;

    // TEACHER ise: branş + kademe bazlı kısıt
    const ogrKisit = await reqOgretmenKisit(req);
    let konuFiltre: Record<string, unknown> | undefined;
    let ogretmenSoruKisiti: Record<string, unknown> | undefined;
    if (ogrKisit) {
      // Öğretmen AI panelinde kardeş kademeyi de (LGS↔YKS ortak müfredat) üretebildiği için
      // soru bankası listesi de aynı genişletilmiş kademe kümesini göstermeli; aksi halde
      // ör. LGS öğretmeninin ürettiği TYT (YKS) soruları listede görünmez.
      const izinliTurler =
        ogretmenIcinGrupTurlari(ogrKisit) ??
        (ogrKisit.ogretimTurleri?.length ? ogrKisit.ogretimTurleri : [ogrKisit.ogretimTuru]);
      const turIzinliMi = (t: OgretimTuru) =>
        ogretimTuruEsdegerleri(t).some((x) => izinliTurler.includes(x));
      const alanTur = turFiltre ?? (yksKapsamStr ? OgretimTuru.YKS : undefined);
      if (alanTur && !turIzinliMi(alanTur)) {
        res.json({ basarili: true, veri: [], meta: { sayfa, boyut, toplam: 0, toplamSayfa: 0 } });
        return;
      }
      if (yksKapsamStr && !turFiltre && !turIzinliMi(OgretimTuru.YKS)) {
        res.json({ basarili: true, veri: [], meta: { sayfa, boyut, toplam: 0, toplamSayfa: 0 } });
        return;
      }
      if (dersStr && !ogretmenDersiUretebilirMi(ogrKisit, dersStr)) {
        res.json({ basarili: true, veri: [], meta: { sayfa, boyut, toplam: 0, toplamSayfa: 0 } });
        return;
      }
      const konuWhere = alanKonuWhere({
        ogretimTuru: turFiltre,
        yksKapsam: yksKapsamStr,
        ders: dersStr,
      });
      if (!turFiltre && !yksKapsamStr) konuWhere.ogretimTuru = { in: izinliTurler };
      if (!dersStr) konuWhere.ders = { in: ogrKisit.dersler };
      const alanKosul = soruAlanFiltreKosulu({
        konuWhere,
        aktifTur: alanTur,
        yksKapsamStr,
        platformTurleri: !turFiltre && !yksKapsamStr ? req.platformTurleri : undefined,
      });
      if (alanKosul) konuFiltre = alanKosul as Record<string, unknown>;
      else konuFiltre = undefined;
      if (req.kullanici?.userId) {
        ogretmenSoruKisiti = ogretmenKendiSorulariWhere(req.kullanici.userId);
      }
    } else {
      const platformTurleri = req.platformTurleri;
      const aktifTur = turFiltre ?? (yksKapsamStr ? OgretimTuru.YKS : undefined);

      const konuWhere = alanKonuWhere({
        ogretimTuru: aktifTur,
        yksKapsam: yksKapsamStr,
        ders: dersStr,
      });

      if (!aktifTur && platformTurleri) {
        konuWhere.ogretimTuru = { in: platformTurleri };
      }

      const alanKosul = soruAlanFiltreKosulu({
        konuWhere,
        aktifTur,
        yksKapsamStr,
        platformTurleri: !aktifTur ? platformTurleri : undefined,
      });
      konuFiltre = alanKosul as Record<string, unknown> | undefined;
    }

    const kosullar: Record<string, unknown>[] = [];
    if (ogretmenSoruKisiti) kosullar.push(ogretmenSoruKisiti);
    if (sinavId) kosullar.push({ sinavId: sinavId as string });
    if (typeof konuId === 'string' && konuId.length > 0) {
      kosullar.push(soruKonuFiltre(konuId));
    }
    if (zorluk) kosullar.push({ zorluk: zorluk as any });
    if (konuFiltre) kosullar.push(konuFiltre);
    if (onayFiltre) kosullar.push({ onayDurumu: onayFiltre });
    if (
      !ogrKisit &&
      typeof olusturanId === 'string' &&
      olusturanId.length > 0
    ) {
      kosullar.push({ olusturanId });
    }
    if (q) {
      kosullar.push({
        OR: [
          { metinHtml: { contains: q as string, mode: 'insensitive' as any } },
          { konu: { ad: { contains: q as string, mode: 'insensitive' as any } } },
          { kazanim: { contains: q as string, mode: 'insensitive' as any } },
        ],
      });
    }
    if (!ogrKisit) {
      const tarihFiltre = soruOlusturulduAraligi(baslangicTarihi, bitisTarihi);
      if (tarihFiltre.olusturuldu) kosullar.push(tarihFiltre);
    }
    const where = kosullar.length > 0 ? { AND: kosullar } : {};

    const [sorular, toplam] = await Promise.all([
      prisma.soru.findMany({
        where,
        skip: atla,
        take: boyut,
        include: {
          konu: { select: { id: true, ad: true, ders: true, ogretimTuru: true, yksSegment: true } },
          ekKonular: {
            include: { konu: { select: { id: true, ad: true, ders: true } } },
          },
          sinav: { select: { id: true, baslik: true, grup: { select: { id: true, ad: true } } } },
          duzenleyen: { select: soruKullaniciOzetSelect },
          olusturan: { select: soruKullaniciOzetSelect },
          ...soruUygunGrupInclude,
        },
        orderBy: [{ olusturuldu: 'desc' }],
      }),
      prisma.soru.count({ where }),
    ]);

    res.json({ 
      basarili: true, 
      veri: sorular,
      meta: {
        sayfa,
        boyut,
        toplam,
        toplamSayfa: Math.ceil(toplam / boyut)
      }
    });
  } catch (err) { next(err); }
});

/** Soru hazırlayan öğretmen / kullanıcı listesi (admin filtre) */
router.get('/hazirlayanlar', rolKontrol('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { baslangicTarihi, bitisTarihi, ogretimTuru, yksKapsam } = req.query;
    const tarihFiltre = soruOlusturulduAraligi(baslangicTarihi, bitisTarihi);
    const turFiltre =
      typeof ogretimTuru === 'string' && (Object.values(OgretimTuru) as string[]).includes(ogretimTuru)
        ? (ogretimTuru as OgretimTuru)
        : undefined;
    const yksKapsamStr = typeof yksKapsam === 'string' && yksKapsam.length > 0 ? yksKapsam : undefined;
    let konuKademeFiltre: Record<string, unknown> | undefined;
    if (turFiltre || yksKapsamStr) {
      konuKademeFiltre = soruKonuMetaFiltre(
        alanKonuWhere({ ogretimTuru: turFiltre, yksKapsam: yksKapsamStr }),
      );
    }
    const where = {
      olusturanId: { not: null },
      ...tarihFiltre,
      ...(konuKademeFiltre ? konuKademeFiltre : {}),
    };

    const gruplar = await prisma.soru.groupBy({
      by: ['olusturanId'],
      where,
      _count: { _all: true },
      _max: { olusturuldu: true },
    });
    const ids = gruplar
      .map((g) => g.olusturanId)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      res.json({ basarili: true, veri: [] });
      return;
    }
    const kullanicilar = await prisma.kullanici.findMany({
      where: { id: { in: ids } },
      select: soruKullaniciOzetSelect,
    });
    const sayMap = new Map(gruplar.map((g) => [g.olusturanId!, g._count._all]));
    const veri = kullanicilar
      .map((k) => ({
        id: k.id,
        ad: kullaniciGorunenAd(k) || k.email,
        soruSayisi: sayMap.get(k.id) ?? 0,
        sonSoruTarihi: gruplar.find((g) => g.olusturanId === k.id)?._max.olusturuldu ?? null,
      }))
      .sort((a, b) => b.soruSayisi - a.soruSayisi || a.ad.localeCompare(b.ad, 'tr'));
    res.json({ basarili: true, veri });
  } catch (err) { next(err); }
});

router.get('/konular', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ogretimTuru, yksKapsam, yksSegment, ders, uniteAdi, kpssKapsam } = req.query;
    const turFiltreRaw =
      typeof ogretimTuru === 'string' && (Object.values(OgretimTuru) as string[]).includes(ogretimTuru)
        ? (ogretimTuru as OgretimTuru)
        : undefined;
    const turFiltre = turFiltreRaw;

    const yksSegTek =
      typeof yksSegment === 'string' &&
      (Object.values(YksKonuSegmenti) as string[]).includes(yksSegment)
        ? (yksSegment as YksKonuSegmenti)
        : undefined;

    let yksSegmentFiltre:
      | YksKonuSegmenti
      | { in: YksKonuSegmenti[] }
      | { not: YksKonuSegmenti }
      | null
      | undefined;
    if (yksSegTek) {
      yksSegmentFiltre = yksSegTek;
    } else if (typeof yksKapsam === 'string') {
      if (yksKapsam === 'TYT') yksSegmentFiltre = YksKonuSegmenti.TYT;
      /*
       * AYT: `IN (...)` Postgres’te listede OLMAYAN enum etiketi varsa / sunucular arası uyumsuzluk
       * tüm çağrıyı kırabilir veya eksik liste dönmeye yol açar. TYT dışındaki segmentler = AYT içeriği
       * (bu projede başka öğretim türünde böyle kullanılmıyor).
       */
      else if (yksKapsam === 'AYT') yksSegmentFiltre = { not: YksKonuSegmenti.TYT };
    }

    // TEACHER kısıtı — branş + kademe
    const ogrKisit = await reqOgretmenKisit(req);
    const ogretmenOgretimTuru = ogrKisit?.ogretimTuru;
    /** TYT/AYT kapsamı = sınav şablonu / tam müfredat listesi; branşla daraltma SB-2 vb. blokları düşürür */
    const yksKapsamTamListe =
      typeof yksKapsam === 'string' && (yksKapsam === 'TYT' || yksKapsam === 'AYT');
    let dersFiltre: { in: string[] } | string | undefined;
    if (typeof ders === 'string' && ders.length > 0) {
      if (ogrKisit && !ogretmenDersiUretebilirMi(ogrKisit, ders)) {
        // İzinsiz ders — boş döndür
        res.json({ basarili: true, veri: [] });
        return;
      }
      dersFiltre = ders;
    } else if (ogrKisit && !yksKapsamTamListe) {
      dersFiltre = { in: ogrKisit.dersler };
    }

    const aytKapsamYksVarsayilan =
      typeof yksKapsam === 'string' &&
      yksKapsam === 'AYT' &&
      !turFiltre &&
      !ogretmenOgretimTuru;

    let kpssUniteFiltre: string | undefined;
    if (typeof kpssKapsam === 'string' && turFiltre && kpssOgretimTuruMu(turFiltre)) {
      if (kpssKapsam === 'GY') kpssUniteFiltre = 'Genel Yetenek';
      else if (kpssKapsam === 'GK') kpssUniteFiltre = 'Genel Kültür';
    }

    const konuWhereTemel = {
      ...(turFiltre
        ? { ogretimTuru: ogretimTuruPrismaFiltre(turFiltre) }
        : ogretmenOgretimTuru
          ? { ogretimTuru: ogretimTuruPrismaFiltre(ogretmenOgretimTuru) }
          : !turFiltre && req.platformTurleri?.length
            ? { ogretimTuru: { in: req.platformTurleri } }
            : {}),
      ...(aytKapsamYksVarsayilan ? { ogretimTuru: OgretimTuru.YKS } : {}),
      ...(dersFiltre !== undefined ? { ders: dersFiltre as any } : {}),
      ...(typeof uniteAdi === 'string' && uniteAdi.length > 0 ? { uniteAdi } : {}),
      ...(kpssUniteFiltre ? { uniteAdi: kpssUniteFiltre } : {}),
    };

    const konular = await prisma.konu.findMany({
      where: {
        ...konuWhereTemel,
        ...(yksSegmentFiltre !== undefined ? { yksSegment: yksSegmentFiltre } : {}),
      },
      orderBy: [{ ders: 'asc' }, { uniteAdi: 'asc' }, { ad: 'asc' }],
    });
    res.json({ basarili: true, veri: konular });
  } catch (err) { next(err); }
});

router.delete('/:id', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const ogrKisit = await reqOgretmenKisit(req);
    if (ogrKisit) {
      const soru = await prisma.soru.findUnique({
        where: { id },
        select: {
          olusturanId: true,
          duzenleyenId: true,
          konu: { select: { ders: true, ogretimTuru: true } },
        },
      });
      if (!soru) { res.status(404).json({ basarili: false, mesaj: 'Soru bulunamadı' }); return; }
      const izin = await ogretmenSoruIslemIzni(req, soru);
      if (!izin.ok) {
        res.status(izin.status).json({ basarili: false, mesaj: izin.mesaj });
        return;
      }
    }
    await prisma.$transaction([
      prisma.ogrenciCevap.deleteMany({ where: { soruId: id } }),
      prisma.soru.delete({ where: { id } })
    ]);
    res.json({ basarili: true, mesaj: 'Soru silindi' });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const soru = await prisma.soru.findUnique({
      where: { id: req.params.id },
      include: { konu: true },
    });
    if (!soru) { res.status(404).json({ basarili: false, mesaj: 'Soru bulunamadı' }); return; }
    const izin = await ogretmenSoruIslemIzni(req, {
      olusturanId: soru.olusturanId,
      duzenleyenId: soru.duzenleyenId,
      onayDurumu: soru.onayDurumu,
      konu: soru.konu,
    });
    if (!izin.ok) {
      res.status(izin.status).json({ basarili: false, mesaj: izin.mesaj });
      return;
    }
    res.json({ basarili: true, veri: soru });
  } catch (err) { next(err); }
});

export default router;
