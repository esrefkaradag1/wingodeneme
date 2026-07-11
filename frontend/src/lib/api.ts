import axios from 'axios';
import { supabase } from './supabase';
import { useAuthStore, oturumTemizle } from '@/store/auth.store';
import { kpssOrtami } from './platform';

/** Build anında gömülür; yanlışlıkla /api verilse bile /api/v1'e normalize edilir. */
function normalizeApiUrl(rawUrl?: string): string {
  const fallback = 'http://localhost:4000/api/v1';
  const value = (rawUrl || fallback).trim();

  try {
    const parsed = new URL(value);
    const merged = parsed.pathname
      .replace(/\/+$/, '')
      .replace(/\/api\/api+/g, '/api')
      .replace(/\/api\/v1\/api/g, '/api/v1');

    if (merged.endsWith('/api/v1')) {
      parsed.pathname = merged;
    } else if (merged.endsWith('/api')) {
      parsed.pathname = `${merged}/v1`;
    } else {
      parsed.pathname = `${merged || ''}/api/v1`;
    }

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    const cleaned = value.replace(/\/+$/, '').replace(/\/api\/api+/g, '/api');
    if (cleaned.endsWith('/api/v1')) return cleaned;
    if (cleaned.endsWith('/api')) return `${cleaned}/v1`;
    return `${cleaned}/api/v1`;
  }
}

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let cachedJwtToken: string | null | undefined;
let cachedRefreshToken: string | null | undefined;
let supabaseTokenCache: { token: string; expiresAtMs: number } | null = null;
let supabaseTokenInFlight: Promise<string | null> | null = null;

function readStoredAuthState(): { token: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { token: null, refreshToken: null };
  try {
    const raw = window.localStorage.getItem('wingo-auth');
    if (!raw) return { token: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      token: parsed?.state?.token || null,
      refreshToken: parsed?.state?.refreshToken || null,
    };
  } catch {
    return { token: null, refreshToken: null };
  }
}

function getCachedJwtToken(): string | null {
  const storeToken = useAuthStore.getState().token;
  if (storeToken) {
    cachedJwtToken = storeToken;
    return storeToken;
  }
  if (cachedJwtToken !== undefined) return cachedJwtToken;
  const stored = readStoredAuthState();
  cachedJwtToken = stored.token;
  cachedRefreshToken = stored.refreshToken;
  return cachedJwtToken;
}

function getCachedRefreshToken(): string | null {
  const storeRefreshToken = useAuthStore.getState().refreshToken;
  if (storeRefreshToken) {
    cachedRefreshToken = storeRefreshToken;
    return storeRefreshToken;
  }
  if (cachedRefreshToken !== undefined) return cachedRefreshToken;
  const stored = readStoredAuthState();
  cachedJwtToken = stored.token;
  cachedRefreshToken = stored.refreshToken;
  return cachedRefreshToken;
}

async function getSupabaseAccessToken(): Promise<string | null> {
  const simdi = Date.now();
  if (supabaseTokenCache && supabaseTokenCache.expiresAtMs - 30_000 > simdi) {
    return supabaseTokenCache.token;
  }

  if (!supabaseTokenInFlight) {
    supabaseTokenInFlight = supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const token = session?.access_token || null;
        const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : simdi + 60_000;
        supabaseTokenCache = token ? { token, expiresAtMs } : null;
        return token;
      })
      .finally(() => {
        supabaseTokenInFlight = null;
      });
  }

  return supabaseTokenInFlight;
}

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state) => {
    cachedJwtToken = state.token;
    cachedRefreshToken = state.refreshToken;
    if (!state.token) supabaseTokenCache = null;
  });
}

function oturumTemizleVeYonlendir(): void {
  if (typeof window === 'undefined') return;
  cachedJwtToken = null;
  cachedRefreshToken = null;
  supabaseTokenCache = null;
  oturumTemizle();
  if (!window.location.pathname.startsWith('/giris')) {
    window.location.replace('/giris');
  }
}

