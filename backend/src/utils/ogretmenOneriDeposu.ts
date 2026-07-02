import path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { s3AnahtarlariGecerli } from './storageYapilandirma';
import { s3DosyaYukle } from './s3';
import { logger } from './logger';

export const OGRETMEN_ONERI_LOCAL_PREFIX = 'local:ogretmen-oneri/';

export type OgretmenOneriGorsel = {
  id: string;
  url: string;
  dosyaAdi: string;
  mimeType: string;
  boyut: number;
};

const KABUL_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function ogretmenOneriGorselKabulMu(mimeType?: string): boolean {
  return Boolean(mimeType && KABUL_MIME.has(mimeType));
}

export function ogretmenOneriDepoKoku(): string {
  const ozel = process.env.OGRETMEN_ONERI_UPLOAD_DIR?.trim();
  if (ozel) return path.resolve(ozel);
  return path.resolve(process.cwd(), 'uploads', 'ogretmen-onerileri');
}

export function yerelOgretmenOneriDosyasiMi(url?: string | null): boolean {
  return Boolean(url?.startsWith(OGRETMEN_ONERI_LOCAL_PREFIX));
}

export function ogretmenOneriDosyaMutlakYol(dosyaRef: string): string {
  if (!yerelOgretmenOneriDosyasiMi(dosyaRef)) {
    throw new Error('Geçersiz yerel dosya yolu');
  }
  const rel = dosyaRef.slice(OGRETMEN_ONERI_LOCAL_PREFIX.length);
  const kok = ogretmenOneriDepoKoku();
  const abs = path.resolve(kok, rel);
  if (!abs.startsWith(kok)) {
    throw new Error('Dosya yolu güvenlik kontrolünden geçemedi');
  }
  return abs;
}

function guvenliDosyaAdi(raw: string): string {
  const uzanti = path.extname(raw).slice(0, 8);
  const govde = path.basename(raw, uzanti).replace(/[^\w.\-]/g, '_').slice(0, 80);
  return `${govde || 'gorsel'}${uzanti || '.jpg'}`;
}

export function ogretmenOneriGorselUrlCoz(url: string, apiTaban = '/api/v1'): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/api/')) {
    return url;
  }
  if (yerelOgretmenOneriDosyasiMi(url)) {
    const rel = url.slice(OGRETMEN_ONERI_LOCAL_PREFIX.length);
    const slash = rel.indexOf('/');
    if (slash === -1) return url;
    const oneriId = rel.slice(0, slash);
    const dosyaAdi = rel.slice(slash + 1);
    return `${apiTaban}/ogretmen-onerileri/dosya/${encodeURIComponent(oneriId)}/${encodeURIComponent(dosyaAdi)}`;
  }
  return url;
}

export async function ogretmenOneriGorselKaydet(
  oneriId: string,
  icerik: Buffer,
  orijinalAd: string,
  mimeType: string,
): Promise<OgretmenOneriGorsel> {
  const dosyaAdi = guvenliDosyaAdi(orijinalAd);
  const id = uuidv4();

  if (s3AnahtarlariGecerli()) {
    try {
      const url = await s3DosyaYukle(icerik, `${id}-${dosyaAdi}`, mimeType, 'ogretmen-onerileri');
      return { id, url, dosyaAdi, mimeType, boyut: icerik.length };
    } catch (e) {
      logger.warn('[OgretmenOneri] S3 yükleme başarısız, yerel diske yazılıyor', e);
    }
  }

  const rel = `${oneriId}/${id}-${dosyaAdi}`;
  const hedef = path.join(ogretmenOneriDepoKoku(), rel);
  await fs.mkdir(path.dirname(hedef), { recursive: true });
  await fs.writeFile(hedef, icerik);

  return {
    id,
    url: `${OGRETMEN_ONERI_LOCAL_PREFIX}${rel}`,
    dosyaAdi,
    mimeType,
    boyut: icerik.length,
  };
}
