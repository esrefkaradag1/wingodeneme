import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../lib/config';
import { useAuthStore } from '../store/auth';
import type { ApiEnvelope, Kullanici, SinavOzet } from '../lib/types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, platformMode } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Platform-Mode'] = platformMode;
  // FormData'da boundary tarayıcı/RN tarafında set edilmeli
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof (config.headers as any).delete === 'function') {
      (config.headers as any).delete('Content-Type');
    } else if (config.headers) {
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  }
  return config;
});

let yenilePromise: Promise<string | null> | null = null;

async function tokenYenile(): Promise<string | null> {
  const { refreshToken, setTokens, cikisYap } = useAuthStore.getState();
  if (!refreshToken) {
    cikisYap();
    return null;
  }
  try {
    const { data } = await axios.post<ApiEnvelope<{ token: string; refreshToken: string }>>(
      `${API_BASE_URL}/auth/token-yenile`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const yeni = data.veri;
    setTokens(yeni.token, yeni.refreshToken);
    return yeni.token;
  } catch {
    cikisYap();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      if (original.url?.includes('/auth/token-yenile') || original.url?.includes('/auth/giris')) {
        return Promise.reject(error);
      }
      original._retry = true;
      yenilePromise = yenilePromise ?? tokenYenile().finally(() => {
        yenilePromise = null;
      });
      const yeniToken = await yenilePromise;
      if (yeniToken) {
        original.headers.Authorization = `Bearer ${yeniToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function apiHataMesaji(err: unknown, yedek = 'Bir hata oluştu'): string {
  const ax = err as AxiosError<ApiEnvelope<unknown>>;
  return ax?.response?.data?.mesaj || ax?.message || yedek;
}

export function listeyeCevir(veri: unknown): any[] {
  if (Array.isArray(veri)) return veri;
  if (veri && typeof veri === 'object') {
    const o = veri as Record<string, unknown>;
    for (const k of [
      'sinavlar',
      'liste',
      'items',
      'veri',
      'duyurular',
      'siparisler',
      'arkadaslar',
      'talepler',
      'planlar',
      'davetler',
      'istekler',
      'mesajlar',
      'bolumler',
      'hedefler',
      'gorevler',
      'universiteler',
    ]) {
      if (Array.isArray(o[k])) return o[k] as any[];
    }
  }
  return [];
}

export const authApi = {
  giris: (email: string, sifre: string) =>
    api.post<ApiEnvelope<{ token: string; refreshToken: string; kullanici: Kullanici }>>(
      '/auth/giris',
      { email, sifre },
    ),
  me: () => api.get<ApiEnvelope<any>>('/auth/me'),
  cikis: () => api.post('/auth/cikis'),
};

export const sinavApi = {
  liste: () => api.get<ApiEnvelope<SinavOzet[] | { sinavlar?: SinavOzet[] }>>('/sinavlar'),
  katilimlarim: () => api.get<ApiEnvelope<any>>('/sinavlar/katilimlarim'),
  takvim: (yil: number, ay: number) =>
    api.get<ApiEnvelope<any>>('/sinavlar/takvim', { params: { yil, ay } }),
  publicTakvim: (yil: number, ay: number) =>
    api.get<ApiEnvelope<any>>('/public/sinav-takvim', { params: { yil, ay } }),
  katil: (id: string) => api.post<ApiEnvelope<any>>(`/sinavlar/${id}/katil`),
  taslak: (katilimId: string, cevaplar: { soruId: string; secilen: string | null; sureMs?: number }[]) =>
    api.post(`/sinavlar/katilim/${katilimId}/cevaplar/taslak`, { cevaplar }),
  bitir: (katilimId: string, cevaplar: { soruId: string; secilen: string | null; sureMs?: number }[]) =>
    api.post<ApiEnvelope<any>>(`/sinavlar/katilim/${katilimId}/cevaplar`, { cevaplar }),
  sonuc: (katilimId: string) => api.get<ApiEnvelope<any>>(`/sinavlar/katilim/${katilimId}/sonuc`),
};

export const analizApi = {
  benim: () => api.get<ApiEnvelope<any>>('/analiz/benim'),
  oneriler: () => api.get<ApiEnvelope<any>>('/analiz/oneriler'),
};

export const kullaniciApi = {
  navSayaclari: () => api.get<ApiEnvelope<any>>('/kullanicilar/nav-sayaclari'),
  profil: () => api.get<ApiEnvelope<any>>('/kullanicilar/profil'),
  profilGuncelle: (veri: Record<string, unknown>) =>
    api.put<ApiEnvelope<any>>('/kullanicilar/profil', veri),
  avatarYukle: (form: FormData) =>
    api.post<ApiEnvelope<{ avatarUrl: string | null; ad?: string; soyad?: string }>>(
      '/kullanicilar/profil/avatar',
      form,
      { timeout: 90000 },
    ),
  sifreDegistir: (veri: { mevcutSifre: string; yeniSifre: string }) =>
    api.put('/kullanicilar/profil/sifre', veri),
  kocReferansBagla: (referansKod: string) =>
    api.post<ApiEnvelope<any>>('/kullanicilar/koc-referans-bagla', { referansKod }),
  studyPlanlar: () => api.get<ApiEnvelope<any>>('/kullanicilar/study-planlar'),
  studyGorevDurum: (gorevId: string, tamamlandi: boolean) =>
    api.patch(`/kullanicilar/study-planlar/gorev/${gorevId}`, { tamamlandi }),
  pushTokenKaydet: (token: string) =>
    api.put<ApiEnvelope<{ kaydedildi: boolean }>>('/kullanicilar/push-token', { token }),
  pushTokenTemizle: () => api.delete<ApiEnvelope<{ kaydedildi: boolean }>>('/kullanicilar/push-token'),
};

export const aiApi = {
  studyPlan: () => api.post<ApiEnvelope<any>>('/ai/study-plan'),
  analiz: () => api.get<ApiEnvelope<any>>('/ai/analiz'),
};

export const duyuruApi = {
  benim: () => api.get<ApiEnvelope<any>>('/duyurular/benim'),
  oku: (duyuruId: string) => api.patch(`/duyurular/benim/${duyuruId}/oku`),
};

export const destekApi = {
  liste: () => api.get<ApiEnvelope<any>>('/destek/benim'),
  olustur: (veri: { baslik: string; mesaj: string }) => api.post('/destek/benim', veri),
  detay: (id: string) => api.get<ApiEnvelope<any>>(`/destek/benim/${id}`),
  mesaj: (id: string, mesaj: string) => api.post(`/destek/benim/${id}/mesaj`, { mesaj }),
};

export const sosyalApi = {
  arkadaslar: () => api.get<ApiEnvelope<any>>('/sosyal/arkadaslar'),
  gelenIstekler: () => api.get<ApiEnvelope<any>>('/sosyal/arkadaslik/istekler/gelen'),
  kullaniciAra: (query: string) =>
    api.get<ApiEnvelope<any>>('/sosyal/kullanici-ara', { params: { query } }),
  arkadasIstek: (hedefId: string) => api.post(`/sosyal/arkadaslik/${hedefId}`),
  arkadasYanit: (id: string, kabul: boolean) =>
    api.patch(`/sosyal/arkadaslik/${id}/yanit`, { kabul }),
  puanKarsilastir: (arkadasId: string) =>
    api.get<ApiEnvelope<any>>(`/sosyal/karsilastir/${arkadasId}`),
  gelenDuellolar: () => api.get<ApiEnvelope<any>>('/sosyal/duello/davetler/gelen'),
  duelloBaslat: (davetEdilenId: string, konuId?: string) =>
    api.post(`/sosyal/duello/${davetEdilenId}`, { konuId }),
  duelloYanit: (id: string, kabul: boolean) =>
    api.patch(`/sosyal/duello/${id}/yanit`, { kabul }),
};

export const universiteApi = {
  hedeflerim: () => api.get<ApiEnvelope<any>>('/universiteler/hedeflerim'),
  ara: (params: Record<string, string | number | undefined>) =>
    api.get<ApiEnvelope<any>>('/universiteler/ara', { params }),
  tahmin: (params?: Record<string, string | number>) =>
    api.get<ApiEnvelope<any>>('/universiteler/tahmin', { params }),
  hedefEkle: (bolumId: string, oncelik = 1) =>
    api.post('/universiteler/hedef', { bolumId, oncelik }),
  hedefSil: (bolumId: string) => api.delete(`/universiteler/hedef/${bolumId}`),
};

export default api;
