import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { iyzipay } from '../utils/iyzipay';
import { satinAlimPaketHaklariniUygula } from '../services/paket-erisim.service';
const Iyzipay = require('iyzipay');

/**
 * İyzico Checkout Form Initialize
 */
export async function odemeBaslatController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const kullaniciId = req.kullanici!.id;
    const { paketId } = req.body;

    if (!paketId) {
      res.status(400).json({ basarili: false, mesaj: 'paketId gerekli' });
      return;
    }

    // Kullanıcıyı ve profili al
    const kullanici = await prisma.kullanici.findUnique({
      where: { id: kullaniciId },
      include: {
        ogrenciProfil: true,
        veliProfil: true,
        adminProfil: true,
      }
    });

    if (!kullanici) {
      res.status(404).json({ basarili: false, mesaj: 'Kullanıcı bulunamadı' });
      return;
    }

    // Paketi al
    const paket = await prisma.paket.findUnique({
      where: { id: paketId }
    });

    if (!paket || !paket.aktif) {
      res.status(404).json({ basarili: false, mesaj: 'Paket bulunamadı veya aktif değil' });
      return;
    }

    const fiyat = paket.indirimliFiyat != null && paket.indirimliFiyat > 0 ? paket.indirimliFiyat : paket.fiyat;

    // Veritabanında bekleyen bir SatinAlim kaydı oluştur
    const referansNo = `IYZI-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const satinAlim = await prisma.satinAlim.create({
      data: {
        kullaniciId,
        paketId,
        miktar: fiyat,
        durum: 'BEKLEMEDE',
        referansNo,
        odemeMetodu: 'IYZICO',
        notlar: 'Iyzico Checkout üzerinden başlatıldı'
      }
    });

    // Kullanıcı adı soyadı
    let ad = 'Müşteri';
    let soyad = 'Kullanıcı';
    
    if (kullanici.ogrenciProfil) {
      ad = kullanici.ogrenciProfil.ad;
      soyad = kullanici.ogrenciProfil.soyad;
    } else if (kullanici.veliProfil) {
      ad = kullanici.veliProfil.ad;
      soyad = kullanici.veliProfil.soyad;
    } else if (kullanici.adminProfil) {
      ad = kullanici.adminProfil.ad;
      soyad = kullanici.adminProfil.soyad;
    }

    const telefon = kullanici.telefon || '+905555555555'; // Iyzico telefon numarasını zorunlu tutabiliyor
    const email = kullanici.email || 'email@email.com';
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_NAME || 'http://localhost:3000';
    const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/odeme/callback`;

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: satinAlim.id,
      price: fiyat.toString(),
      paidPrice: fiyat.toString(),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: paket.id,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: callbackUrl,
      enabledInstallments: [2, 3, 6, 9],
      buyer: {
        id: kullanici.id,
        name: ad,
        surname: soyad,
        gsmNumber: telefon,
        email: email,
        identityNumber: '11111111111',
        lastLoginDate: '2023-10-10 10:10:10',
        registrationDate: '2023-10-10 10:10:10',
        registrationAddress: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
        ip: req.ip || '85.34.78.112',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34732'
      },
      shippingAddress: {
        contactName: `${ad} ${soyad}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
        zipCode: '34732'
      },
      billingAddress: {
        contactName: `${ad} ${soyad}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1',
        zipCode: '34732'
      },
      basketItems: [
        {
          id: paket.id,
          name: paket.ad,
          category1: paket.kategori || 'Eğitim',
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: fiyat.toString()
        }
      ]
    };

    iyzipay.checkoutFormInitialize.create(request, function (err, result) {
      if (err) {
        console.error('Iyzico Hata:', err);
        return res.status(500).json({ basarili: false, mesaj: 'Ödeme sistemi hatası', hata: err });
      }

      if (result.status === 'success') {
        res.json({
          basarili: true,
          token: result.token,
          checkoutFormContent: result.checkoutFormContent,
          paymentPageUrl: result.paymentPageUrl,
        });
      } else {
        res.status(400).json({
          basarili: false,
          mesaj: result.errorMessage || 'Ödeme başlatılamadı'
        });
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * İyzico Callback Endpoint
 */
export async function odemeCallbackController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.body.token;
    const frontendSonucUrl = `${process.env.APP_URL || 'http://localhost:3000'}/odeme/sonuc`;

    if (!token) {
      // Token yoksa ana sayfaya dön veya hata
      res.redirect(`${frontendSonucUrl}?status=error&mesaj=TokenBulunamadi`);
      return;
    }

    iyzipay.checkoutForm.retrieve({
      locale: Iyzipay.LOCALE.TR,
      token: token
    }, async function (err, result) {
      if (err) {
        console.error('Iyzico Retrieve Hata:', err);
        return res.redirect(`${frontendSonucUrl}?status=error&mesaj=OdemeDogrulanamadi`);
      }

      if (!result.conversationId) {
        return res.redirect(`${frontendSonucUrl}?status=error&mesaj=GecersizIslem`);
      }

      // conversationId = satinAlim.id
      const satinAlimId = result.conversationId;

      if (result.paymentStatus === 'SUCCESS') {
        // Ödeme başarılı
        await prisma.satinAlim.update({
          where: { id: satinAlimId },
          data: {
            durum: 'TAMAMLANDI',
            odemeZamani: new Date(),
            // Iyzico işlem bilgisini referansNo'ya ekleyebiliriz
            notlar: `Iyzico PaymentId: ${result.paymentId}`
          }
        });

        // Paketi tanımla
        await satinAlimPaketHaklariniUygula(satinAlimId);

        res.redirect(`${frontendSonucUrl}?status=success`);
      } else {
        // Ödeme başarısız
        await prisma.satinAlim.update({
          where: { id: satinAlimId },
          data: {
            durum: 'HATA',
            notlar: `Iyzico Hata: ${result.errorMessage || 'Bilinmiyor'}`
          }
        });

        res.redirect(`${frontendSonucUrl}?status=error&mesaj=OdemeBasarisiz`);
      }
    });

  } catch (err) {
    console.error('Odeme Callback Hata:', err);
    res.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/odeme/sonuc?status=error`);
  }
}