// Her istekte öncelikle backend JWT token'ını, yoksa Supabase token'ını ekle
api.interceptors.request.use(async (config) => {
  const url = String(config.url || '');
  
  // Platform modunu header olarak ekle (KPSS alanı veya KPSS öğrencisi)
  const ogretimTuru = useAuthStore.getState().kullanici?.ogretimTuru;
  config.headers['x-platform-mode'] = kpssOrtami(ogretimTuru) ? 'kpss' : 'yks_lgs';

  /** Token yenilemede eski (süresi dolmuş) JWT gönderilmesin */
  if (url.includes('/auth/token-yenile')) {
    if (config.headers) {
      const hdrs = config.headers as Record<string, unknown>;
      delete hdrs.Authorization;
      delete hdrs.authorization;
    }
    return config;
  }

  // FormData: Content-Type'ı tarayıcı ayarlasın (boundary ile); yoksa multer dosyayı almaz
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const hdrs = config.headers;
    if (hdrs && typeof (hdrs as { delete?: (k: string) => void }).delete === 'function') {
      (hdrs as { delete: (k: string) => void }).delete('Content-Type');
      (hdrs as { delete: (k: string) => void }).delete('content-type');
    } else if (hdrs && typeof hdrs === 'object') {
      delete (hdrs as Record<string, unknown>)['Content-Type'];
      delete (hdrs as Record<string, unknown>)['content-type'];
    }
  }

  const jwt = getCachedJwtToken();
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
    return config;
  }

  const supabaseToken = await getSupabaseAccessToken();
  if (supabaseToken) {
    config.headers.Authorization = `Bearer ${supabaseToken}`;
  }
  return config;
});

// 401 olursa refresh token ile 1 kez yenile ve isteği tekrar dene
let refreshInFlight: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config as any;
    if (status !== 401 || !original || original.__isRetry) {
      throw error;
    }

    const istekUrl = String(original.url || '');

    /** Public uçlar ve opsiyonel istekler 401'de oturum temizleme yapmasın */
    if (original.skipAuthRedirect || istekUrl.includes('/public/')) {
      throw error;
    }

    /** Yenileme de 401 döndüyse döngüye girme — tekrar giriş gerekir */
    if (istekUrl.includes('/auth/token-yenile')) {
      oturumTemizleVeYonlendir();
      throw error;
    }

    const refreshToken = getCachedRefreshToken();
    if (!refreshToken) {
      oturumTemizleVeYonlendir();
      throw error;
    }

    if (!refreshInFlight) {
      refreshInFlight = api
        .post('/auth/token-yenile', { refreshToken })
        .then((r) => {
          const veri = r.data?.veri || {};
          const token = typeof veri.token === 'string' ? veri.token : null;
          const newRefresh = typeof veri.refreshToken === 'string' ? veri.refreshToken : refreshToken;
          if (token) {
            useAuthStore.getState().girisYap({ token, refreshToken: newRefresh });
          }
          return token;
        })
        .catch(() => null)
        .finally(() => {
          refreshInFlight = null;
        });
    }

    const newToken = await refreshInFlight;
    if (!newToken) {
      oturumTemizleVeYonlendir();
      throw error;
    }

    original.__isRetry = true;
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);

export const authApi = {
  kayit: (veri: Record<string, unknown>) =>
    api.post('/auth/kayit', { ...veri, email: String(veri.email || '').trim().toLowerCase() })
      .then(res => ({ data: { veri: res.data.veri } })),
  kayitVeli: (veri: Record<string, unknown>) =>
    api.post('/auth/kayit-veli', { ...veri, email: String(veri.email || '').trim().toLowerCase() })
      .then(res => ({ data: { veri: res.data.veri } })),
  kayitOgretmen: (veri: Record<string, unknown>) =>
    api.post('/auth/kayit-ogretmen', { ...veri, email: String(veri.email || '').trim().toLowerCase() })
      .then(res => ({ data: { veri: res.data.veri } })),
  giris: (email: string, sifre: string) =>
    api.post('/auth/giris', { email: email.trim().toLowerCase(), sifre })
      .then(res => ({ data: { veri: res.data.veri } })),
  tokenYenile: (refreshToken: string) =>
    api.post('/auth/token-yenile', { refreshToken }).then(res => ({ data: { veri: res.data.veri } })),
  cikis: () => api.post('/auth/cikis').then(res => ({ data: { veri: res.data.veri } })),
  me: () => api.get('/auth/me').then(res => ({ data: { veri: res.data.veri } })),
  sifremiUnuttumTalep: (email: string) =>
    api.post('/auth/sifremi-unuttum', { email: email.trim().toLowerCase() }).then(res => ({ data: res.data })),
  sifremiUnuttumOnayla: (veri: { email: string; kod: string; yeniSifre: string }) =>
    api.post('/auth/sifremi-unuttum/onayla', {
      email: veri.email.trim().toLowerCase(),
      kod: veri.kod.trim(),
      yeniSifre: veri.yeniSifre,
    }).then(res => ({ data: res.data })),
};

