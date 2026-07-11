/** Üretimde iyzico callback ve dış URL'ler için API taban adresi. */
export function publicApiBaseUrl(): string {
  const adaylar = [
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/v1` : undefined,
  ].filter(Boolean) as string[];

  const taban = adaylar[0] || 'http://localhost:4000/api/v1';
  return taban.replace(/\/$/, '');
}
