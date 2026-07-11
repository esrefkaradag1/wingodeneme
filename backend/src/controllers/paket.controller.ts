import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { bildirimGonder, ogrenciBildirimGonder, adminlereSiparisBildirimi } from '../services/bildirim.service';
import { iyzicoService } from '../services/iyzico.service';
import { publicApiBaseUrl } from '../utils/apiBaseUrl';
import { frontendBaseUrl, kpssFrontendBaseUrl } from '../utils/frontendBaseUrl';
import {
  iyzicoAdresBilgileri,
  iyzicoCokluSepetOlustur,
  iyzicoGrupEtiketi,
  iyzicoGrupSiparisleriniIptal,
  iyzicoGrupSiparisleriniTamamla,
  iyzicoTutarStr,
} from '../utils/iyzicoOdemeYardimci';
import { logger } from '../utils/logger';
import { fiyatYuvarla } from '../utils/fiyat';
import { AppHatasi } from '../middlewares/hata.middleware';
import { paketKategoriSlugDogrula } from './paketKategori.controller';
import { paketKategoriGrupSenkronla, paketSinavlariniGetir } from '../utils/paketSinavCozumle';
import {
  paketIciSinavSepetSatinAlimOlustur,
} from '../services/sinav-takvim.service';
import { sinavSepetFiyatAyarlariParse } from '../services/sinav-fiyat-kademe.service';
import { satinAlimPaketHaklariniUygula } from '../services/paket-erisim.service';
import { paketPlatformUyumlu, paketKpssMi } from '../utils/paketPlatformFiltre';

/** Sipariş içeriğinden (paket/sınav grubu) ödeme sonrası yönlenecek frontend adresini çözer */
async function siparisFrontendUrl(siparisId: string): Promise<string> {
  try {
    const siparis = await prisma.satinAlim.findUnique({
      where: { id: siparisId },
      select: {
        paket: { select: { ad: true, kategori: true } },
        sinav: { select: { grup: { select: { tur: true } } } },
      },
    });
    let isKpss = false;
    if (siparis?.paket) {
      isKpss = paketKpssMi(siparis.paket);
    } else if (siparis?.sinav?.grup?.tur) {
      isKpss = String(siparis.sinav.grup.tur).toUpperCase().startsWith('KPSS');
    }
    return isKpss ? kpssFrontendBaseUrl() : frontendBaseUrl();
  } catch {
    return frontendBaseUrl();
  }
}

function idListesi(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
}

function paketKademeAyarlariCoz(raw: Record<string, unknown>) {
  try {
    const ayarlar = sinavSepetFiyatAyarlariParse({
      aktif: raw.kademeliFiyatAktif === true,
      tekDenemeFiyati: raw.tekilSinavFiyati,
      kademeler: Array.isArray(raw.fiyatKademeleri) ? raw.fiyatKademeleri : [],
    });
    return {
      kademeliFiyatAktif: ayarlar.aktif,
      tekilSinavFiyati: ayarlar.tekDenemeFiyati > 0 ? ayarlar.tekDenemeFiyati : null,
      fiyatKademeleriJson: ayarlar.kademeler,
      kademeliFiyatlandirma: ayarlar,
    };
  } catch (err) {
    throw new AppHatasi(err instanceof Error ? err.message : 'Geçersiz kademeli fiyatlandırma', 400);
  }
}

export async function paketleriGetir(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const paketler = await prisma.paket.findMany({
      orderBy: { fiyat: 'asc' },
    });
    res.json({ basarili: true, veri: paketler });
  } catch (err) { next(err); }
}

