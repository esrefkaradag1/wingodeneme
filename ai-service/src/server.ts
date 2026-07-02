import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import multer from 'multer';
import { optikFormOku } from './optik-okuyucu';
import { soruUret } from './soru-uretici';
import { analizYap } from './analiz-motoru';

const uygulama = express();
const yukle = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

uygulama.use(express.json({ limit: '10mb' }));
uygulama.use(morgan('dev'));

uygulama.get('/health', (_req, res) => {
  res.json({ durum: 'sağlıklı', servis: 'wingo-ai', zaman: new Date().toISOString() });
});

// Optik form okuma
uygulama.post('/optik-oku', yukle.single('form'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ basarili: false, mesaj: 'Dosya yüklenmedi' });
      return;
    }
    const { soruSayisi } = req.body;
    const cevaplar = await optikFormOku(req.file.buffer, parseInt(soruSayisi || '40'));
    res.json({ basarili: true, veri: { cevaplar } });
  } catch (err: unknown) {
    const mesaj = err instanceof Error ? err.message : 'Bilinmeyen hata';
    res.status(500).json({ basarili: false, mesaj });
  }
});

// Soru üretme
uygulama.post('/soru-uret', async (req, res) => {
  try {
    const { sorular, kullanılanModel } = await soruUret(req.body);
    res.json({ basarili: true, veri: { sorular, kullanılanModel } });
  } catch (err: unknown) {
    const mesaj = err instanceof Error ? err.message : 'Bilinmeyen hata';
    res.status(500).json({ basarili: false, mesaj });
  }
});

// Model yönlendirme bilgisi (frontend için)
uygulama.get('/model-bilgisi', (_req, res) => {
  const { MODEL_BILGILERI, modelSec } = require('./soru-uretici');
  res.json({ basarili: true, veri: MODEL_BILGILERI });
});

// Öğrenci analizi
uygulama.post('/analiz', async (req, res) => {
  try {
    const analiz = await analizYap(req.body);
    res.json({ basarili: true, veri: analiz });
  } catch (err: unknown) {
    const mesaj = err instanceof Error ? err.message : 'Bilinmeyen hata';
    res.status(500).json({ basarili: false, mesaj });
  }
});

const PORT = parseInt(process.env.AI_PORT || '5000', 10);
uygulama.listen(PORT, () => {
  console.log(`🤖 Wingo Deneme AI Servisi: http://localhost:${PORT}`);
});
