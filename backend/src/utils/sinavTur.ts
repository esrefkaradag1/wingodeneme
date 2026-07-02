import { SinavTuru } from '@prisma/client';

const GECERLI_TURLER: SinavTuru[] = ['TYT', 'AYT', 'AYT_TYT', 'LGS', 'KPSS'];

export function parseSinavTuru(raw: unknown): SinavTuru {
  const tur = typeof raw === 'string' ? raw.trim() : '';
  if (GECERLI_TURLER.includes(tur as SinavTuru)) {
    return tur as SinavTuru;
  }
  throw new Error(
    `Geçersiz sınav türü: ${tur || '(boş)'}. Geçerli değerler: ${GECERLI_TURLER.join(', ')}`,
  );
}

export function prismaSinavTuruHatasiMi(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('SinavTuru') ||
    msg.includes('AYT_TYT') ||
    msg.includes('invalid input value for enum')
  );
}