export async function aktifPaketleriGetir(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const platformKey = req.isKpssPlatform ? 'kpss' : 'yks_lgs';
    const cacheKey = `paketler:aktif:v5:${platformKey}`;
    const cached = await cache.al(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
      res.json({ basarili: true, veri: cached });
      return;
    }

    const tumPaketler = await prisma.paket.findMany({
      where: { aktif: true },
      orderBy: { fiyat: 'asc' },
      select: {
        id: true,
        ad: true,
        aciklama: true,
        kategori: true,
        fiyat: true,
        indirimliFiyat: true,
        kademeliFiyatAktif: true,
        tekilSinavFiyati: true,
        fiyatKademeleriJson: true,
        sinavSayisi: true,
        ozellikler: true,
        ucretsizSinavIds: true,
        aktif: true,
        populer: true,
        disUrl: true,
        oneCikan: true,
      },
    });
    const paketler = tumPaketler.filter((p) =>
      paketPlatformUyumlu(p, req.isKpssPlatform === true),
    );
    await cache.yaz(cacheKey, paketler, 300);
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.json({ basarili: true, veri: paketler });
  } catch (err) { next(err); }
}

export async function aktifPaketDetayGetir(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const platformKey = req.isKpssPlatform ? 'kpss' : 'yks_lgs';
    const cacheKey = `paketler:aktif:${id}:v5:${platformKey}`;
    const cached = await cache.al(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
      res.json({ basarili: true, veri: cached });
      return;
    }
    const paket = await prisma.paket.findFirst({
      where: { id, aktif: true },
    });
    if (!paket) {
      res.status(404).json({ basarili: false, mesaj: 'Paket bulunamadı' });
      return;
    }
    if (!paketPlatformUyumlu(paket, req.isKpssPlatform === true)) {
      res.status(404).json({ basarili: false, mesaj: 'Paket bulunamadı' });
      return;
    }

    const simdi = new Date();
    const sinavlar = await paketSinavlariniGetir(paket);
    const ucretsizSet = new Set(paket.ucretsizSinavIds || []);
    const kademeliFiyatlandirma = sinavSepetFiyatAyarlariParse({
      aktif: paket.kademeliFiyatAktif,
      tekDenemeFiyati: paket.tekilSinavFiyati ?? 0,
      kademeler: Array.isArray(paket.fiyatKademeleriJson) ? paket.fiyatKademeleriJson : [],
    });

    const sinavVerisi = sinavlar.map((s) => {
      const gf =
        s.indirimliUcret != null && s.indirimliUcret > 0
          ? s.indirimliUcret
          : s.ucret != null && s.ucret > 0
            ? s.ucret
            : s.ucret === 0 || s.indirimliUcret === 0
              ? 0
              : null;
      return {
        id: s.id,
        baslik: s.baslik,
        aciklama: s.aciklama,
        tur: s.tur,
        grup: s.grup,
        baslangicZamani: s.baslangicZamani,
        bitisZamani: s.bitisZamani,
        sureDakika: s.sureDakika,
        ucret: s.ucret,
        indirimliUcret: s.indirimliUcret,
        gosterilenFiyat: gf,
        satinAlinabilir: s.satinAlinabilir,
        soruSayisi: s._count.sorular,
        durum:
          simdi < s.baslangicZamani ? 'YAKINDA' : simdi > s.bitisZamani ? 'BITTI' : 'AKTIF',
      };
    });

    const veri = {
      ...paket,
      sinavlar: sinavVerisi.filter((s) => !ucretsizSet.has(s.id)),
      ucretsizSinavlar: sinavVerisi
        .filter((s) => ucretsizSet.has(s.id))
        .map((s) => ({
          ...s,
          gosterilenFiyat: 0,
          ucretsiz: true,
          herkeseAcik: true,
        })),
      kademeliFiyatlandirma,
    };

    await cache.yaz(cacheKey, veri, 300);
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.json({ basarili: true, veri });
  } catch (err) { next(err); }
}

