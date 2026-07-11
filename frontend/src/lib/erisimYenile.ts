import type { QueryClient } from '@tanstack/react-query';

/**
 * Satın alma (özellikle ücretsiz deneme/paket) sonrası erişim hakları anında
 * değiştiği için, global staleTime nedeniyle bayat kalan sınav/analiz/takvim
 * sorgularını geçersiz kılıp yeniden çekilmesini tetikler.
 */
export function erisimSonrasiYenile(queryClient: QueryClient): void {
  const anahtarlar = [
    ['sinavlar'],
    ['analiz'],
    ['takvim'],
    ['oneriler'],
    ['paketler'],
  ];
  for (const anahtar of anahtarlar) {
    queryClient.invalidateQueries({ queryKey: anahtar });
  }
}
