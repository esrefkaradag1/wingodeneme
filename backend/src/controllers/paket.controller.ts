import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { bildirimGonder } from '../services/bildirim.service';
import { satinAlimPaketHaklariniUygula } from '../services/paket-erisim.service';
import { iyzicoService } from '../services/iyzico.service';
import { logger } from '../utils/logger';
import { paketKategoriSlugDogrula } from './paketKategori.controller';
import { paketKategoriGrupSenkronla, paketSinavlariniGetir } from '../utils/paketSinavCozumle';

function idListesi(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim());
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
    const cacheKey = 'paketler:aktif:v3';
    const cached = await cache.al(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
      res.json({ basarili: true, veri: cached });
      return;
    }

    const paketler = await prisma.paket.findMany({
      where: { aktif: true },
      orderBy: { fiyat: 'asc' },
      select: {
        id: true,
        ad: true,
        aciklama: true,
        kategori: true,
        fiyat: true,
        indirimliFiyat: true,
        sinavSayisi: true,
        ozellikler: true,
        aktif: true,
        populer: true,
        disUrl: true,
        oneCikan: true,
      },
    });
    await cache.yaz(cacheKey, paketler, 300);
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.json({ basarili: true, veri: paketler });
  } catch (err) { next(err); }
}

export async function aktifPaketDetayGetir(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const cacheKey = `paketler:aktif:${id}:v3`;
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

    const simdi = new Date();
    const sinavlar = await paketSinavlariniGetir(paket);

    const veri = {
      ...paket,
      sinavlar: sinavlar.map((s) => {
        const gf =
          s.indirimliUcret != null && s.indirimliUcret > 0
            ? s.indirimliUcret
            : s.ucret != null && s.ucret > 0
              ? s.ucret
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
      }),
    };

    await cache.yaz(cacheKey, veri, 300);
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.json({ basarili: true, veri });
  } catch (err) { next(err); }
}