export async function paketOlustur(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, any>;
    const {
      ad, aciklama, kategori, fiyat, indirimliFiyat, sinavSayisi, ozellikler, aktif, populer,
      sinavIds, ucretsizSinavIds, grupIds, etiketler, disUrl, oneCikan,
    } = body;
    const cozulmusGrupIds = idListesi(grupIds);
    const fiyatAyarlari = paketKademeAyarlariCoz(body);
    const kategoriSlug = cozulmusGrupIds.length
      ? await paketKategoriGrupSenkronla(cozulmusGrupIds)
      : await paketKategoriSlugDogrula(kategori);
    const paket = await prisma.paket.create({
      data: {
        ad,
        aciklama,
        kategori: kategoriSlug,
        fiyat: fiyatYuvarla(fiyat),
        indirimliFiyat: indirimliFiyat != null && indirimliFiyat !== '' ? fiyatYuvarla(indirimliFiyat) : null,
        kademeliFiyatAktif: fiyatAyarlari.kademeliFiyatAktif,
        tekilSinavFiyati: fiyatAyarlari.tekilSinavFiyati,
        fiyatKademeleriJson: fiyatAyarlari.fiyatKademeleriJson as any,
        sinavSayisi: parseInt(sinavSayisi) || 0,
        ozellikler: ozellikler || [],
        sinavIds: idListesi(sinavIds),
        ucretsizSinavIds: idListesi(ucretsizSinavIds),
        grupIds: cozulmusGrupIds,
        etiketler: Array.isArray(etiketler) ? etiketler : [],
        disUrl: disUrl || null,
        oneCikan: oneCikan ?? false,
        aktif: aktif ?? true,
        populer: populer ?? false,
      },
    });
    await cache.siliModeliyle('paketler:aktif*');
    await cache.siliModeliyle('paket-kategorileri:*');
    res.status(201).json({ basarili: true, veri: paket });
  } catch (err) { next(err); }
}

export async function paketGuncelle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, any>;
    const {
      ad, aciklama, kategori, fiyat, indirimliFiyat, sinavSayisi, ozellikler, aktif, populer,
      sinavIds, ucretsizSinavIds, grupIds, etiketler, disUrl, oneCikan,
    } = body;
    const cozulmusGrupIds = grupIds !== undefined ? idListesi(grupIds) : undefined;
    const fiyatAyarlari = paketKademeAyarlariCoz(body);
    let kategoriSlug: string | undefined;
    if (cozulmusGrupIds !== undefined && cozulmusGrupIds.length > 0) {
      kategoriSlug = await paketKategoriGrupSenkronla(cozulmusGrupIds);
    } else if (kategori !== undefined) {
      kategoriSlug = await paketKategoriSlugDogrula(kategori);
    }
    const paket = await prisma.paket.update({
      where: { id },
      data: {
        ad,
        aciklama,
        ...(kategoriSlug !== undefined ? { kategori: kategoriSlug } : {}),
        fiyat: fiyatYuvarla(fiyat),
        indirimliFiyat: indirimliFiyat != null && indirimliFiyat !== '' ? fiyatYuvarla(indirimliFiyat) : null,
        kademeliFiyatAktif: fiyatAyarlari.kademeliFiyatAktif,
        tekilSinavFiyati: fiyatAyarlari.tekilSinavFiyati,
        fiyatKademeleriJson: fiyatAyarlari.fiyatKademeleriJson as any,
        sinavSayisi: parseInt(sinavSayisi) || 0,
        ozellikler: ozellikler || [],
        sinavIds: idListesi(sinavIds),
        ucretsizSinavIds: ucretsizSinavIds !== undefined ? idListesi(ucretsizSinavIds) : undefined,
        ...(cozulmusGrupIds !== undefined ? { grupIds: cozulmusGrupIds } : {}),
        etiketler: Array.isArray(etiketler) ? etiketler : [],
        disUrl: disUrl || null,
        oneCikan: oneCikan ?? false,
        aktif: aktif ?? true,
        populer: populer ?? false,
      },
    });
    await cache.siliModeliyle('paketler:aktif*');
    if (cozulmusGrupIds?.length) await cache.siliModeliyle('paket-kategorileri:*');
    res.json({ basarili: true, veri: paket });
  } catch (err) { next(err); }
}

export async function paketSil(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.paket.delete({ where: { id } });
    await cache.siliModeliyle('paketler:aktif*');
    res.json({ basarili: true, mesaj: 'Paket silindi' });
  } catch (err) { next(err); }
}