export const sinavApi = {
  liste: () => api.get('/sinavlar').then(res => ({ data: { veri: res.data.veri } })),
  takvim: (params?: { yil?: number; ay?: number }) =>
    api.get('/sinavlar/takvim', { params }).then((res) => ({ data: { veri: res.data.veri, meta: res.data.meta } })),
  satinAl: (id: string, veri?: { notlar?: string }) =>
    api.post(`/sinavlar/${id}/satin-al`, veri ?? {}).then((res) => ({ data: { veri: res.data.veri } })),
  sepetSatinAl: (veri: { sinavIds: string[]; notlar?: string }) =>
    api.post('/sinavlar/sepet-satin-al', veri).then((res) => ({ data: { veri: res.data.veri } })),
  fiyatKademeleri: () =>
    api.get('/sinavlar/fiyat-kademeleri').then((res) => ({ data: { veri: res.data.veri } })),
  detay: (id: string) => api.get(`/sinavlar/${id}`).then(res => ({ data: { veri: res.data.veri } })),
  katil: (id: string) => api.post(`/sinavlar/${id}/katil`).then(res => ({ data: { veri: res.data.veri } })),
  cevapGonder: (katilimId: string, cevaplar: any[]) => 
    api.post(`/sinavlar/katilim/${katilimId}/cevaplar`, { cevaplar }).then(res => ({ data: { veri: res.data.veri } })),
  sonuc: (katilimId: string) => api.get(`/sinavlar/katilim/${katilimId}/sonuc`).then(res => ({ data: { veri: res.data.veri } })),
  karnesi: (katilimId: string) => api.get(`/sinavlar/katilim/${katilimId}/karnesi`).then(res => ({ data: { veri: res.data.veri } })),
  optikFormYukle: (katilimId: string, form: FormData) => 
    api.post(`/sinavlar/katilim/${katilimId}/optik-form`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const paketApi = {
  liste: () => api.get('/paketler/aktif').then((res) => ({ data: { veri: res.data.veri } })),
  kategoriler: () => api.get('/paketler/kategoriler/aktif').then((res) => ({ data: { veri: res.data.veri } })),
  detay: (id: string) =>
    api.get(`/paketler/aktif/${id}`).then((res) => ({ data: { veri: res.data.veri } })),
  satinAl: (veri: { paketId: string; notlar?: string; odemeYontemi?: string }) =>
    api.post('/paketler/satin-al', veri).then((res) => ({ data: { veri: res.data.veri } })),
  seciliSinavlariSatinAl: (
    paketId: string,
    veri: { sinavIds: string[]; notlar?: string; odemeYontemi?: string }
  ) =>
    api.post(`/paketler/${paketId}/sinavlar/satin-al`, veri).then((res) => ({ data: { veri: res.data.veri } })),
};

export const veliApi = {
  ozet: () => api.get('/veli/ozet').then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciBagla: (email: string) =>
    api.post('/veli/ogrenci-bagla', { email }).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciProfil: (ogrenciId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/profil`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciAnaliz: (ogrenciId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/analiz`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciSinavlar: (ogrenciId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/sinavlar`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciSonuc: (ogrenciId: string, katilimId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/katilim/${katilimId}/sonuc`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciStudyPlanlar: (ogrenciId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/study-planlar`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciOneriler: (ogrenciId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/oneriler`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciDuyurular: (ogrenciId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/duyurular`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciDestek: (ogrenciId: string) =>
    api.get(`/veli/ogrenci/${ogrenciId}/destek`).then((res) => ({ data: { veri: res.data.veri } })),
  ogrenciDestekOlustur: (ogrenciId: string, veri: { baslik: string; mesaj: string }) =>
    api.post(`/veli/ogrenci/${ogrenciId}/destek`, veri).then((res) => ({ data: { veri: res.data.veri } })),
};

export const analizApi = {
  benim: () => api.get('/analiz/benim').then(res => ({ data: { veri: res.data.veri } })),
  oneriler: () => api.get('/analiz/oneriler').then(res => ({ data: { veri: res.data.veri } })),
  ulusal: (sinavId: string) => api.get(`/analiz/ulusal/${sinavId}`).then(res => ({ data: { veri: res.data.veri } })),
  netSimulasyon: (veri: any) => api.post('/analiz/net-simulasyon', veri).then(res => ({ data: { veri: res.data.veri } })),
};

export const aiApi = {
  analiz: () => api.get('/ai/analiz').then(res => ({ data: { veri: res.data.veri } })),
  studyPlan: (veri?: any) => api.post('/ai/study-plan', veri).then(res => ({ data: { veri: res.data.veri } })),
  oneriler: () => api.get('/ai/oneriler').then(res => ({ data: { veri: res.data.veri } })),
  // AI soru üretimi OpenRouter nedeniyle uzun sürebilir
  soruUret: (veri: any) => api.post('/ai/soru-uret', veri, { timeout: 180000 }).then(res => ({ data: { veri: res.data.veri } })),
  hataAcikla: (veri: { katilimId: string; soruId: string }) =>
    api.post('/ai/hata-acikla', veri, { timeout: 120000 }).then(res => ({ data: { veri: res.data.veri } })),
};

export const kullaniciApi = {
  profilGetir: () => api.get('/kullanicilar/profil').then((res) => ({ data: { veri: res.data.veri } })),
  profilGuncelle: (veri: Record<string, unknown>) =>
    api.put('/kullanicilar/profil', veri).then((res) => ({ data: { veri: res.data.veri } })),
  sifreDegistir: (veri: { mevcutSifre: string; yeniSifre: string }) =>
    api.put('/kullanicilar/profil/sifre', veri).then((res) => ({ data: res.data })),
  studyPlanlar: () => api.get('/kullanicilar/study-planlar').then(res => ({ data: { veri: res.data.veri } })),
  studyGorevDurumGuncelle: (gorevId: string, tamamlandi: boolean) =>
    api.patch(`/kullanicilar/study-planlar/gorev/${gorevId}`, { tamamlandi }),
  navSayaclari: () => api.get('/kullanicilar/nav-sayaclari').then((res) => ({ data: { veri: res.data.veri } })),
  siparisler: (params?: { sayfa?: number; boyut?: number; durum?: string }) =>
    api.get('/kullanicilar/siparisler', { params }).then((res) => ({
      data: { veri: res.data.veri, meta: res.data.meta },
    })),
  siparisOdemeBaslat: (id: string) =>
    api.post(`/kullanicilar/siparisler/${id}/odeme-baslat`).then((res) => ({
      data: { veri: res.data.veri },
    })),
};

export const sosyalApi = {
  arkadaslar: () => api.get('/sosyal/arkadaslar').then(res => ({ data: { veri: res.data.veri } })),
  gelenArkadasIstekleri: () => api.get('/sosyal/arkadaslik/istekler/gelen').then(res => ({ data: { veri: res.data.veri } })),
  arkadasIstek: (hedefId: string) => api.post(`/sosyal/arkadaslik/${hedefId}`),
  arkadasYanit: (id: string, kabul: boolean) => api.patch(`/sosyal/arkadaslik/${id}/yanit`, { kabul }),
  kullaniciAra: (query: string) => api.get('/sosyal/kullanici-ara', { params: { query } }).then(res => ({ data: { veri: res.data.veri } })),
  duelloBaslat: (davetEdilenId: string, konuId?: string) => api.post(`/sosyal/duello/${davetEdilenId}`, { konuId }),
  gelenDuelloDavetleri: () => api.get('/sosyal/duello/davetler/gelen').then(res => ({ data: { veri: res.data.veri } })),
  duelloYanit: (id: string, kabul: boolean) => api.patch(`/sosyal/duello/${id}/yanit`, { kabul }),
  puanKarsilastir: (arkadasId: string) => api.get(`/sosyal/karsilastir/${arkadasId}`).then(res => ({ data: { veri: res.data.veri } })),
};

export const universiteApi = {
  ara: (q: string, filtreler?: any) => api.get('/universiteler/ara', { params: { q, ...filtreler } }).then(res => ({ data: { veri: res.data.veri } })),
  tahmin: (net: number, siralama: number) => api.get('/universiteler/tahmin', { params: { net, siralama } }).then(res => ({ data: { veri: res.data.veri } })),
  hedeflerim: () => api.get('/universiteler/hedeflerim').then(res => ({ data: { veri: res.data.veri } })),
  hedefEkle: (bolumId: string, oncelik: number = 1) => api.post('/universiteler/hedef', { bolumId, oncelik }),
  hedefSil: (bolumId: string) => api.delete(`/universiteler/hedef/${bolumId}`),
};

export const soruApi = {
  konular: (ogretimTuru?: string, ek?: any) =>
    api.get('/sorular/konular', { params: { ogretimTuru, ...ek } }).then(res => ({ data: { veri: res.data.veri } })),
};

export const adminApi = {
  sinavlar: () => api.get('/admin/sinavlar').then(res => ({ data: { veri: res.data.veri } })),
  sinavTakvim: (params?: { yil?: number; ay?: number }) =>
    api.get('/admin/sinav-takvim', { params }).then((res) => ({ data: { veri: res.data.veri, meta: res.data.meta } })),
  sinavTakvimOlustur: (veri: Record<string, unknown>) =>
    api.post('/admin/sinav-takvim', veri).then((res) => ({ data: { veri: res.data.veri } })),
  sinavTakvimGuncelle: (id: string, veri: Record<string, unknown>) =>
    api.put(`/admin/sinav-takvim/${id}`, veri).then((res) => ({ data: { veri: res.data.veri } })),
  sinavTakvimSil: (id: string) => api.delete(`/admin/sinav-takvim/${id}`),
  sinavDetay: (id: string) => api.get(`/admin/sinavlar/${id}`).then(res => ({ data: { veri: res.data.veri } })),
  sinavSureAnalizi: (sinavId: string) =>
    api.get(`/admin/sinavlar/${sinavId}/sure-analizi`).then((res) => ({ data: { veri: res.data.veri } })),
  sinavKatilimlar: (sinavId: string) =>
    api.get(`/admin/sinavlar/${sinavId}/katilimlar`).then((res) => ({ data: { veri: res.data.veri } })),
  denemeKarnesi: (sinavId: string, katilimId: string) =>
    api.get(`/admin/sinavlar/${sinavId}/katilim/${katilimId}/karnesi`).then((res) => ({ data: { veri: res.data.veri } })),
  sinavSorulari: (sinavId: string) => api.get(`/admin/sinavlar/${sinavId}/sorular`).then(res => ({ data: { veri: res.data.veri } })),
  sinavSoruKaldir: (sinavId: string, soruId: string) => api.delete(`/admin/sinavlar/${sinavId}/sorular/${soruId}`).then(res => ({ data: { veri: res.data.veri } })),
  sinavOlustur: (veri: Record<string, unknown>) => api.post('/admin/sinavlar', veri).then(res => ({ data: { veri: res.data.veri } })),
  sinavGuncelle: (id: string, veri: Record<string, unknown>) => api.put(`/admin/sinavlar/${id}`, veri).then(res => ({ data: { veri: res.data.veri } })),
  sinavSil: (id: string) => api.delete(`/admin/sinavlar/${id}`),
  soruEkle: (sinavId: string, veri: any) => api.post(`/admin/sinavlar/${sinavId}/sorular`, veri),
  sinavOgrenciAta: (sinavId: string, veri: any) => api.post(`/admin/sinavlar/${sinavId}/ogrenci-ata`, veri),
  sinavOgrenciAtamaKaldir: (sinavId: string, ogrenciId: string) => api.delete(`/admin/sinavlar/${sinavId}/ogrenci/${ogrenciId}`),
  sinavAtananOgrenciler: (sinavId: string) => api.get(`/admin/sinavlar/${sinavId}/ogrenciler`).then(res => ({ data: { veri: res.data.veri } })),
  sinavBankadanDoldur: (sinavId: string) => api.post(`/admin/sinavlar/${sinavId}/bankadan-doldur`, {}).then(res => ({ data: { veri: res.data.veri } })),
  sinavSoruAta: (sinavId: string, soruIds: string[]) =>
    api.post(`/admin/sinavlar/${sinavId}/soru-ata`, { soruIds }).then((res) => ({
      data: {
        basarili: res.data?.basarili !== false,
        veri: res.data?.veri,
      },
    })),
  konuSorulari: (konuId: string) =>
    api
      .get('/sorular/hepsi', {
        params: { konuId, onayDurumu: 'ONAYLANDI', boyut: 200 },
      })
      .then((res) => ({ data: { veri: res.data.veri } })),
  konuSoruSayilari: () => api.get('/admin/sorular/konu-sayilari').then(res => ({ data: { veri: res.data.veri } })),
  soruBankaToplu: (veri: any) => api.post('/admin/sorular/banka', veri).then(res => ({ data: { veri: res.data.veri } })),
  soruOnayGuncelle: (id: string, veri: any) => api.patch(`/admin/sorular/${id}/onay`, veri),
  soruTopluOnayGuncelle: (veri: any) => api.patch('/admin/sorular/toplu-onay', veri),
  soruTopluKazanimGuncelle: (veri: { soruIds: string[]; kazanim: string }) => api.patch('/admin/sorular/toplu-kazanim', veri),
  soruTopluUygunGrupGuncelle: (veri: { soruIds: string[]; uygunGrupIds: string[] }) => api.patch('/admin/sorular/toplu-uygun-grup', veri),
  soruTopluSil: (veri: any) => api.delete('/admin/sorular/toplu-sil', { data: veri }),
  soruGuncelle: (id: string, veri: any) => api.patch(`/admin/sorular/${id}`, veri),
  soruKopyalaTyt: (id: string, veri: { targetKonuId: string }) => api.post(`/admin/sorular/${id}/copy-to-tyt`, veri),
  soruTopluKopyalaTyt: (veri: { soruIds: string[]; targetKonuId: string }) => api.post('/admin/sorular/toplu-copy-to-tyt', veri),
  sorularGrubaAta: (veri: any) => api.post('/admin/sorular/gruba-ata', veri),
  kullanicilar: (params?: { sayfa?: number; boyut?: number; rol?: string; q?: string }) =>
    api.get('/admin/kullanicilar', { params }).then(res => ({ data: { veri: res.data.veri, meta: res.data.meta } })),
  kullaniciOlustur: (veri: any) => api.post('/admin/kullanicilar', veri),
  veliOgrenciEslestir: (veri: { veliEmail: string; ogrenciEmail: string }) =>
    api.post('/admin/kullanicilar/veli-eslestir', veri),
  kullaniciGuncelle: (id: string, veri: any) => api.patch(`/admin/kullanicilar/${id}`, veri),
  kullaniciSil: (id: string) => api.delete(`/admin/kullanicilar/${id}`),
  kullaniciTopluSil: (veri: { kullaniciIds: string[] }) => api.delete('/admin/kullanicilar/toplu-sil', { data: veri }),
  siparisOzet: () => api.get('/admin/siparisler/ozet').then(res => ({ data: { veri: res.data.veri } })),
  siparisler: (params?: any) => api.get('/admin/siparisler', { params }).then(res => ({ data: { veri: res.data.veri, meta: res.data.meta } })),
  siparisDetay: (id: string) => api.get(`/admin/siparisler/${id}`).then(res => ({ data: { veri: res.data.veri } })),
  siparisGuncelle: (id: string, veri: any) => api.patch(`/admin/siparisler/${id}`, veri),
  siparisManuelOlustur: (veri: any) => api.post('/admin/siparisler', veri),
  analitik: () => api.get('/admin/analitik').then(res => ({ data: { veri: res.data.veri } })),
  ogretmenAktivite: (params?: { q?: string; aktif?: string; baslangicTarihi?: string; bitisTarihi?: string }) =>
    api.get('/admin/ogretmen-aktivite', { params }).then(res => ({ data: { veri: res.data.veri } })),
  ogretmenAktiviteDetay: (kullaniciId: string, params?: { baslangicTarihi?: string; bitisTarihi?: string; limit?: number }) =>
    api.get(`/admin/ogretmen-aktivite/${kullaniciId}`, { params }).then(res => ({ data: { veri: res.data.veri } })),
  gruplar: () => api.get('/admin/gruplar').then(res => ({ data: { veri: res.data.veri } })),
  bransSecenekleri: () => api.get('/admin/gruplar/brans-secenekleri').then(res => ({ data: { veri: res.data.veri } })),
  grupHavuzOzet: (grupId: string) => api.get(`/admin/gruplar/${grupId}/havuz-ozet`).then(res => ({ data: { veri: res.data.veri } })),
  paketler: () => api.get('/paketler').then(res => ({ data: { veri: res.data.veri } })),
  paketKategorileri: () => api.get('/paketler/kategoriler').then(res => ({ data: { veri: res.data.veri } })),
  paketKategoriOlustur: (veri: Record<string, unknown>) => api.post('/paketler/kategoriler', veri),
  paketKategoriGuncelle: (id: string, veri: Record<string, unknown>) => api.put(`/paketler/kategoriler/${id}`, veri),
  paketKategoriSil: (id: string) => api.delete(`/paketler/kategoriler/${id}`),
  paketOlustur: (veri: Record<string, unknown>) => api.post('/paketler', veri),
  paketGuncelle: (id: string, veri: Record<string, unknown>) => api.put(`/paketler/${id}`, veri),
  paketSil: (id: string) => api.delete(`/paketler/${id}`),
  sinavFiyatKademeleri: () =>
    api.get('/paketler/sinav-fiyat-kademeleri').then((res) => ({ data: { veri: res.data.veri } })),
  sinavFiyatKademeleriKaydet: (veri: Record<string, unknown>) =>
    api.put('/paketler/sinav-fiyat-kademeleri', veri).then((res) => ({ data: { veri: res.data.veri } })),

  // Eğitim Materyali (RAG)
  egitimDokumanlar: (params?: { ders?: string; konuId?: string; durum?: string }) =>
    api.get('/admin/egitim-dokumanlar', { params }).then((res) => ({
      data: {
        veri: res.data.veri,
        ozet: res.data.ozet as { toplam: number; toplamBoyut: number; toplamChunk: number } | undefined,
      },
    })),
  egitimDokumanDetay: (id: string) =>
    api.get(`/admin/egitim-dokumanlar/${id}`).then(res => ({ data: { veri: res.data.veri } })),
  egitimDokumanYuklemeUrl: (veri: { dosyaAd: string; dosyaTipi: string; dosyaBoyut: number }) =>
    api.post('/admin/egitim-dokumanlar/yukleme-url', veri).then(res => ({ data: { veri: res.data.veri } })),
  egitimDokumanYukle: (form: FormData) =>
    api.post('/admin/egitim-dokumanlar', form, {
      timeout: 300000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }).then(res => ({ data: { veri: res.data.veri } })),
  egitimDokumanKaydet: (veri: Record<string, unknown>) =>
    api.post('/admin/egitim-dokumanlar', veri).then(res => ({ data: { veri: res.data.veri } })),
  egitimDokumanSil: (id: string) => api.delete(`/admin/egitim-dokumanlar/${id}`),
  egitimDokumanYenidenIsle: (id: string) => api.post(`/admin/egitim-dokumanlar/${id}/yeniden-isle`),

  /** ÖSYM resmi sayfa takibi (YKS kılavuzu hash, anasayfa bağlantıları → duyuru) */
  osymDurum: () => api.get('/admin/osym/durum').then((res) => ({ data: { veri: res.data.veri } })),
  osymTara: (duyuruAktar = true) =>
    api.post('/admin/osym/tara', { duyuruAktar }).then((res) => ({ data: { veri: res.data.veri } })),

  /** Yönetici YZ sohbet (sınav / müfredat / ÖSYM) */
  yardimAsistaniMesaj: (mesajlar: { role: string; content: string }[]) =>
    api
      .post('/admin/yardim-asistani/mesaj', { mesajlar })
      .then((res) => ({ data: { veri: res.data.veri } })),
};

/** Kimlik gerektirmeyen genel uçlar */
export const publicApi = {
  osymOzet: () => api.get('/public/osym-ozet').then((res) => ({ data: { veri: res.data.veri } })),
  sinavTakvim: (params?: { yil?: number; ay?: number }) =>
    api.get('/public/sinav-takvim', { params }).then((res) => ({ data: { veri: res.data.veri, meta: res.data.meta } })),
  iletisimFormuGonder: (veri: { adSoyad: string; eposta: string; konu: string; mesaj: string }) =>
    api.post('/iletisim', veri).then((res) => ({
      data: { veri: res.data.veri, mesaj: res.data.mesaj as string },
    })),
};