export async function paketOlustur(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ad, aciklama, kategori, fiyat, indirimliFiyat, sinavSayisi, ozellikler, aktif, populer, sinavIds, grupIds, etiketler, disUrl, oneCikan } = req.body;
    const cozulmusGrupIds = idListesi(grupIds);
    const kategoriSlug = cozulmusGrupIds.length
      ? await paketKategoriGrupSenkronla(cozulmusGrupIds)
      : await paketKategoriSlugDogrula(kategori);
    const paket = await prisma.paket.create({
      data: {
        ad,
        aciklama,
        kategori: kategoriSlug,
        fiyat: parseFloat(fiyat),
        indirimliFiyat: indirimliFiyat ? parseFloat(indirimliFiyat) : null,
        sinavSayisi: parseInt(sinavSayisi) || 0,
        ozellikler: ozellikler || [],
        sinavIds: idListesi(sinavIds),
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
    const { ad, aciklama, kategori, fiyat, indirimliFiyat, sinavSayisi, ozellikler, aktif, populer, sinavIds, grupIds, etiketler, disUrl, oneCikan } = req.body;
    const cozulmusGrupIds = grupIds !== undefined ? idListesi(grupIds) : undefined;
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
        fiyat: parseFloat(fiyat),
        indirimliFiyat: indirimliFiyat ? parseFloat(indirimliFiyat) : null,
        sinavSayisi: parseInt(sinavSayisi) || 0,
        ozellikler: ozellikler || [],
        sinavIds: idListesi(sinavIds),
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

    const olusturulan = await prisma.satinAlim.create({
      data: {
        kullaniciId: uid,
        paketId: paket.id,
        miktar: fiyat,
        durum: 'BEKLEMEDE',
        referansNo: ref,
        notlar: notMetni,
      },
      include: {
        paket: { select: { id: true, ad: true, sinavSayisi: true, fiyat: true, indirimliFiyat: true } },
        kullanici: { include: { ogrenciProfil: true } },
      },
    });

    // Kredi kartı ödemesi ise Iyzico başlat
    if (odemeYontemi === 'KREDI_KARTI') {
      try {
        const profil = olusturulan.kullanici.ogrenciProfil;
        const host = process.env.APP_URL || 'http://localhost:3000';
        
        const iyzicoYanit = await iyzicoService.checkoutFormInitialize({
          conversationId: olusturulan.id,
          price: paket.fiyat.toString(),
          paidPrice: fiyat.toString(),
          basketId: olusturulan.id,
          paymentGroup: 'PRODUCT',
          callbackUrl: `${process.env.API_URL || 'http://localhost:4000/api/v1'}/paketler/iyzico/callback`,
          buyer: {
            id: uid,
            name: profil?.ad || 'Ad belirtilmemiş',
            surname: profil?.soyad || 'Soyad belirtilmemiş',
            gsmNumber: olusturulan.kullanici.telefon || '+905000000000',
            email: olusturulan.kullanici.email,
            identityNumber: '11111111111', // Dummy TC
            registrationAddress: profil?.sehir || 'Adres belirtilmemiş',
            ip: (req.ip && req.ip.includes(':')) ? '85.31.226.21' : (req.ip || '85.31.226.21'),
            city: profil?.sehir || 'Istanbul',
            country: 'Turkey',
          },
          shippingAddress: {
            contactName: `${profil?.ad} ${profil?.soyad}`,
            city: profil?.sehir || 'Istanbul',
            country: 'Turkey',
            address: profil?.sehir || 'Adres belirtilmemiş',
          },
          billingAddress: {
            contactName: `${profil?.ad} ${profil?.soyad}`,
            city: profil?.sehir || 'Istanbul',
            country: 'Turkey',
            address: profil?.sehir || 'Adres belirtilmemiş',
          },
          basketItems: [{
            id: paket.id,
            name: paket.ad,
            category1: 'Eğitim',
            itemType: 'VIRTUAL',
            price: fiyat.toString(),
          }],
        });

        if (iyzicoYanit.status === 'success') {
          res.status(201).json({ 
            basarili: true, 
            veri: { 
              ...olusturulan, 
              checkoutFormContent: iyzicoYanit.checkoutFormContent,
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

    await bildirimGonder({
      kullaniciId: uid,
      baslik: 'Sipariş kaydınız oluşturuldu',
      mesaj: `«${paket.ad}» için siparişiniz alındı. Ödeme onayından sonra erişiminiz açılacaktır.`,
      tur: 'siparis_beklemede',
      veriJson: { siparisId: olusturulan.id },
    });

    res.status(201).json({ basarili: true, veri: olusturulan });
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
      // Siparişi onayla
      const siparis = await prisma.satinAlim.update({
        where: { id: siparisId },
        data: { durum: 'TAMAMLANDI', odemeZamani: new Date() } as any,
        include: { paket: true, sinav: true, kullanici: true },
      }) as any;

      await satinAlimPaketHaklariniUygula(siparisId);

      const urunAd = siparis.paket?.ad ?? siparis.sinav?.baslik ?? 'Sipariş';
      await bildirimGonder({
        kullaniciId: siparis.kullaniciId,
        baslik: 'Ödemeniz onaylandı!',
        mesaj: siparis.paket
          ? `«${urunAd}» paketiniz aktif edildi. Seçili denemelere erişebilirsiniz.`
          : `«${urunAd}» satın alımınız tamamlandı.`,
        tur: 'siparis_onaylandi',
        veriJson: { siparisId: siparis.id },
      });

      // Başarılı sayfasına yönlendir
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/market/odeme-basarili?siparisId=${siparisId}`);
    } else {
      // Hatayı işle
      await prisma.satinAlim.update({
        where: { id: siparisId },
        data: { durum: 'IPTAL_EDILDI', notlar: `Hata: ${sonuc.errorMessage}` },
      });

      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/market/odeme-hata?mesaj=${encodeURIComponent(sonuc.errorMessage || 'Ödeme başarısız')}`);
    }
  } catch (err) {
    next(err);
  }
}