/** Giriş yapmış kullanıcı için aktif pakete sipariş talebi (beklemede) oluşturur */
export async function paketSatinAlimOlustur(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.kullanici?.id;
    if (!uid) {
      res.status(401).json({ basarili: false, mesaj: 'Oturum gerekli' });
      return;
    }
    const { paketId, notlar, odemeYontemi } = req.body as Record<string, unknown>;
    if (!paketId || typeof paketId !== 'string') {
      res.status(400).json({ basarili: false, mesaj: 'paketId gerekli' });
      return;
    }
    const paket = await prisma.paket.findFirst({
      where: { id: paketId.trim(), aktif: true },
    });
    if (!paket) {
      res.status(404).json({ basarili: false, mesaj: 'Paket bulunamadı veya satışta değil' });
      return;
    }
    if (!paketPlatformUyumlu(paket, req.isKpssPlatform === true)) {
      res.status(403).json({ basarili: false, mesaj: 'Bu paket bu platformda satışa açık değil' });
      return;
    }
    const fiyat =
      paket.indirimliFiyat != null && paket.indirimliFiyat > 0 ? paket.indirimliFiyat : paket.fiyat;
    const ref = `WEB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8)}`;

    const parcalar: string[] = ['Web satın alma talebi'];
    if (typeof odemeYontemi === 'string' && odemeYontemi.trim()) {
      parcalar.push(`Ödeme tercihi: ${odemeYontemi.trim()}`);
    }
    if (typeof notlar === 'string' && notlar.trim()) {
      parcalar.push(notlar.trim());
    }
    const notMetni = parcalar.join(' | ');

    const ucretsizPaket = fiyat <= 0;

    const olusturulan = await prisma.satinAlim.create({
      data: {
        kullaniciId: uid,
        paketId: paket.id,
        miktar: fiyat,
        toplamTutar: fiyat,
        durum: ucretsizPaket ? 'TAMAMLANDI' : 'BEKLEMEDE',
        odemeZamani: ucretsizPaket ? new Date() : null,
        odemeMetodu: ucretsizPaket ? 'UCRETSIZ' : undefined,
        referansNo: ref,
        notlar: ucretsizPaket ? `${notMetni} | Ücretsiz paket — otomatik tanımlandı` : notMetni,
      },
      include: {
        paket: { select: { id: true, ad: true, sinavSayisi: true, fiyat: true, indirimliFiyat: true } },
        kullanici: { include: { ogrenciProfil: true, veliProfil: true, adminProfil: true } },
      },
    });

    // Ücretsiz paket: ödeme beklemeden erişimi hemen tanımla ve bitir.
    if (ucretsizPaket) {
      await satinAlimPaketHaklariniUygula(olusturulan.id);
      await ogrenciBildirimGonder({
        kullaniciId: uid,
        baslik: 'Ücretsiz paketiniz tanımlandı',
        mesaj: `«${paket.ad}» paketi hesabınıza ücretsiz tanımlandı. Denemelere hemen erişebilirsiniz.`,
        tur: 'siparis_onaylandi',
        veriJson: { siparisId: olusturulan.id },
      });
      await adminlereSiparisBildirimi({
        siparisId: olusturulan.id,
        kullaniciId: uid,
        kullanici: olusturulan.kullanici,
        urunAd: paket.ad,
        tutar: fiyat,
        ucretsiz: true,
        paketMi: true,
      });
      res.status(201).json({ basarili: true, veri: { ...olusturulan, ucretsiz: true } });
      return;
    }

    // Kredi kartı ödemesi ise Iyzico başlat
    if (odemeYontemi === 'KREDI_KARTI') {
      try {
        const adres = iyzicoAdresBilgileri(uid, olusturulan.kullanici, req);

        const efektifFiyat = fiyatYuvarla(fiyat);
        const iyzicoYanit = await iyzicoService.checkoutFormInitialize({
          conversationId: olusturulan.id,
          price: iyzicoTutarStr(efektifFiyat),
          paidPrice: iyzicoTutarStr(efektifFiyat),
          basketId: olusturulan.id,
          paymentGroup: 'PRODUCT',
          callbackUrl: `${publicApiBaseUrl()}/paketler/iyzico/callback`,
          ...adres,
          basketItems: [{
            id: paket.id,
            name: paket.ad,
            category1: 'Eğitim',
            itemType: 'VIRTUAL',
            price: iyzicoTutarStr(efektifFiyat),
          }],
        });

        if (iyzicoYanit.status === 'success') {
          res.status(201).json({ 
            basarili: true, 
            veri: { 
              ...olusturulan, 
              checkoutFormContent: iyzicoYanit.checkoutFormContent,
              paymentPageUrl: iyzicoYanit.paymentPageUrl,
              token: iyzicoYanit.token
            } 
          });
          return;
        } else {
          logger.error('Iyzico Başlatma Hatası:', iyzicoYanit.errorMessage);
          res.status(400).json({ basarili: false, mesaj: iyzicoYanit.errorMessage || 'Ödeme başlatılamadı' });
          return;
        }
      } catch (err) {
        logger.error('Iyzico Callback Hatası:', err);
        res.status(500).json({ basarili: false, mesaj: 'Ödeme servisi hatası' });
        return;
      }
    }

    await ogrenciBildirimGonder({
      kullaniciId: uid,
      baslik: 'Sipariş kaydınız oluşturuldu',
      mesaj: `«${paket.ad}» için siparişiniz alındı. Ödeme onayından sonra erişiminiz açılacaktır.`,
      tur: 'siparis_beklemede',
      veriJson: { siparisId: olusturulan.id },
    });
    await adminlereSiparisBildirimi({
      siparisId: olusturulan.id,
      kullaniciId: uid,
      kullanici: olusturulan.kullanici,
      urunAd: paket.ad,
      tutar: fiyat,
      paketMi: true,
    });

    res.status(201).json({ basarili: true, veri: olusturulan });
  } catch (err) {
    next(err);
  }
}

