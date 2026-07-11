import { Router } from 'express';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  egitimDokumanYukleController,
  egitimDokumanImzaliYuklemeUrlController,
  egitimDokumanListeleController,
  egitimDokumanDetayController,
  egitimDokumanSilController,
  egitimDokumanYenidenIsleController,
} from '../controllers/egitimDokuman.controller';
import {
  sinavOlusturController, sinavGuncelleController, sinavSilController,
  sinavlarListesiController, sinavDetayAdminController, sinavSorulariAdminController, kullanicilarListesiController,
  kullaniciOlusturAdminController, kullaniciGuncelleAdminController, kullaniciSilAdminController, kullaniciTopluSilAdminController,
  veliOgrenciEslestirAdminController,
  genelAnalizController, soruEkleController, soruBankaTopluController, soruGrubaTopluAtaController, soruOnayGuncelleController,
  soruTopluOnayGuncelleController, soruTopluSilController, soruTopluKazanimGuncelleController, soruTopluUygunGrupGuncelleController, soruGuncelleController,
  gruplarController,
  grupOlusturController, grupGuncelleController, grupSilController, grupUyeleriController, grupBransSecenekleriController,
  sinavOgrenciAtaController, sinavOgrenciAtamaKaldirController, sinavAtananOgrencilerController,
  sinavBankadanOtomatikDoldurController, grupHavuzOzetController, sinavaSoruAtaController,
  sinavdanSoruKaldirController,
  konuSoruSayilariController,
  sinavSureAnaliziController,
  sinavKatilimlariAdminController,
  denemeKarnesiAdminController,
  soruKopyalaTytController,
  soruTopluKopyalaTytController,
} from '../controllers/admin.controller';
import {
  odemeAyarlariGetController,
  odemeAyarlariGuncelleController
} from '../controllers/ayarlar.controller';
import {
  adminAiModellerGetController,
  adminAiModellerKaydetController,
  adminAiModellerSenkronizeController,
} from '../controllers/aiModeller.controller';
import {
  rolIzinleriGetController,
  rolIzinleriGuncelleController,
  rolIzinleriBenimController,
} from '../controllers/rolIzin.controller';
import {
  siparisOzetController,
  siparisListesiController,
  siparisDetayController,
  siparisGuncelleController,
  siparisManuelOlusturController,
} from '../controllers/siparis.controller';
import { siteIcerikAdminGetController, siteIcerikAdminPutController } from '../controllers/site.controller';
import {
  osymTaraController,
  osymDurumAdminController,
} from '../controllers/osym.controller';
import { yardimAsistaniMesajController } from '../controllers/yardimAsistani.controller';
import {
  adminSinavTakvimListeleController,
  adminSinavTakvimOlusturController,
  adminSinavTakvimGuncelleController,
  adminSinavTakvimSilController,
} from '../controllers/sinav-takvim.controller';
import { AuthRequest } from '../middlewares/auth.middleware';
import { oturumAktiviteMiddleware } from '../middlewares/oturumAktivite.middleware';
import {
  ogretmenAktiviteDetayController,
  ogretmenAktiviteOzetController,
} from '../controllers/ogretmenAktivite.controller';
import { adminPanelSayaclari } from '../services/navSayaclari.service';

