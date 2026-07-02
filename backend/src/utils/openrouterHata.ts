import { AppHatasi } from '../middlewares/hata.middleware';
export { OPENROUTER_YEDEK_MODELLER } from '../config/openrouterModeller';

type AxiosLikeHata = {
  response?: { status?: number; data?: { error?: { message?: string } } };
  message?: string;
};

export function openrouterAxiosHata(err: unknown): AppHatasi {
  const e = err as AxiosLikeHata;
  const status = e?.response?.status;
  const apiMsg = e?.response?.data?.error?.message || e?.message || 'OpenRouter isteği başarısız';

  if (status === 402) {
    return new AppHatasi(
      'OpenRouter kredisi yetersiz veya seçilen model ücretli. openrouter.ai hesabınıza kredi ekleyin veya REFERANS_URETIM_MODEL ile uygun bir model tanımlayın.',
      402,
    );
  }
  if (status === 401) {
    return new AppHatasi('OpenRouter API anahtarı geçersiz (OPENROUTER_API_KEY kontrol edin).', 401);
  }
  if (status === 429) {
    return new AppHatasi('OpenRouter istek limiti aşıldı; kısa süre sonra tekrar deneyin.', 429);
  }
  if (status && status >= 400 && status < 600) {
    return new AppHatasi(apiMsg, status);
  }
  return new AppHatasi(apiMsg, 502);
}

export function openrouterModelKullanilamaz(err: unknown): boolean {
  const e = err as AxiosLikeHata;
  const status = e?.response?.status;
  const mesaj = String(e?.response?.data?.error?.message || e?.message || '');
  if (status === 402 || status === 401) return true;
  if (status === 404) return true;
  if (/No endpoints found|not found|does not exist|invalid model/i.test(mesaj)) return true;
  return false;
}