export async function paketIciSinavSatinAlimOlustur(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.kullanici?.id;
    if (!uid) {
      res.status(401).json({ basarili: false, mesaj: 'Oturum gerekli' });
      return;
    }

    const sinavIds = Array.isArray(req.body?.sinavIds) ? req.body.sinavIds : [];
    const notlar = typeof req.body?.notlar === 'string' ? req.body.notlar : undefined;
    const odemeYontemi = typeof req.body?.odemeYontemi === 'string' ? req.body.odemeYontemi : undefined;
    const sonuc = await paketIciSinavSepetSatinAlimOlustur(uid, req.params.id, sinavIds, notlar);

    // Ücretsiz denemeler serviste zaten TAMAMLANDI olarak tanımlandı; yalnızca ücretli olanlar ödemeye gider.
    const odemeliSiparisler = sonuc.olusturulan.filter((s) => (s.miktar || 0) > 0);
    const ucretsizAdet = sonuc.olusturulan.length - odemeliSiparisler.length;

    if (odemeYontemi === 'KREDI_KARTI' && odemeliSiparisler.length > 0) {
      try {
        const anaSiparis = odemeliSiparisler[0];
        const grupEtiketi = iyzicoGrupEtiketi(anaSiparis.id);

        await Promise.all(
          odemeliSiparisler.map((siparis) =>
            prisma.satinAlim.update({
              where: { id: siparis.id },
              data: {
                odemeMetodu: 'KREDI_KARTI',
                notlar: siparis.notlar ? `${siparis.notlar} | ${grupEtiketi}` : grupEtiketi,
              },
            })
          )
        );

        const kullanici = await prisma.kullanici.findUnique({
          where: { id: uid },
          include: { ogrenciProfil: true },
        });
        if (!kullanici) {
          res.status(404).json({ basarili: false, mesaj: 'Kullanıcı bulunamadı' });
          return;
        }

        const adres = iyzicoAdresBilgileri(uid, kullanici, req);
        const sepet = iyzicoCokluSepetOlustur(
          odemeliSiparisler.map((siparis) => ({
            id: siparis.sinavId!,
            name: siparis.sinav?.baslik || 'Deneme',
            tutar: siparis.miktar || 0,
          }))
        );

        const iyzicoYanit = await iyzicoService.checkoutFormInitialize({
          conversationId: anaSiparis.id,
          price: sepet.price,
          paidPrice: sepet.paidPrice,
          basketId: anaSiparis.id,
          paymentGroup: 'PRODUCT',
          callbackUrl: `${publicApiBaseUrl()}/paketler/iyzico/callback`,
          ...adres,
          basketItems: sepet.basketItems,
        });

        if (iyzicoYanit.status === 'success') {
          res.status(201).json({
            basarili: true,
            veri: {
              ...sonuc,
              ucretsizAdet,
              checkoutFormContent: iyzicoYanit.checkoutFormContent,
              paymentPageUrl: iyzicoYanit.paymentPageUrl,
              token: iyzicoYanit.token,
            },
          });
          return;
        }

        logger.error('Iyzico Sepet Başlatma Hatası:', iyzicoYanit.errorMessage);
        await iyzicoGrupSiparisleriniIptal(anaSiparis.id, iyzicoYanit.errorMessage || 'Ödeme başlatılamadı');
        res.status(400).json({ basarili: false, mesaj: iyzicoYanit.errorMessage || 'Ödeme başlatılamadı' });
        return;
      } catch (err) {
        logger.error('Iyzico Sepet Hatası:', err);
        if (odemeliSiparisler.length > 0) {
          await iyzicoGrupSiparisleriniIptal(
            odemeliSiparisler[0].id,
            err instanceof Error ? err.message : 'Ödeme servisi hatası'
          );
        }
        res.status(500).json({ basarili: false, mesaj: 'Ödeme servisi hatası' });
        return;
      }
    }

    // Tümü ücretsiz (veya ödeme yöntemi seçilmedi): sipariş(ler) zaten tanımlandı.
    res.status(201).json({
      basarili: true,
      veri: { ...sonuc, ucretsizAdet, ucretsiz: odemeliSiparisler.length === 0 },
    });
  } catch (err) {
    next(err);
  }
}

