import { Response, NextFunction } from 'express';
import { KullaniciAktiviteTuru, Prisma } from '@prisma/client';
import { aktiviteKaydet } from '../services/kullaniciAktivite.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { soruUret, ogrenciAnalizOlustur, studyPlanOlustur, studyPlanNormalize, soruDuzeltKomutu, openrouterChat, modelSec, soruGorselUretVeYukle } from '../services/ai.service';
import { hataAciklaUret } from '../services/hataAcikla.service';
import { ogrenciAnalizGetir } from '../services/analiz.service';
import { aiSoruKaliteIsleme } from '../services/soruAiKalite';
import { soruUretimGarantiKatmani } from '../services/soruGarantiKatmani';
import { validateUretilenSoruListesi } from '../utils/soruUretimDogrulama';
import { buildMetinHtmlFromParts, cozumMetniniHtmlYap } from '../utils/soruMetinBirlestir';
import { reqOgretmenKisit, ogretmenKonuUretebilirMi } from '../services/ogretmenSinirlama';
import { metinSesUret } from '../services/tts.service';
import { ogretmenTalimatKirp } from '../constants/ogretmenTalimat';
import {
  veoAktifMi,
  veoModelSlug,
  veoPromptOlustur,
  veoVideoBaslat,
  veoVideoDurum,
  veoVideoBufferGetir,
} from '../services/veoVideo.service';

export async function soruUretController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { konuId, sayi, zorluk, sinavId, gorselMod, modelOverride, ogretmenTalimat } = req.body;
    const konu = await prisma.konu.findUnique({ where: { id: konuId } });
    if (!konu) { res.status(404).json({ basarili: false, mesaj: 'Konu bulunamadı' }); return; }

    const ogrKisit = await reqOgretmenKisit(req);
    if (ogrKisit && !ogretmenKonuUretebilirMi(ogrKisit, konu)) {
      res.status(403).json({ basarili: false, mesaj: 'Bu branş veya kademe için soru üretme yetkiniz yok.' });
      return;
    }

    const { sorular, kullanılanModel, kullanilanKaynaklar } = await soruUret({
      konu: konu.ad,
      ders: konu.ders,
      konuId: konu.id,
      sayi: sayi || 5,
      zorluk,
      modelOverride,
      gorselMod,
      ogretmenTalimat: ogretmenTalimatKirp(ogretmenTalimat),
      uniteAdi: konu.uniteAdi ?? undefined,
      yksSegment: konu.yksSegment ?? undefined,
      ogretimTuru: konu.ogretimTuru,
    });

    const ham = sorular.map((s) => ({
      metin: s.metin,
      svgGorsel: s.svgGorsel,
      secenekler: s.secenekler,
      dogruCevap: s.dogruCevap,
      kazanim: s.kazanim,
    }));
    const secenekSayisi = konu.ogretimTuru === 'LGS' ? 4 : 5;
    const dogr = validateUretilenSoruListesi(ham, { secenekSayisi });
    if (!dogr.ok) {
      res.status(422).json({
        basarili: false,
        mesaj:
          'Üretilen sorular doğrulamadan geçmedi (şıklar, doğru cevap veya soru kökü eksik/hatalı). Tekrar deneyin.',
        hatalar: dogr.hatalar,
      });
      return;
    }

    const garanti = await soruUretimGarantiKatmani(dogr.sorular, konu.ders, {
      // Tüm alanlarda iki bağımsız modelle çapraz çözüm uygula.
      // Sözel sorularda da yanlış cevap üretimi gözlendi; sıkı doğrulamayı her zaman aç.
      sikiDogrulama: true,
      hataYerineDuzelt: true,
    });
    const sonSorular = garanti.sorular;

    const kaliteGirdi = sonSorular.map((d, i) => ({
      metin: sorular[i].metin,
      svgGorsel: sorular[i].svgGorsel,
      secenekler: d.secenekler,
      dogruCevap: d.dogruCevap,
    }));
    const kalite = await aiSoruKaliteIsleme(konu.id, konu.ders, kaliteGirdi, garanti.garantiMeta);

    const zenginSorular = sonSorular.map((d, i) => {
      const s = sorular[i];
      const soruGovde = s.svgGorsel
        ? `${s.metin}<div class="soru-svg-gorsel">${s.svgGorsel}</div>`
        : s.metin;
      const cozumHtml = cozumMetniniHtmlYap(String(s.cozumAciklamasi || ''));
      const metinHtml = buildMetinHtmlFromParts(soruGovde, '', cozumHtml);
      const aiMetaHam = kalite.sorularMeta[i] as Record<string, unknown> | undefined;
      const aiMetaBirlesik = {
        ...(aiMetaHam || {}),
        ...(s.cozumAciklamasi ? { cozumAciklamasi: s.cozumAciklamasi } : {}),
      };

      return {
        id: `temp-${i}-${Date.now()}`,
        konuId,
        sinavId: sinavId || null,
        siraNo: i + 1,
        metinHtml,
        gorselUrl: s.gorselUrl || null,
        secenekler: d.secenekler as Record<string, string>,
        dogruCevap: d.dogruCevap,
        zorluk: zorluk || 'ORTA',
        kazanim: s.kazanim,
        aiUretildi: true,
        aiModeli: kullanılanModel.model,
        onayDurumu: kalite.onayDurumu,
        aiMeta: aiMetaBirlesik,
        metin: s.metin,
        svgGorsel: s.svgGorsel,
        cozumAciklamasi: s.cozumAciklamasi,
      };
    });

    if (req.kullanici?.userId && zenginSorular.length > 0) {
      void aktiviteKaydet({
        kullaniciId: req.kullanici.userId,
        tur: KullaniciAktiviteTuru.AI_SORU_URET,
        aciklama: `${zenginSorular.length} soru AI ile önizlendi`,
        meta: { adet: zenginSorular.length, model: kullanılanModel.model, konuId },
      });
    }

    res.status(201).json({
      basarili: true,
      veri: { sorular: zenginSorular, kullanılanModel, kullanilanKaynaklar: kullanilanKaynaklar || [] },
    });
  } catch (err) { next(err); }
}

