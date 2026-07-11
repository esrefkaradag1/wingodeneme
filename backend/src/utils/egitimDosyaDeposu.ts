import path from 'path';
import * as fs from 'fs/promises';

const LOCAL_PREFIX = 'local:egitim/';

export function egitimDepoKoku(): string {
  const ozel = process.env.EGITIM_UPLOAD_DIR?.trim();
  if (ozel) return path.resolve(ozel);
  // Vercel/serverless ortamında proje kökü (/var/task) salt okunurdur;
  // yalnızca /tmp yazılabilir olduğundan oraya yönlendiriyoruz.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'uploads', 'egitim');
  }
  return path.resolve(process.cwd(), 'uploads', 'egitim');
}

export function yerelEgitimDosyasiMi(dosyaUrl?: string | null): boolean {
  return Boolean(dosyaUrl?.startsWith(LOCAL_PREFIX));
}

export function egitimDosyaMutlakYol(dosyaUrl: string): string {
  if (!yerelEgitimDosyasiMi(dosyaUrl)) {
    throw new Error('Geçersiz yerel dosya yolu');
  }
  const rel = dosyaUrl.slice(LOCAL_PREFIX.length);
  const kok = egitimDepoKoku();
  const abs = path.resolve(kok, rel);
  if (!abs.startsWith(kok)) {
    throw new Error('Dosya yolu güvenlik kontrolünden geçemedi');
  }
  return abs;
}

function guvenliDosyaAdi(raw: string): string {
  return String(raw || 'dokuman')
    .replace(/[^\w.\-]/g, '_')
    .slice(0, 160);
}

/** Sunucu diskinde sakla; dosyaUrl referansı döner */
export async function egitimDosyaKaydet(
  dokumanId: string,
  icerik: Buffer,
  orijinalAd: string,
): Promise<string> {
  const ad = guvenliDosyaAdi(orijinalAd);
  const klasor = path.join(egitimDepoKoku(), dokumanId);
  await fs.mkdir(klasor, { recursive: true });
  const hedef = path.join(klasor, ad);
  await fs.writeFile(hedef, icerik);
  return `${LOCAL_PREFIX}${dokumanId}/${ad}`;
}

export async function egitimDosyaSil(dosyaUrl?: string | null): Promise<void> {
  if (!dosyaUrl) return;
  if (yerelEgitimDosyasiMi(dosyaUrl)) {
    try {
      const abs = egitimDosyaMutlakYol(dosyaUrl);
      await fs.unlink(abs).catch(() => undefined);
      await fs.rmdir(path.dirname(abs)).catch(() => undefined);
    } catch {
      /* sessiz */
    }
    return;
  }
}