/** Iyzico ödeme dönüşü - Webhook/Callback */
export async function iyzicoCallback(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).send('Token missing');
      return;
    }

    const sonuc = await iyzicoService.checkoutFormAuthResult(token);
    const siparisId = sonuc.basketId;

    if (sonuc.status === 'success' && sonuc.paymentStatus === 'SUCCESS') {
      const siparisler = await iyzicoGrupSiparisleriniTamamla(siparisId);
      const anaSiparis = siparisler.find((s) => s.id === siparisId) ?? siparisler[0];
      if (!anaSiparis) {
        res.status(404).send('Sipariş bulunamadı');
        return;
      }

      const sinavAdet = siparisler.filter((s) => s.sinavId).length;
      const urunAd = anaSiparis.paket?.ad ?? anaSiparis.sinav?.baslik ?? 'Sipariş';
      const toplamTutar = siparisler.reduce((t, s) => t + (s.miktar || 0), 0);
      await ogrenciBildirimGonder({
        kullaniciId: anaSiparis.kullaniciId,
        baslik: 'Ödemeniz onaylandı!',
        mesaj: anaSiparis.paket && !sinavAdet
          ? `«${urunAd}» paketiniz aktif edildi. Seçili denemelere erişebilirsiniz.`
          : sinavAdet > 1
            ? `${sinavAdet} deneme satın alımınız tamamlandı. Sınavlara erişebilirsiniz.`
            : `«${urunAd}» satın alımınız tamamlandı.`,
        tur: 'siparis_onaylandi',
        veriJson: { siparisId: anaSiparis.id },
      });
      await adminlereSiparisBildirimi({
        siparisId: anaSiparis.id,
        kullaniciId: anaSiparis.kullaniciId,
        kullanici: anaSiparis.kullanici,
        urunAd,
        tutar: toplamTutar,
        sinavAdet: sinavAdet > 0 ? sinavAdet : undefined,
        paketMi: Boolean(anaSiparis.paket && !sinavAdet),
      });

      const frontendUrl = await siparisFrontendUrl(siparisId);
      res.redirect(`${frontendUrl}/market/odeme-basarili?siparisId=${siparisId}`);
    } else {
      const frontendUrl = await siparisFrontendUrl(siparisId);
      await iyzicoGrupSiparisleriniIptal(siparisId, sonuc.errorMessage || 'Ödeme başarısız');

      res.redirect(`${frontendUrl}/market/odeme-hata?mesaj=${encodeURIComponent(sonuc.errorMessage || 'Ödeme başarısız')}`);
    }
  } catch (err) {
    next(err);
  }
}
