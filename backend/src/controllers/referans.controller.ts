import { Prisma } from '@prisma/client';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import {
  referansAnalize,
  referansTextAnalize,
  referansTabanliSoruUret,
  ReferansAnalizi,
  referansAnaliziNormalize,
  referansAnaliziDersZenginlestir,
  referansKaynakAdindanDersTahmin,
  referansGorselGerekliMi,
  referansEfektifGorselMod,
} from '../services/referans.service';
import { aiSoruKaliteIsleme } from '../services/soruAiKalite';
import { soruUretimGarantiKatmani } from '../services/soruGarantiKatmani';
import { logger } from '../utils/logger';
import { ensureGrupBankaSinavi } from '../utils/grupBankaSinavi';
import { buildMetinHtmlFromParts, cozumMetniniHtmlYap } from '../utils/soruMetinBirlestir';
import { reqOgretmenKisit, ogretmenDersiUretebilirMi, OgretmenKisit } from '../services/ogretmenSinirlama';
import { validateUretilenSoruListesi } from '../utils/soruUretimDogrulama';
import { urlDenMetinCikar } from '../services/rag.service';

function ogretmenReferansUretimIzni(
  kisit: OgretmenKisit,
  analizHam: ReferansAnalizi,
  kaynakAdi?: string
): { izin: boolean; analiz: ReferansAnalizi } {
  let analiz = referansAnaliziDersZenginlestir(referansAnaliziNormalize(analizHam), kaynakAdi);

  if (ogretmenDersiUretebilirMi(kisit, analiz.dersAdi)) {
    return { izin: true, analiz };
  }

  const kaynakDers = kaynakAdi ? referansKaynakAdindanDersTahmin(kaynakAdi) : null;
  if (kaynakDers && ogretmenDersiUretebilirMi(kisit, kaynakDers)) {
    return { izin: true, analiz: { ...analiz, dersAdi: kaynakDers } };
  }

  const metin = [
    ...(analiz.konular || []),
    ...(analiz.referans_sorular || []).map((r) => r.ozet),
    analiz.formatNotu || '',
  ]
    .join(' ')
    .toLowerCase();

  const eslesenDers = kisit.dersler.find((d) => metin.includes(d.toLowerCase()));
  if (eslesenDers) {
    return { izin: true, analiz: { ...analiz, dersAdi: eslesenDers } };
  }

  /** Matematik öğretmeni geometri görselli referans üretebilsin */
  if (kisit.dersler.includes('Geometri') && referansGorselGerekliMi(analiz)) {
    return { izin: true, analiz: { ...analiz, dersAdi: 'Geometri' } };
  }

  if (/geometri|üçgen|ucgen|açı|aci|çember|sekil|şekil|orta nokta|alan|hacim/i.test(metin)) {
    if (kisit.dersler.includes('Geometri')) {
      return { izin: true, analiz: { ...analiz, dersAdi: 'Geometri' } };
    }
  }

  return { izin: false, analiz };
}

/**
 * ADIM 1 — Dosya yükle ve analiz et
 * POST /api/v1/referans/analiz
 * multipart/form-data: file (PDF veya görsel)
 */