/** POST /ai/sorular/:id/yardim — öğretmenin komutuyla soruyu düzenle */
export async function soruAiYardimController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { komut, gecmis, hedefKazanim, mevcutDurum } = req.body || {};
    if (!komut || String(komut).trim().length < 2) {
      res.status(400).json({ basarili: false, mesaj: 'Komut boş olamaz.' });
      return;
    }
    const soru = await prisma.soru.findUnique({
      where: { id },
      include: { konu: true },
    });
    if (!soru) { res.status(404).json({ basarili: false, mesaj: 'Soru bulunamadı' }); return; }

    const formDurum =
      mevcutDurum && typeof mevcutDurum === 'object'
        ? (mevcutDurum as {
            metinHtml?: string;
            secenekler?: Record<string, string>;
            dogruCevap?: string;
            kazanim?: string | null;
            zorluk?: string;
          })
        : null;

    const sonuc = await soruDuzeltKomutu({
      soru: {
        metinHtml: typeof formDurum?.metinHtml === 'string' ? formDurum.metinHtml : soru.metinHtml,
        secenekler: (formDurum?.secenekler as Record<string, string>) || (soru.secenekler as Record<string, string>),
        dogruCevap: formDurum?.dogruCevap || soru.dogruCevap,
        kazanim: formDurum?.kazanim ?? soru.kazanim,
        zorluk: formDurum?.zorluk || soru.zorluk,
        ders: soru.konu?.ders,
        konu: soru.konu?.ad,
      },
      komut: String(komut),
      gecmis: Array.isArray(gecmis) ? gecmis : [],
      hedefKazanim: hedefKazanim ? String(hedefKazanim) : undefined,
    });

    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

/** POST /ai/gorsel-uret — öğretmen promptundan soru görseli üretir (DALL·E-3 + kalıcı depolama) */
export async function soruGorselUretController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prompt, ders, konu, kalite } = req.body || {};
    if (!prompt || String(prompt).trim().length < 3) {
      res.status(400).json({ basarili: false, mesaj: 'Görsel için en az birkaç kelimelik bir açıklama yazın.' });
      return;
    }
    const sonuc = await soruGorselUretVeYukle(String(prompt), {
      ders: ders ? String(ders) : undefined,
      konu: konu ? String(konu) : undefined,
      kalite: kalite === 'hd' ? 'hd' : 'standard',
    });
    if (!sonuc) {
      res.status(502).json({
        basarili: false,
        mesaj: 'Görsel üretilemedi. Görsel üretimi için API anahtarı yapılandırılmamış olabilir; lütfen tekrar deneyin.',
      });
      return;
    }
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function analizYapController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }

    const performans = await ogrenciAnalizGetir(profil.id, req.isKpssPlatform ? 'kpss' : 'yks') as any;
    const aiAnaliz = await ogrenciAnalizOlustur({
      ogrenciAd: `${profil.ad} ${profil.soyad}`,
      zayifKonular: performans.zayifKonular,
      dersPerformanslari: performans.dersPerformanslari,
      ortalamaNe: performans.ortalamaNe,
      platform: req.isKpssPlatform ? 'kpss' : 'yks',
    });

    await prisma.aIAnaliz.create({
      data: {
        ogrenciId: profil.id,
        analizTipi: 'GENEL',
        icerik: performans as object,
        oneriler: aiAnaliz as object,
      },
    });

    res.json({ basarili: true, veri: { performans, aiAnaliz } });
  } catch (err) { next(err); }
}

