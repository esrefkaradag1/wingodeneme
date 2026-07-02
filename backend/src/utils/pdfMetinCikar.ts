/**
 * PDF → metin (Node / Vercel serverless uyumlu).
 * pdf-parse v1 kullanır; v2 worker dosyası gerektirmez.
 */
import fs from 'fs/promises';

export interface PdfMetinSonuc {
  text: string;
  pageCount: number;
  pages: Array<{ num: number; text: string }>;
}

export interface PdfSayfaAraligi {
  baslangic?: number | null;
  bitis?: number | null;
}

type PdfParseFn = (
  buffer: Buffer,
  options?: { max?: number; pagerender?: (pageData: PdfSayfaVerisi) => Promise<string> },
) => Promise<{ text?: string; numpages?: number }>;

type PdfSayfaVerisi = {
  getTextContent: (opts: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }) => Promise<{
    items: Array<{ str: string; transform: number[] }>;
  }>;
};

function varsayilanSayfaRender(pageData: PdfSayfaVerisi): Promise<string> {
  return pageData
    .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then((textContent) => {
      let lastY: number | undefined;
      let text = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || lastY === undefined) {
          text += item.str;
        } else {
          text += `\n${item.str}`;
        }
        lastY = item.transform[5];
      }
      return text;
    });
}

let _pdfParse: PdfParseFn | null = null;

function pdfParseFn(): PdfParseFn {
  if (_pdfParse) return _pdfParse;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('pdf-parse');
  const fn = (typeof mod === 'function' ? mod : mod?.default) as PdfParseFn;
  if (typeof fn !== 'function') {
    throw new Error('pdf-parse modülü yüklenemedi.');
  }
  _pdfParse = fn;
  return fn;
}

/** Ham metni sayfa parçalarına ayırır (form feed veya tek sayfa). */
export function pdfMetniSayfalaraBol(text: string, numpages?: number): Array<{ num: number; text: string }> {
  const temiz = (text || '').replace(/\r\n/g, '\n').trim();
  if (!temiz) return [];

  let parcalar = temiz
    .split(/\f+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  if (parcalar.length <= 1) {
    parcalar = [temiz];
  }

  const pages = parcalar.map((t, i) => ({ num: i + 1, text: t }));
  const pageCount = Math.max(numpages || 0, pages.length, 1);
  while (pages.length < pageCount && pages.length > 0) {
    /* numpages > ayrıştırılan parça: son sayfayı bölme — tek blok yeterli */
    break;
  }
  return pages.length > 0 ? pages : [{ num: 1, text: temiz }];
}

export async function pdfBufferdanMetin(buffer: Buffer, aralik?: PdfSayfaAraligi | null): Promise<string> {
  const bas = aralik?.baslangic ?? null;
  const bit = aralik?.bitis ?? null;
  const fn = pdfParseFn();

  if (!bas && !bit) {
    const sonuc = await fn(buffer);
    return (sonuc?.text || '').replace(/\r\n/g, '\n').trim();
  }

  let sayfaNo = 0;
  const sonuc = await fn(buffer, {
    max: bit && bit > 0 ? bit : 0,
    pagerender: (pageData) => {
      sayfaNo += 1;
      if (bas && sayfaNo < bas) return Promise.resolve('');
      if (bit && sayfaNo > bit) return Promise.resolve('');
      return varsayilanSayfaRender(pageData);
    },
  });
  return (sonuc?.text || '').replace(/\r\n/g, '\n').trim();
}

export async function pdfBufferdanMetinDetay(buffer: Buffer, maxChars?: number): Promise<PdfMetinSonuc> {
  const fn = pdfParseFn();
  const sonuc = await fn(buffer);
  let text = (sonuc?.text || '').replace(/\r\n/g, '\n').trim();
  const pageCount = Math.max(sonuc?.numpages || 1, 1);
  const pages = pdfMetniSayfalaraBol(text, sonuc?.numpages);

  const limit = maxChars ?? 900_000;
  if (text.length > limit) {
    text = text.substring(0, limit);
  }

  return { text, pageCount, pages };
}

export async function pdfDosyadanMetin(dosyaYolu: string, aralik?: PdfSayfaAraligi | null): Promise<string> {
  const buf = await fs.readFile(dosyaYolu);
  return pdfBufferdanMetin(buf, aralik);
}

export async function pdfDosyadanMetinDetay(dosyaYolu: string, maxChars?: number): Promise<PdfMetinSonuc> {
  const buf = await fs.readFile(dosyaYolu);
  return pdfBufferdanMetinDetay(buf, maxChars);
}