const router = Router();
router.use(kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), oturumAktiviteMiddleware);
router.use((_req, res, next) => {
  // Yönetim verileri kimlik doğrulamalı ve origin'e duyarlı; 304/CORS karışmasını önlemek için cache kapalı.
  res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.set('CDN-Cache-Control', 'no-store');
  res.set('Vercel-CDN-Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

router.get('/panel-sayaclari', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const veri = await adminPanelSayaclari(req.kullanici!.userId);
    res.json({ basarili: true, veri });
  } catch (e) {
    next(e);
  }
});

router.patch('/sorular/toplu-onay', soruTopluOnayGuncelleController);
router.patch('/sorular/toplu-kazanim', soruTopluKazanimGuncelleController);
router.patch('/sorular/toplu-uygun-grup', soruTopluUygunGrupGuncelleController);
router.delete('/sorular/toplu-sil', soruTopluSilController);
router.post('/sorular/banka', soruBankaTopluController);
router.get('/sorular/konu-sayilari', konuSoruSayilariController);
router.patch('/sorular/:id/onay', soruOnayGuncelleController);
router.patch('/sorular/:id', soruGuncelleController);
router.post('/sorular/gruba-ata', soruGrubaTopluAtaController);

router.get('/sinavlar', sinavlarListesiController);
router.get('/sinav-takvim', adminSinavTakvimListeleController);
router.post('/sinav-takvim', adminSinavTakvimOlusturController);
router.put('/sinav-takvim/:id', adminSinavTakvimGuncelleController);
router.delete('/sinav-takvim/:id', adminSinavTakvimSilController);
router.get('/sinavlar/:sinavId/sorular', sinavSorulariAdminController);
router.get('/sinavlar/:sinavId/sure-analizi', sinavSureAnaliziController);
router.get('/sinavlar/:sinavId/katilimlar', sinavKatilimlariAdminController);
router.get('/sinavlar/:sinavId/katilim/:katilimId/karnesi', denemeKarnesiAdminController);
router.get('/sinavlar/:id', sinavDetayAdminController);
router.post('/sinavlar', sinavOlusturController);
router.put('/sinavlar/:id', sinavGuncelleController);
router.delete('/sinavlar/:id', sinavSilController);
router.post('/sinavlar/:id/bankadan-doldur', sinavBankadanOtomatikDoldurController);
router.post('/sinavlar/:id/soru-ata', sinavaSoruAtaController);
router.delete('/sinavlar/:sinavId/sorular/:soruId', sinavdanSoruKaldirController);
router.post('/sinavlar/:id/sorular', soruEkleController);
router.post('/sinavlar/:sinavId/ogrenci-ata', sinavOgrenciAtaController);
router.delete('/sinavlar/:sinavId/ogrenci/:ogrenciId', sinavOgrenciAtamaKaldirController);
router.get('/sinavlar/:sinavId/ogrenciler', sinavAtananOgrencilerController);
router.post('/sorular/:id/copy-to-tyt', rolKontrol('ADMIN', 'SUPER_ADMIN'), soruKopyalaTytController);
router.post('/sorular/toplu-copy-to-tyt', rolKontrol('ADMIN', 'SUPER_ADMIN'), soruTopluKopyalaTytController);

router.get('/kullanicilar', kullanicilarListesiController);
router.post('/kullanicilar/veli-eslestir', veliOgrenciEslestirAdminController);
router.post('/kullanicilar', kullaniciOlusturAdminController);
router.patch('/kullanicilar/:id', kullaniciGuncelleAdminController);
router.delete('/kullanicilar/toplu-sil', kullaniciTopluSilAdminController);
router.delete('/kullanicilar/:id', kullaniciSilAdminController);

router.get('/siparisler/ozet', siparisOzetController);
router.get('/siparisler', siparisListesiController);
router.post('/siparisler', siparisManuelOlusturController);
router.get('/siparisler/:id', siparisDetayController);
router.patch('/siparisler/:id', siparisGuncelleController);

router.get('/analitik', genelAnalizController);

router.get('/ogretmen-aktivite', rolKontrol('ADMIN', 'SUPER_ADMIN'), ogretmenAktiviteOzetController);
router.get('/ogretmen-aktivite/:kullaniciId', rolKontrol('ADMIN', 'SUPER_ADMIN'), ogretmenAktiviteDetayController);

// Grup CRUD
router.get('/gruplar/brans-secenekleri', grupBransSecenekleriController);
router.get('/gruplar', gruplarController);
router.post('/gruplar', grupOlusturController);
router.put('/gruplar/:id', grupGuncelleController);
router.delete('/gruplar/:id', grupSilController);
router.get('/gruplar/:id/uyeler', grupUyeleriController);
router.get('/gruplar/:id/havuz-ozet', grupHavuzOzetController);

router.get('/site-icerik', siteIcerikAdminGetController);
router.put('/site-icerik', siteIcerikAdminPutController);

// Ayarlar
router.get('/ayarlar/odeme', odemeAyarlariGetController);
router.put('/ayarlar/odeme', odemeAyarlariGuncelleController);
router.get('/ai-modeller', rolKontrol('ADMIN', 'SUPER_ADMIN'), adminAiModellerGetController);
router.post('/ai-modeller/senkronize', rolKontrol('ADMIN', 'SUPER_ADMIN'), adminAiModellerSenkronizeController);
router.put('/ai-modeller', rolKontrol('ADMIN', 'SUPER_ADMIN'), adminAiModellerKaydetController);

// Rol bazlı menü izinleri
// Kendi rolünün izinlerini herkes (panele erişebilen herkes) okuyabilir
router.get('/rol-izinleri/benim', rolIzinleriBenimController);
// Tüm izinleri yalnız ADMIN/SUPER_ADMIN okur ve günceller
router.get('/rol-izinleri', rolKontrol('ADMIN', 'SUPER_ADMIN'), rolIzinleriGetController);
router.put('/rol-izinleri', rolKontrol('ADMIN', 'SUPER_ADMIN'), rolIzinleriGuncelleController);

// Eğitim dokümanları (RAG) — Vercel'de 4 MB, yerelde doğrudan API ile 25 MB
const VERCEL_ORTAM = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const MAKS_EGITIM_DOKUMAN_BOYUTU = VERCEL_ORTAM ? 4 * 1024 * 1024 : 25 * 1024 * 1024;
const egitimYukle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAKS_EGITIM_DOKUMAN_BOYUTU },
});
const egitimYukleTekDosya = (req: Request, res: Response, next: NextFunction) => {
  egitimYukle.single('dosya')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        basarili: false,
        mesaj: VERCEL_ORTAM
          ? 'Dosya çok büyük. Vercel upload limiti nedeniyle en fazla 4 MB dosya yüklenebilir. Daha büyük kaynaklar için URL ile besleme seçeneğini kullanın.'
          : 'Dosya çok büyük. En fazla 25 MB yüklenebilir.',
      });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
};
router.get('/egitim-dokumanlar', egitimDokumanListeleController);
router.post('/egitim-dokumanlar/yukleme-url', egitimDokumanImzaliYuklemeUrlController);
router.post('/egitim-dokumanlar', egitimYukleTekDosya, egitimDokumanYukleController);
router.get('/egitim-dokumanlar/:id', egitimDokumanDetayController);
router.delete('/egitim-dokumanlar/:id', egitimDokumanSilController);
router.post('/egitim-dokumanlar/:id/yeniden-isle', egitimDokumanYenidenIsleController);

/** ÖSYM / YKS resmi sayfa takibi + duyuru aktarımı */
router.get('/osym/durum', osymDurumAdminController);
router.post('/osym/tara', osymTaraController);

/** Yönetici YZ asistanı (sınav / müfredat / ÖSYM bilgilendirme) */
router.post('/yardim-asistani/mesaj', yardimAsistaniMesajController);

export default router;