export async function referansAnalizController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info(`[Referans] Analiz isteği alındı — content-type: ${req.headers['content-type']}, body keys: ${Object.keys(req.body || {}).join(',') || 'BOŞ'}, file: ${req.file ? req.file.originalname : 'YOK'}`);

    const { kaynakUrl } = req.body || {};

    if (!req.file && !kaynakUrl) {
      logger.warn(`[Referans] 400 dönülüyor — req.file: ${!!req.file}, kaynakUrl: ${kaynakUrl}, body: ${JSON.stringify(req.body || {}).slice(0, 200)}`);
      res.status(400).json({ basarili: false, mesaj: 'Lütfen bir dosya yükleyin veya bir URL adresi girin.' });
      return;
    }

    if (req.file) {
      const izinliTurler = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!izinliTurler.includes(req.file.mimetype)) {
        res.status(400).json({
          basarili: false,
          mesaj: 'Sadece JPEG, PNG, WebP veya PDF yükleyebilirsiniz',
        });
        return;
      }

      logger.info(`[Referans] Analiz isteği — ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

      const analizHam = await referansAnalize(req.file.buffer, req.file.mimetype);
      const analiz = referansAnaliziDersZenginlestir(referansAnaliziNormalize(analizHam), req.file.originalname);

      res.json({
        basarili: true,
        veri: {
          analiz,
          dosyaAdi: req.file.originalname,
          boyutKB: Math.round(req.file.size / 1024),
          mimeTuru: req.file.mimetype,
        },
      });
    } else {
      logger.info(`[Referans] URL analiz isteği — ${kaynakUrl}`);
      // URL içeriğini çek (cheerio görsel & şık normalizer'ı ile)
      const text = await urlDenMetinCikar(kaynakUrl, null);
      // Metin referans analizi yap
      const analiz = await referansTextAnalize(text, kaynakUrl);
      const zengin = referansAnaliziDersZenginlestir(referansAnaliziNormalize(analiz), kaynakUrl);

      res.json({
        basarili: true,
        veri: {
          analiz: zengin,
          dosyaAdi: 'URL Kaynağı',
          boyutKB: Math.round(text.length / 1024),
          mimeTuru: 'text/html',
        },
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * ADIM 2 — Analiz sonucuna göre özgün soru üret
 * POST /api/v1/referans/soru-uret
 * body: { analiz, sayi, zorluk, gorselMod, konuId?, sinavId? }
 */
export async function referansSoruUretController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { analiz, sayi, zorluk, gorselMod, konuId, sinavId, grupId, tamVaryasyon, uretimTarzi, sikiDogrulama, kaynakAdi } = req.body as {
      analiz: ReferansAnalizi;
      sayi: number;
      zorluk?: string;
      gorselMod?: 'oto' | 'svg' | 'yok';
      konuId?: string;
      sinavId?: string;
      grupId?: string;
      /** PDF’de tespit edilen her soru için birer özgün varyasyon (varsayılan: true) */
      tamVaryasyon?: boolean;
      /** benzer: aynı kurgu; ozgun: farklı kurgu */
      uretimTarzi?: 'benzer' | 'ozgun';
      /** matematik/fen için bağımsız çözdürme ile sıkı doğrulama */
      sikiDogrulama?: boolean;
      /** Yüklenen dosya adı — ders tahmini düzeltmesi için */
      kaynakAdi?: string;
    };

    if (!analiz?.dersAdi) {
      res.status(400).json({ basarili: false, mesaj: 'Geçerli bir analiz verisi gönderilmedi' });
      return;
    }

    let analizIslenmis = referansAnaliziDersZenginlestir(referansAnaliziNormalize(analiz), kaynakAdi);
    const efektifGorselMod = referansEfektifGorselMod(analizIslenmis, gorselMod);

    const konu = konuId
      ? await prisma.konu.findUnique({ where: { id: konuId } })
      : null;

    if (konuId && !konu) {
      res.status(400).json({ basarili: false, mesaj: 'Konu bulunamadı' });
      return;
    }

    const ogrKisit = await reqOgretmenKisit(req);
    if (ogrKisit) {
      if (konu) {
        if (konu.ogretimTuru !== ogrKisit.ogretimTuru || !ogretmenDersiUretebilirMi(ogrKisit, konu.ders)) {
          res.status(403).json({ basarili: false, mesaj: 'Bu branş veya kademe için soru üretme yetkiniz yok.' });
          return;
        }
      } else {
        const { izin, analiz: zengin } = ogretmenReferansUretimIzni(ogrKisit, analizIslenmis, kaynakAdi);
        analizIslenmis = zengin;
        if (!izin) {
          res.status(403).json({
            basarili: false,
            mesaj: `Bu referans «${analizIslenmis.dersAdi}» olarak sınıflandı; ${ogrKisit.brans} branşınız (${ogrKisit.dersler.join(', ')}) için üretim yapılamaz. Matematik/Geometri görseli yüklediyseniz analizi yenileyin; listede konu varsa «Konuya Kaydet»ten seçin.`,
          });
          return;
        }
      }
    }

    if (konu) {
      // Konu seçiliyse (otomatik veya manuel), analizin hatalı ders/konu eşleşmesini her zaman ez!
      analizIslenmis = { 
        ...analizIslenmis, 
        dersAdi: konu.ders,
        konular: [konu.ad],
        ogretimTuru: konu.ogretimTuru
      };
      // Eğer konu Geometri değilse, referans_sorular içindeki "geometri/şekil" zorlamalarını temizle
      if (konu.ders !== 'Geometri' && analizIslenmis.referans_sorular) {
        analizIslenmis.referans_sorular = analizIslenmis.referans_sorular.map(r => ({
          ...r,
          ozet: r.ozet.replace(/geometri/gi, konu.ders).replace(/şekil türünde özgün varyasyon üret/gi, 'görseldeki konuya uygun özgün soru üret')
        }));
      }
    }

    const sorular = await referansTabanliSoruUret(analizIslenmis, {
      sayi: sayi || 5,
      zorluk,
      gorselMod: efektifGorselMod,
      konuId,
      tamVaryasyon: tamVaryasyon !== false,
      uretimTarzi,
    });

    const ham = sorular.map((s) => ({
      metin: s.metin,
      svgGorsel: s.svgGorsel,
      secenekler: s.secenekler,
      dogruCevap: s.dogruCevap,
      kazanim: s.kazanim,
    }));
    const secenekSayisi = analizIslenmis.ogretimTuru === 'LGS' ? 4 : 5;
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

    const dersGaranti = konu?.ders ?? analizIslenmis.dersAdi.split(',')[0].trim();
    const garanti = await soruUretimGarantiKatmani(dogr.sorular, dersGaranti, {
      referansVaryasyonu: true,
      sikiDogrulama: sikiDogrulama === true,
    });
    const sonSorular = garanti.sorular;

    let hedefSinavId: string | null = sinavId || null;
    if (!hedefSinavId && typeof grupId === 'string' && grupId.trim() !== '') {
      const bankaId = await ensureGrupBankaSinavi(grupId.trim());
      if (!bankaId) {
        res.status(404).json({ basarili: false, mesaj: 'Grup bulunamadı' });
        return;
      }
      hedefSinavId = bankaId;
    }

    const konuKayit = konu;
    const ders = konuKayit?.ders ?? analizIslenmis.dersAdi.split(',')[0].trim();

    const kaliteGirdi = sonSorular.map((d, i) => ({
      metin: sorular[i].metin,
      svgGorsel: sorular[i].svgGorsel,
      secenekler: d.secenekler,
      dogruCevap: d.dogruCevap,
    }));
    const kalite = await aiSoruKaliteIsleme(konuId ?? null, ders, kaliteGirdi, garanti.garantiMeta, {
      referansVaryasyonu: true,
    });

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
        id: `temp-ref-${i}-${Date.now()}`,
        konuId,
        sinavId: hedefSinavId,
        siraNo: i + 1,
        metinHtml,
        secenekler: d.secenekler as Record<string, string>,
        dogruCevap: d.dogruCevap,
        zorluk: (zorluk || analizIslenmis.zorlukSeviyesi || 'ORTA') as 'KOLAY' | 'ORTA' | 'ZOR',
        kazanim: s.kazanim,
        aiUretildi: true,
        aiModeli: 'referans-tabanli',
        onayDurumu: kalite.onayDurumu,
        aiMeta: aiMetaBirlesik,
        metin: s.metin,
        svgGorsel: s.svgGorsel,
        cozumAciklamasi: s.cozumAciklamasi,
      };
    });

    res.status(201).json({
      basarili: true,
      veri: {
        sorular: zenginSorular,
        kaydedildi: !!konuId,
        kullanılanModel: { model: 'openrouter/referans', ad: 'Referans Tabanlı' },
        kalite: {
          onayDurumu: kalite.onayDurumu,
          sorularMeta: kalite.sorularMeta,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
