import { AppHatasi } from '../middlewares/hata.middleware';

/** Tüm AI çağrıları için tek OpenRouter anahtarı (OPENROUTER_API_KEY). */
export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new AppHatasi(
      'OPENROUTER_API_KEY tanımlı değil. backend/.env dosyasına OpenRouter anahtarını ekleyin.',
      503,
    );
  }
  return key;
}