export async function studyPlanOlusturController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }

    const performans = await ogrenciAnalizGetir(profil.id, req.isKpssPlatform ? 'kpss' : 'yks') as { zayifKonular?: Array<{ konu: string; ders: string; basari: number }> };
    const zayifKonular = Array.isArray(performans?.zayifKonular) ? performans.zayifKonular : [];
    const plan = await studyPlanOlustur({
      ogrenci: profil,
      zayifKonular,
      hedefUniversite: profil.hedefUniversite,
      platform: req.isKpssPlatform ? 'kpss' : 'yks',
    });
    const normalizePlan = studyPlanNormalize(plan, zayifKonular);

    const kaydedilenPlan = await prisma.studyPlan.create({
      data: {
        ogrenciId: profil.id,
        baslik: normalizePlan.baslik,
        baslangic: new Date(),
        bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        hedefler: normalizePlan.hedefler as object,
        aiUretildi: true,
        gorevler: {
          createMany: {
            data: normalizePlan.gorevler.map((g) => ({
              baslik: g.baslik,
              ders: g.ders,
              konu: g.konu,
              sureDakika: g.sureDakika,
              gun: g.gun,
            })),
          },
        },
      },
      include: { gorevler: true },
    });

    res.status(201).json({ basarili: true, veri: kaydedilenPlan });
  } catch (err) { next(err); }
}

export async function oneriGetirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }

    const performans = await ogrenciAnalizGetir(profil.id) as any;
    const zayifDersler = (performans.dersPerformanslari || [])
      .filter((d: { ortalama: number }) => d.ortalama < 60)
      .map((d: { ders: string }) => d.ders);

    const oneriler = await prisma.oneri.findMany({
      where: { ogrenciId: profil.id },
      include: { ogretmen: true, kurs: true },
      orderBy: { oncelik: 'asc' },
      take: 10,
    });

    const yeniOneriler = await prisma.ogretmen.findMany({
      where: { ders: { in: zayifDersler } },
      take: 5,
    });

    res.json({ basarili: true, veri: { oneriler, yeniOneriler, zayifDersler } });
  } catch (err) { next(err); }
}

/** POST /ai/hata-acikla — öğrenci yanlış/boş sorusu için kısa açıklama */
export async function hataAciklaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }

    const { katilimId, soruId } = req.body as { katilimId?: unknown; soruId?: unknown };
    if (typeof katilimId !== 'string' || !katilimId.trim()) {
      res.status(400).json({ basarili: false, mesaj: 'katilimId gerekli' }); return;
    }
    if (typeof soruId !== 'string' || !soruId.trim()) {
      res.status(400).json({ basarili: false, mesaj: 'soruId gerekli' }); return;
    }

    const katilim = await prisma.sinavKatilim.findUnique({
      where: { id: katilimId.trim() },
      include: {
        sinav: { select: { baslik: true, tur: true } },
        cevaplar: {
          where: { soruId: soruId.trim() },
          include: { soru: { include: { konu: true } } },
          take: 1,
        },
      },
    });
    if (!katilim || katilim.ogrenciId !== profil.id) {
      res.status(404).json({ basarili: false, mesaj: 'Katılım bulunamadı' }); return;
    }
    const cevap = katilim.cevaplar?.[0];
    if (!cevap) {
      res.status(404).json({ basarili: false, mesaj: 'Bu soru için cevap kaydı bulunamadı' }); return;
    }

    const soru = cevap.soru as any;
    const secenekler = (soru?.secenekler || {}) as Record<string, string>;
    const secilen = cevap.secilen ? String(cevap.secilen).toUpperCase() : null;
    const dogru = String(soru?.dogruCevap || '').toUpperCase();
    const ders = String(soru?.konu?.ders || '');
    const konu = String(soru?.konu?.ad || '');
    const kazanim = typeof soru?.kazanim === 'string' ? soru.kazanim : '';

    const veri = await hataAciklaUret({
      ders,
      konu,
      kazanim,
      sinavBaslik: katilim.sinav?.baslik || '',
      sinavTur: String(katilim.sinav?.tur || ''),
      soru,
      secenekler,
      dogru,
      secilen,
    });

    res.json({ basarili: true, veri });
  } catch (err) { next(err); }
}

