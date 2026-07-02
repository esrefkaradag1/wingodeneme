import path from 'path';
import dotenv from 'dotenv';

// .env her zaman backend/ kökünden yüklensin (nodemon cwd farklı olsa bile)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Server as SocketIO } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { baglantiKontrol } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { hataYonetici, bulunamadi } from './middlewares/hata.middleware';

// Rotalar
import authRotalar from './routes/auth.routes';
import kullaniciRotalar from './routes/kullanici.routes';
import sinavRotalar from './routes/sinav.routes';
import soruRotalar from './routes/soru.routes';
import analizRotalar from './routes/analiz.routes';
import sosyalRotalar from './routes/sosyal.routes';
import universiteRotalar from './routes/universite.routes';
import aiRotalar from './routes/ai.routes';
import adminRotalar from './routes/admin.routes';
import bildirimRotalar from './routes/bildirim.routes';
import paketRotalar from './routes/paket.routes';
import referansRotalar from './routes/referans.routes';
import veliRotalar from './routes/veli.routes';
import publicRotalar from './routes/public.routes';
import destekRotalar from './routes/destek.routes';
import duyuruRotalar from './routes/duyuru.routes';
import iletisimRotalar from './routes/iletisim.routes';
import ogretmenOneriRotalar from './routes/ogretmenOneri.routes';
import odemeRotalar from './routes/odeme.routes';

import { sinavZamanlayici } from './utils/zamanlayici';
import { socketYonetici } from './utils/socket';

const uygulama = express();
const sunucu = http.createServer(uygulama);

// Vercel/cPanel reverse proxy arkasında express-rate-limit'in gerçek IP'yi doğru okuması için.
uygulama.set('trust proxy', 1);

const varsayilanIzinliOriginler = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  process.env.CLIENT_URL,
  process.env.APP_URL,
].filter(Boolean) as string[];

const envIzinliOriginler = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const izinliOriginler = new Set([...varsayilanIzinliOriginler, ...envIzinliOriginler]);

function originIzinliMi(origin?: string): boolean {
  if (!origin) return true;
  if (izinliOriginler.has(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    return (
      hostname.endsWith('.vercel.app') ||
      hostname.endsWith('.lim10.net.tr') ||
      hostname === 'wingodeneme.com' ||
      hostname.endsWith('.wingodeneme.com') ||
      hostname === 'wingosinav.com' ||
      hostname.endsWith('.wingosinav.com') ||
      hostname === 'wingolink.com.tr' ||
      hostname.endsWith('.wingolink.com.tr')
    );
  } catch {
    return false;
  }
}

const corsAyarlari: cors.CorsOptions = {
  origin(origin, callback) {
    if (originIzinliMi(origin)) {
      callback(null, origin || true);
      return;
    }
    callback(new Error(`CORS origin izinli değil: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204,
};

export const io = new SocketIO(sunucu, {
  cors: {
    origin: (origin, callback) => callback(null, originIzinliMi(origin) ? origin || true : false),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// CORS — En başta olmalı!
uygulama.use(cors(corsAyarlari));
uygulama.options('*', cors(corsAyarlari));

// Middleware'ler
uygulama.use(helmet({ contentSecurityPolicy: false }));
uygulama.use(compression());
uygulama.use(express.json({ limit: '10mb' }));
uygulama.use(express.urlencoded({ extended: true, limit: '10mb' }));
uygulama.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Hız sınırlayıcı
const hizSinirleyici = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '500', 10) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { basarili: false, mesaj: 'Çok fazla istek, lütfen birkaç dakika bekleyin' },
});
uygulama.use('/api/', hizSinirleyici);

// Sağlık kontrolü
uygulama.get('/health', (_req, res) => {
  res.json({ durum: 'sağlıklı', zaman: new Date().toISOString(), servis: 'wingo-backend' });
});

// API Rotaları
const API_TABANLI = '/api/v1';
uygulama.use(`${API_TABANLI}/public`, publicRotalar);
uygulama.use(`${API_TABANLI}/auth`, authRotalar);
uygulama.use(`${API_TABANLI}/veli`, veliRotalar);
uygulama.use(`${API_TABANLI}/kullanicilar`, kullaniciRotalar);
uygulama.use(`${API_TABANLI}/sinavlar`, sinavRotalar);
uygulama.use(`${API_TABANLI}/sorular`, soruRotalar);
uygulama.use(`${API_TABANLI}/analiz`, analizRotalar);
uygulama.use(`${API_TABANLI}/sosyal`, sosyalRotalar);
uygulama.use(`${API_TABANLI}/universiteler`, universiteRotalar);
uygulama.use(`${API_TABANLI}/ai`, aiRotalar);
uygulama.use(`${API_TABANLI}/admin`, adminRotalar);
uygulama.use(`${API_TABANLI}/referans`, referansRotalar);
uygulama.use(`${API_TABANLI}/paketler`, paketRotalar);
uygulama.use(`${API_TABANLI}/bildirimler`, bildirimRotalar);
uygulama.use(`${API_TABANLI}/destek`, destekRotalar);
uygulama.use(`${API_TABANLI}/iletisim`, iletisimRotalar);
uygulama.use(`${API_TABANLI}/ogretmen-onerileri`, ogretmenOneriRotalar);
uygulama.use(`${API_TABANLI}/duyurular`, duyuruRotalar);
uygulama.use(`${API_TABANLI}/odeme`, odemeRotalar);

// 404 & Hata yönetimi
uygulama.use(bulunamadi);
uygulama.use(hataYonetici);

// Socket.IO
socketYonetici(io);

const PORT = parseInt(process.env.API_PORT || '4000', 10);

async function baslatSunucu(): Promise<void> {
  const vercelServerless = process.env.VERCEL === '1';
  // Serverless'ta her cold start için ayrı bağlantı/cron başlatmak ilk isteği ağırlaştırır.
  if (!vercelServerless) {
    baglantiKontrol().catch(err => logger.error('Veritabanı bağlantı hatası (Sistem yine de açık):', err.message));
  }
  if (redis) {
    redis.connect().catch(err => logger.warn('Redis bağlantı uyarısı:', err.message));
  }
  if (!vercelServerless) {
    sinavZamanlayici();
  }

  // Vercel serverless ortamda listen() çağrılmaz
  if (process.env.NODE_ENV !== 'production' || process.env.STANDALONE === 'true') {
    sunucu.listen(PORT, () => {
      logger.info(`🚀 Wingo Deneme Backend: http://localhost:${PORT}`);
    });
  }
}

baslatSunucu().catch((err) => {
  logger.error('Sunucu başlatma hatası:', err);
});

export default uygulama;