/** POST /ai/tts — doğal Türkçe ses (Edge Neural TTS) */
export async function ttsController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { metin } = req.body as { metin?: unknown };
    if (typeof metin !== 'string' || !metin.trim()) {
      res.status(400).json({ basarili: false, mesaj: 'metin gerekli' });
      return;
    }
    if (metin.length > 800) {
      res.status(400).json({ basarili: false, mesaj: 'Metin çok uzun (max 800 karakter)' });
      return;
    }

    const buffer = await metinSesUret(metin);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/** GET /ai/veo-video/aktif — Veo yapılandırması var mı */
export async function veoAktifController(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ basarili: true, veri: { aktif: veoAktifMi(), model: veoModelSlug() } });
}

/** POST /ai/veo-video — OpenRouter üzerinden Veo ile sinematik çözüm videosu başlat */
export async function veoVideoBaslatController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!veoAktifMi()) {
      res.status(503).json({
        basarili: false,
        mesaj: 'Veo video yapılandırılmamış. backend/.env dosyasına OPENROUTER_API_KEY ekleyin.',
      });
      return;
    }

    const profil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }

    const { katilimId, soruId } = req.body as { katilimId?: unknown; soruId?: unknown };
    if (typeof katilimId !== 'string' || typeof soruId !== 'string') {
      res.status(400).json({ basarili: false, mesaj: 'katilimId ve soruId gerekli' });
      return;
    }

    const katilim = await prisma.sinavKatilim.findUnique({
      where: { id: katilimId.trim() },
      include: {
        sinav: { select: { baslik: true, tur: true } },
        cevaplar: {
          where: { soruId: soruId.trim() },
          include: { soru: { include: { konu: true } } },
          take: 1,
        },
      },
    });
    if (!katilim || katilim.ogrenciId !== profil.id) {
      res.status(404).json({ basarili: false, mesaj: 'Katılım bulunamadı' });
      return;
    }
    const cevap = katilim.cevaplar?.[0];
    if (!cevap) {
      res.status(404).json({ basarili: false, mesaj: 'Cevap bulunamadı' });
      return;
    }

    const soru = cevap.soru as { metinHtml?: string; konu?: { ders?: string; ad?: string }; kazanim?: string };
    const ders = String(soru?.konu?.ders || 'Matematik');
    const konu = String(soru?.konu?.ad || '');
    const soruOzet = String(soru?.metinHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const aciklama = await hataAciklaUret({
      ders,
      konu,
      kazanim: typeof soru?.kazanim === 'string' ? soru.kazanim : '',
      sinavBaslik: katilim.sinav?.baslik || '',
      sinavTur: String(katilim.sinav?.tur || ''),
      soru,
      secenekler: (soru as { secenekler?: Record<string, string> }).secenekler || {},
      dogru: String((soru as { dogruCevap?: string }).dogruCevap || ''),
      secilen: cevap.secilen ? String(cevap.secilen).toUpperCase() : null,
    });

    const prompt = veoPromptOlustur({ ders, konu, soruOzet, aciklama });
    const sonuc = await veoVideoBaslat(prompt);

    res.json({
      basarili: true,
      veri: {
        islemId: sonuc.islemId,
        model: sonuc.model,
        tahminiSureSn: sonuc.tahminiSureSn,
        mesaj: 'OpenRouter Veo video üretimi başladı. Bu işlem 1-3 dakika sürebilir.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /ai/veo-video/:islemId/durum */
export async function veoVideoDurumController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { islemId } = req.params;
    if (!islemId) {
      res.status(400).json({ basarili: false, mesaj: 'islemId gerekli' });
      return;
    }
    const durum = await veoVideoDurum(islemId);
    res.json({ basarili: true, veri: durum });
  } catch (err) {
    next(err);
  }
}

/** GET /ai/veo-video/:islemId/indir */
export async function veoVideoIndirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { islemId } = req.params;
    const buffer = veoVideoBufferGetir(islemId);
    if (!buffer) {
      res.status(404).json({ basarili: false, mesaj: 'Video henüz hazır değil' });
      return;
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="wingo-veo-${islemId}.mp4"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
