/**
 * WingoDeneme — RAG (Retrieval-Augmented Generation) Servisi
 *
 * Sorumluluklar:
 *  - Yüklenen dokümanları (PDF, DOCX, TXT, MD) ham metne çevirir
 *  - Metni mantıksal chunk'lara böler (~600 token)
 *  - Her chunk için OpenAI embedding üretir (text-embedding-3-small / 1536 dim)
 *  - Chunk + embedding'i Postgres'e (pgvector) yazar (raw SQL)
 *  - Konu/ders bazlı similarity search (kosinüs)
 */
import OpenAI from 'openai';
import axios from 'axios';
import * as fs from 'fs/promises';
import { prisma } from '../config/database';
import { OgretimTuru } from '@prisma/client';
import { logger } from '../utils/logger';
import { yerelEgitimDosyasiMi, egitimDosyaMutlakYol } from '../utils/egitimDosyaDeposu';
import { getOpenRouterApiKey } from '../config/openrouter';
import { openrouterHttpHeaders } from '../utils/openrouterHeaders';
import { pdfDosyadanMetin, type PdfSayfaAraligi } from '../utils/pdfMetinCikar';

// Lazy init — embedding anahtarı tanımlı değilse RAG dışı kodu kırmasın
let _openai: OpenAI | null = null;
let _embeddingProvider: 'openai' | 'openrouter' | null = null;

function embeddingProvider(): 'openai' | 'openrouter' {
  // Öncelik: OpenRouter (projede zaten soru üretimi için kullanılıyor)
  if (process.env.OPENROUTER_API_KEY?.trim()) return 'openrouter';
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai';
  throw new Error('Embedding için OPENROUTER_API_KEY tanımlı olmalı (tüm AI OpenRouter üzerinden).');
}

function openaiClient(): OpenAI {
  if (_openai) return _openai;
  const prov = embeddingProvider();
  _embeddingProvider = prov;

  if (prov === 'openrouter') {
    const key = getOpenRouterApiKey();
    _openai = new OpenAI({
      apiKey: key,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: openrouterHttpHeaders(),
    });
  } else {
    const key = process.env.OPENAI_API_KEY!;
    _openai = new OpenAI({ apiKey: key });
  }

  return _openai;
}

function embeddingModel(): string {
  if (process.env.RAG_EMBEDDING_MODEL) return process.env.RAG_EMBEDDING_MODEL;
  // OpenRouter'da OpenAI embedding modelleri genelde provider prefix'i ile çağrılır.
  return _embeddingProvider === 'openrouter' ? 'openai/text-embedding-3-small' : 'text-embedding-3-small';
}
const EMBEDDING_DIM = 1536;
const CHUNK_KARAKTER = 1800;        // ~600 token
const CHUNK_OVERLAP_KARAKTER = 200; // chunklar arası bağlam köprüsü

function lokalEmbeddingUret(metin: string): number[] {
  // Ağ hatalarında sistemi bloklamamak için deterministik hash embedding fallback'i.
  // Kalitesi uzak embedding kadar iyi değildir ama similarity akışını canlı tutar.
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  const t = (metin || '').toLowerCase();
  for (let i = 0; i < t.length; i++) {
    const code = t.charCodeAt(i);
    const idx1 = (code * 31 + i * 17) % EMBEDDING_DIM;
    const idx2 = (code * 131 + i * 7) % EMBEDDING_DIM;
    v[idx1] += 1;
    v[idx2] += 0.5;
  }
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

// ── 1. METİN ÇIKARMA ────────────────────────────────────────────────
/**
 * Dosya yolundan ham metni çıkarır.
 * dosyaTipi mime tipi (application/pdf, text/plain, ...) veya uzantı.
 */
export async function dosyadanMetinCikar(
  dosyaYolu: string,
  dosyaTipi: string,
  sayfaAraligi?: PdfSayfaAraligi | null,
): Promise<string> {
  const tip = (dosyaTipi || '').toLowerCase();

  // PDF (pdf-parse v1 — Vercel/serverless uyumlu, worker dosyası yok)
  if (tip.includes('pdf')) {
    return pdfDosyadanMetin(dosyaYolu, sayfaAraligi);
  }

  // DOCX
  if (tip.includes('word') || tip.includes('docx') || tip.includes('officedocument')) {
    const mammoth = await import('mammoth');
    const buf = await fs.readFile(dosyaYolu);
    const sonuc = await mammoth.extractRawText({ buffer: buf });
    return sonuc.value || '';
  }

  // TXT / MD / fallback
  return await fs.readFile(dosyaYolu, 'utf8');
}

/**
 * URL'den ham metin çıkarır (HTML veya PDF desteği).
 */
export async function urlDenMetinCikar(url: string, sayfaAraligi?: PdfSayfaAraligi | null): Promise<string> {
  try {
    // PDF olup olmadığını URL yapısından veya query parametrelerinden tespit et
    const isPdfUrl = /\.pdf(\?|#|$)/i.test(url);
    
    // Her durumda arraybuffer olarak çekip sonrasında tip kontrolü yapacağız.
    // Bu sayede binary PDF verisi text/UTF-8 olarak bozulmadan indirilir.
    const yanit = await axios.get(url, {
      timeout: 30000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,application/pdf,*/*;q=0.8',
      },
    });

    const contentType = String(yanit.headers['content-type'] || '').toLowerCase();
    const isPdf = isPdfUrl || contentType.includes('application/pdf');

    if (isPdf) {
      // PDF İşleme
      const buf = Buffer.from(yanit.data);
      const tmpYol = `/tmp/wingo-url-pdf-${Date.now()}`;
      await fs.writeFile(tmpYol, buf);
      try {
        return await dosyadanMetinCikar(tmpYol, 'application/pdf', sayfaAraligi);
      } finally {
        await fs.unlink(tmpYol).catch(() => undefined);
      }
    }

    // HTML / Metin İşleme
    const html = Buffer.from(yanit.data).toString('utf8');
    
    try {
      // Cheerio ile HTML taglerini ve gereksiz bileşenleri (nav, footer, script vb.) temizle
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      
      // İstenmeyen tüm tagleri uçur
      $('script, style, iframe, noscript, nav, footer, header, svg, link, meta, head').remove();
      
      // URL'in tabanını çözerek img src'lerini mutlak URL'e dönüştür ve metin içine yerleştir
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        parsedUrl = new URL('https://ogmmateryal.eba.gov.tr');
      }

      $('img').each((_, imgEl) => {
        const src = $(imgEl).attr('src');
        if (src) {
          try {
            const absoluteSrc = new URL(src, parsedUrl.origin).toString();
            // img etiketini metinsel markdown formatında değiştiriyoruz ki .text() ile kaybolmasın
            $(imgEl).replaceWith(`\n![Görsel](${absoluteSrc})\n`);
          } catch {
            // Hata durumunda yoksay
          }
        }
      });

      // Seçeneklerin (A, B, C, D, E) tek satırda birleşmesini önlemek için etraflarına yeni satır koy
      $('li, p, div, span').each((_, el) => {
        const text = $(el).text().trim();
        if (/^[A-E]\s*[\)\.\-]/i.test(text)) {
          $(el).prepend('\n').append('\n');
        }
      });

      let metin = $('body').text() || $.text();
      
      // Boşlukları ve yeni satırları makul bir şekilde temizle ama yapısal yeni satırları koru
      return metin
        .replace(/[ \t]+/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/\u00a0/g, ' ')
        .trim();
    } catch (e) {
      logger.warn(`[RAG] Cheerio html temizleme hatası (${(e as Error).message}), regex fallbağe geçiliyor.`);
      // Basit HTML temizleme (script, style ve tag'leri kaldır)
      let metin = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return metin;
    }
  } catch (e) {
    throw new Error(`URL içeriği alınamadı: ${(e as Error).message}`);
  }
}

// ── 2. CHUNKLAMA ────────────────────────────────────────────────────
export interface Chunk {
  metin: string;
  baslangic: number;
  bitis: number;
}

/**
 * Metni paragraf/satır sınırlarına saygı duyacak şekilde böler.
 * Çakışma (overlap) kullanır ki kavramlar yarıda kesilmesin.
 */
export function metniChunkla(metin: string): Chunk[] {
  if (!metin) return [];
  const temiz = metin.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
  if (temiz.length <= CHUNK_KARAKTER) {
    return [{ metin: temiz, baslangic: 0, bitis: temiz.length }];
  }

  const chunks: Chunk[] = [];
  let i = 0;
  while (i < temiz.length) {
    let son = Math.min(i + CHUNK_KARAKTER, temiz.length);
    if (son < temiz.length) {
      // En yakın paragraf veya cümle sınırına çek
      const pencere = temiz.slice(i, son);
      const sonParagraf = pencere.lastIndexOf('\n\n');
      const sonNokta = Math.max(
        pencere.lastIndexOf('. '),
        pencere.lastIndexOf('! '),
        pencere.lastIndexOf('? '),
        pencere.lastIndexOf('.\n'),
      );
      if (sonParagraf > CHUNK_KARAKTER * 0.5) {
        son = i + sonParagraf;
      } else if (sonNokta > CHUNK_KARAKTER * 0.5) {
        son = i + sonNokta + 1;
      }
    }
    const parca = temiz.slice(i, son).trim();
    if (parca.length > 0) {
      chunks.push({ metin: parca, baslangic: i, bitis: son });
    }
    if (son >= temiz.length) break;
    i = Math.max(son - CHUNK_OVERLAP_KARAKTER, son);
  }
  return chunks;
}

/**
 * Deneme/soru örneği gibi dokümanlarda soru bloklarını öncelikli ayırır.
 * Bulunan soru bloklarını doğrudan chunk olarak ekler; kalan metni normal chunklar.
 */
export function metniSoruOdakliChunkla(metin: string): Chunk[] {
  if (!metin) return [];
  const temiz = metin.replace(/\r\n/g, '\n').trim();
  if (!temiz) return [];

  const soruBaslangicRegex =
    /(?=^\s*(?:Soru\s*\d+|\d{1,3}\s*[\)\.]|[IVXLC]{1,6}\s*[\)\.]|[A-E]\s*[\)\.]))/gim;

  const bolumler = temiz.split(soruBaslangicRegex).map((x) => x.trim()).filter(Boolean);
  const soruAdaylari = bolumler.filter((b) => /\b[A-E]\s*[\)\.]/.test(b) || /\?/.test(b));

  if (soruAdaylari.length < 3) {
    return metniChunkla(metin);
  }

  const chunks: Chunk[] = [];
  let cursor = 0;
  for (const blok of soruAdaylari) {
    const idx = temiz.indexOf(blok, cursor);
    const baslangic = idx >= 0 ? idx : cursor;
    const bitis = baslangic + blok.length;
    chunks.push({ metin: blok, baslangic, bitis });
    cursor = bitis;
  }

  return chunks;
}

/**
 * Konu anlatımı / çözüm dokümanlarında başlık ve ünite sınırlarına göre böler.
 */
export function metniKonuOdakliChunkla(metin: string): Chunk[] {
  if (!metin) return [];
  const temiz = metin.replace(/\r\n/g, '\n').trim();
  if (!temiz) return [];

  const baslikRegex =
    /(?=^(?:#{1,3}\s+|\d+[\.\)]\s+|[IVXLC]{1,6}[\.\)]\s*|(?:KONU|Ünite|ÜNİTE|Bölüm|BÖLÜM|Unite)\s*[:\-]\s*))/gim;

  const bolumler = temiz.split(baslikRegex).map((x) => x.trim()).filter((b) => b.length > 80);
  if (bolumler.length <= 1) {
    return metniChunkla(metin);
  }

  const chunks: Chunk[] = [];
  let cursor = 0;
  for (const blok of bolumler) {
    const idx = temiz.indexOf(blok, cursor);
    const baslangic = idx >= 0 ? idx : cursor;
    const bitis = baslangic + blok.length;
    chunks.push({ metin: blok, baslangic, bitis });
    cursor = bitis;
  }
  return chunks;
}

// ── 3. EMBEDDING ÜRETİMİ ────────────────────────────────────────────
export async function embeddingUret(metin: string): Promise<number[]> {
  try {
    const cli = openaiClient();
    const sonuc = await cli.embeddings.create({
      model: embeddingModel(),
      input: metin.slice(0, 8000), // hard cap
    });
    return sonuc.data[0]?.embedding || [];
  } catch (e) {
    const msg = (e as Error).message || '';
    logger.warn(`[RAG] Embedding API hatası, lokal fallback kullanılacak: ${msg}`);
    return lokalEmbeddingUret(metin.slice(0, 8000));
  }
}

export async function embeddingTopluUret(metinler: string[]): Promise<number[][]> {
  if (metinler.length === 0) return [];
  try {
    const cli = openaiClient();
    const sonuc = await cli.embeddings.create({
      model: embeddingModel(),
      input: metinler.map((m) => m.slice(0, 8000)),
    });
    return sonuc.data.map((d) => d.embedding);
  } catch (e) {
    const msg = (e as Error).message || '';
    logger.warn(`[RAG] Toplu embedding API hatası, lokal fallback kullanılacak: ${msg}`);
    return metinler.map((m) => lokalEmbeddingUret(m.slice(0, 8000)));
  }
}

// ── 4. DOKÜMAN İŞLEME (FULL PIPELINE) ───────────────────────────────
/**
 * dokumanId → DB'den okur, dosyayı parse eder, chunklara böler, embedding üretir,
 * egitim_chunklar tablosuna yazar, durumu HAZIR yapar.
 *
 * Hata olursa durumu HATA olarak set eder, hataMetni doldurur.
 *
 * dosyaYolu opsiyonel: Vercel'de /tmp dosyası, lokal'de buffer olabilir.
 * Eğer verilmezse Supabase Storage'tan indirilir.
 */
export async function dokumanIsle(
  dokumanId: string,
  yerelDosyaYolu?: string,
): Promise<{ basarili: boolean; chunkSayisi: number; hata?: string }> {
  const dokuman = await prisma.egitimDokuman.findUnique({ where: { id: dokumanId } });
  if (!dokuman) return { basarili: false, chunkSayisi: 0, hata: 'Doküman bulunamadı' };

  try {
    await prisma.egitimDokuman.update({
      where: { id: dokumanId },
      data: { durum: 'ISLENIYOR', hataMetni: null },
    });

    const pdfSayfaAraligi =
      dokuman.sayfaBaslangic || dokuman.sayfaBitis
        ? { baslangic: dokuman.sayfaBaslangic, bitis: dokuman.sayfaBitis }
        : null;

    // 4.1 Metni çıkar
    let metin = '';
    if (yerelDosyaYolu) {
      metin = await dosyadanMetinCikar(yerelDosyaYolu, dokuman.dosyaTipi, pdfSayfaAraligi);
    } else if (dokuman.hamMetin && !pdfSayfaAraligi) {
      metin = dokuman.hamMetin;
    } else if (dokuman.kaynakUrl) {
      // URL'den çek
      metin = await urlDenMetinCikar(dokuman.kaynakUrl, pdfSayfaAraligi);
    } else if (dokuman.dosyaUrl && yerelEgitimDosyasiMi(dokuman.dosyaUrl)) {
      const absYol = egitimDosyaMutlakYol(dokuman.dosyaUrl);
      metin = await dosyadanMetinCikar(absYol, dokuman.dosyaTipi, pdfSayfaAraligi);
    } else if (dokuman.dosyaUrl) {
      // Harici URL veya Supabase Storage
      const res = await fetch(dokuman.dosyaUrl);
      if (!res.ok) throw new Error(`Dosya indirilemedi: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const tmpYol = `/tmp/wingo-${dokumanId}`;
      await fs.writeFile(tmpYol, buf);
      try {
        metin = await dosyadanMetinCikar(tmpYol, dokuman.dosyaTipi, pdfSayfaAraligi);
      } finally {
        await fs.unlink(tmpYol).catch(() => undefined);
      }
    } else {
      throw new Error('Dokümanın dosyaUrl, kaynakUrl veya hamMetin alanı yok.');
    }

    if (!metin || metin.trim().length < 30) {
      throw new Error('Dosyadan anlamlı metin çıkarılamadı.');
    }

    // Embedding aşamasından önce ham metni sakla.
    // Böylece API/bağlantı hatasında yeniden işleme çalıştırılabilir.
    // 4.1b Konu ve soru analizi (AI eğitim özeti)
    let egitimOzetiJson: string | null = null;
    try {
      const { dokumanIcerikAnalizEt, egitimOzetiSerialize, ozettenChunklarUret } = await import(
        './egitimDokumanAnaliz.service'
      );
      const ozet = await dokumanIcerikAnalizEt({
        metin,
        baslik: dokuman.baslik,
        ders: dokuman.ders,
        tur: dokuman.tur,
      });
      egitimOzetiJson = egitimOzetiSerialize(ozet);
      await prisma.egitimDokuman.update({
        where: { id: dokumanId },
        data: { hamMetin: metin.slice(0, 200000), egitimOzeti: egitimOzetiJson },
      }).catch(() => undefined);
    } catch (e) {
      logger.warn(`[RAG] İçerik analizi atlandı: ${(e as Error).message}`);
      await prisma.egitimDokuman.update({
        where: { id: dokumanId },
        data: { hamMetin: metin.slice(0, 200000) },
      }).catch(() => undefined);
    }

    // 4.2 Chunklara böl
    let chunklar: Chunk[] = [];
    if (dokuman.tur === 'DENEME_SINAVI' || dokuman.tur === 'SORU_ORNEKLERI') {
      chunklar = metniSoruOdakliChunkla(metin);
    } else if (dokuman.tur === 'KONU_ANLATIMI' || dokuman.tur === 'COZUM') {
      chunklar = metniKonuOdakliChunkla(metin);
    } else {
      chunklar = metniChunkla(metin);
    }

    if (egitimOzetiJson) {
      const { egitimOzetiParse, ozettenChunklarUret } = await import('./egitimDokumanAnaliz.service');
      const ozet = egitimOzetiParse(egitimOzetiJson);
      if (ozet) {
        const ek = ozettenChunklarUret(ozet, metin.length);
        chunklar = [...chunklar, ...ek];
      }
    }

    if (chunklar.length === 0) throw new Error('Chunk üretilemedi.');

    // 4.3 Mevcut chunkları sil (yeniden işlenebilir)
    await prisma.egitimChunk.deleteMany({ where: { dokumanId } });
    await prisma.$executeRawUnsafe(
      'DELETE FROM "egitim_chunklar" WHERE "dokumanId" = $1',
      dokumanId,
    );

    // 4.4 Embedding üret (batch'ler halinde, OpenAI 2048 input/req limit)
    const BATCH = 32;
    let yazilanToplam = 0;
    for (let i = 0; i < chunklar.length; i += BATCH) {
      const grup = chunklar.slice(i, i + BATCH);
      const embeddings = await embeddingTopluUret(grup.map((c) => c.metin));

      // 4.5 Her chunk için raw SQL ile insert (vector tipi için)
      for (let j = 0; j < grup.length; j++) {
        const c = grup[j];
        const e = embeddings[j];
        if (!e || e.length !== EMBEDDING_DIM) continue;

        const cuid = `eg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}_${i + j}`;
        const embeddingStr = `[${e.join(',')}]`;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "egitim_chunklar" ("id","dokumanId","sira","metin","baslangic","bitis","tokenSayisi","embedding")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector)`,
          cuid,
          dokumanId,
          i + j,
          c.metin,
          c.baslangic,
          c.bitis,
          Math.ceil(c.metin.length / 4),
          embeddingStr,
        );
        yazilanToplam++;
      }
    }

    // 4.6 Durum güncelle
    await prisma.egitimDokuman.update({
      where: { id: dokumanId },
      data: {
        durum: 'HAZIR',
        chunkSayisi: yazilanToplam,
        hamMetin: metin.slice(0, 200000),
        egitimOzeti: egitimOzetiJson,
      },
    });

    logger.info(`[RAG] Doküman işlendi: ${dokuman.baslik} (${yazilanToplam} chunk)`);
    return { basarili: true, chunkSayisi: yazilanToplam };
  } catch (e) {
    const hata = (e as Error).message;
    logger.error(`[RAG] Doküman işleme hatası (${dokumanId}): ${hata}`);
    await prisma.egitimDokuman.update({
      where: { id: dokumanId },
      data: { durum: 'HATA', hataMetni: hata },
    }).catch(() => undefined);
    return { basarili: false, chunkSayisi: 0, hata };
  }
}

// ── 5. SIMILARITY SEARCH ────────────────────────────────────────────
export interface KaynakChunk {
  id: string;
  dokumanId: string;
  dokumanBaslik: string;
  dokumanTuru?: string;
  metin: string;
  benzerlik: number;
}

/**
 * Verilen sorguya en yakın chunkları döner.
 * Tercihen önce konu/ders filtresi uygular; sonuç azsa filtre gevşetir.
 */
export async function similaritySearch(opts: {
  sorgu: string;
  ders?: string;
  konuId?: string;
  ogretimTuru?: string;
  dokumanTurleri?: string[];
  topK?: number;
  minBenzerlik?: number;
}): Promise<KaynakChunk[]> {
  const topK = opts.topK ?? 5;
  const minBenzerlik = opts.minBenzerlik ?? 0.3;

  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    logger.warn('[RAG] Embedding key yok (OPENROUTER_API_KEY/OPENAI_API_KEY) — similarity search atlanıyor.');
    return [];
  }

  let sorguEmbedding: number[];
  try {
    sorguEmbedding = await embeddingUret(opts.sorgu);
  } catch (e) {
    logger.warn(`[RAG] Sorgu embedding hatası: ${(e as Error).message}`);
    return [];
  }
  if (!sorguEmbedding.length) return [];
  const embeddingStr = `[${sorguEmbedding.join(',')}]`;

  const filterler: string[] = ['d."durum" = \'HAZIR\''];
  const params: unknown[] = [embeddingStr, topK];

  if (opts.ders) {
    params.push(opts.ders);
    filterler.push(`d."ders" = $${params.length}`);
  }
  if (opts.konuId) {
    params.push(opts.konuId);
    filterler.push(`d."konuId" = $${params.length}`);
  }
  if (opts.ogretimTuru) {
    params.push(opts.ogretimTuru);
    filterler.push(`d."ogretimTuru" = $${params.length}::"OgretimTuru"`);
  }
  if (opts.dokumanTurleri && opts.dokumanTurleri.length > 0) {
    params.push(opts.dokumanTurleri);
    filterler.push(`d."tur" = ANY($${params.length}::"EgitimDokumanTuru"[])`);
  }

  const where = filterler.length ? `WHERE ${filterler.join(' AND ')}` : '';
  const sorguSql = `
    SELECT
      c."id",
      c."dokumanId",
      d."baslik" AS dokuman_baslik,
      d."tur" AS dokuman_tur,
      c."metin",
      1 - (c."embedding" <=> $1::vector) AS benzerlik
    FROM "egitim_chunklar" c
    JOIN "egitim_dokumanlar" d ON d."id" = c."dokumanId"
    ${where}
    ORDER BY c."embedding" <=> $1::vector
    LIMIT $2
  `;

  const sonuclar = await prisma.$queryRawUnsafe<
    { id: string; dokumanId: string; dokuman_baslik: string; dokuman_tur: string; metin: string; benzerlik: number }[]
  >(sorguSql, ...params);

  let donen: KaynakChunk[] = sonuclar
    .filter((s) => s.benzerlik >= minBenzerlik)
    .map((s) => ({
      id: s.id,
      dokumanId: s.dokumanId,
      dokumanBaslik: s.dokuman_baslik,
      dokumanTuru: s.dokuman_tur,
      metin: s.metin,
      benzerlik: Number(s.benzerlik),
    }));

  // Ders/konu filtresiyle hiç sonuç yoksa filtreleri kademeli olarak gevşet:
  // 1. Önce konuId filtresini kaldırıp sadece ders/kademe filtresiyle aramayı dene
  if (donen.length === 0 && opts.konuId && opts.ders) {
    const fbFilterler: string[] = ['d."durum" = \'HAZIR\''];
    const fbParams: unknown[] = [embeddingStr, topK, opts.ders];
    fbFilterler.push(`d."ders" = $3`);
    
    if (opts.ogretimTuru) {
      fbParams.push(opts.ogretimTuru);
      fbFilterler.push(`d."ogretimTuru" = $4::"OgretimTuru"`);
    }
    if (opts.dokumanTurleri && opts.dokumanTurleri.length > 0) {
      fbParams.push(opts.dokumanTurleri);
      fbFilterler.push(`d."tur" = ANY($${fbParams.length}::"EgitimDokumanTuru"[])`);
    }
    
    const fbSql = `
      SELECT
        c."id",
        c."dokumanId",
        d."baslik" AS dokuman_baslik,
        d."tur" AS dokuman_tur,
        c."metin",
        1 - (c."embedding" <=> $1::vector) AS benzerlik
      FROM "egitim_chunklar" c
      JOIN "egitim_dokumanlar" d ON d."id" = c."dokumanId"
      WHERE ${fbFilterler.join(' AND ')}
      ORDER BY c."embedding" <=> $1::vector
      LIMIT $2
    `;
    const fb = await prisma.$queryRawUnsafe<typeof sonuclar>(fbSql, ...fbParams);
    donen = fb
      .filter((s) => s.benzerlik >= minBenzerlik)
      .map((s) => ({
        id: s.id,
        dokumanId: s.dokumanId,
        dokumanBaslik: s.dokuman_baslik,
        dokumanTuru: s.dokuman_tur,
        metin: s.metin,
        benzerlik: Number(s.benzerlik),
      }));
  }

  // 2. Eğer hala sonuç yoksa, ders filtresini de kaldırıp tamamen genel arama yap
  if (donen.length === 0 && (opts.ders || opts.konuId)) {
    const fbSql = `
      SELECT
        c."id",
        c."dokumanId",
        d."baslik" AS dokuman_baslik,
        d."tur" AS dokuman_tur,
        c."metin",
        1 - (c."embedding" <=> $1::vector) AS benzerlik
      FROM "egitim_chunklar" c
      JOIN "egitim_dokumanlar" d ON d."id" = c."dokumanId"
      WHERE d."durum" = 'HAZIR'
      ORDER BY c."embedding" <=> $1::vector
      LIMIT $2
    `;
    const fb = await prisma.$queryRawUnsafe<typeof sonuclar>(fbSql, embeddingStr, topK);
    donen = fb
      .filter((s) => s.benzerlik >= minBenzerlik)
      .map((s) => ({
        id: s.id,
        dokumanId: s.dokumanId,
        dokumanBaslik: s.dokuman_baslik,
        dokumanTuru: s.dokuman_tur,
        metin: s.metin,
        benzerlik: Number(s.benzerlik),
      }));
  }

  return donen;
}

/** Ders/konu ile eşleşen hazır dokümanların eğitim özetlerini getirir. */
export async function egitimOzetleriniGetir(opts: {
  ders?: string;
  konuId?: string;
  ogretimTuru?: string;
  limit?: number;
}): Promise<Array<{ baslik: string; tur: string; ozet: import('./egitimDokumanAnaliz.service').EgitimOzeti }>> {
  const { egitimOzetiParse } = await import('./egitimDokumanAnaliz.service');
  const kayitlar = await prisma.egitimDokuman.findMany({
    where: {
      durum: 'HAZIR',
      egitimOzeti: { not: null },
      ders: opts.ders || undefined,
      konuId: opts.konuId || undefined,
      ogretimTuru: opts.ogretimTuru ? (opts.ogretimTuru as OgretimTuru) : undefined,
    },
    select: { baslik: true, tur: true, egitimOzeti: true },
    take: opts.limit ?? 5,
    orderBy: { guncellendi: 'desc' },
  });

  const sonuc: Array<{ baslik: string; tur: string; ozet: import('./egitimDokumanAnaliz.service').EgitimOzeti }> = [];
  for (const k of kayitlar) {
    const ozet = egitimOzetiParse(k.egitimOzeti);
    if (ozet) sonuc.push({ baslik: k.baslik, tur: k.tur, ozet });
  }
  return sonuc;
}

export function egitimOzetleriniPromptaCevir(
  ozetler: Array<{ baslik: string; tur: string; ozet: import('./egitimDokumanAnaliz.service').EgitimOzeti }>,
): string {
  if (ozetler.length === 0) return '';
  const parcalar: string[] = [
    '📋 YÜKLENEN MATERYAL ANALİZİ (konu ve soru yapısına göre soru üret):',
  ];
  for (const o of ozetler) {
    const { ozet } = o;
    let blok = `\n▸ [${o.baslik} • ${o.tur}]\n`;
    if (ozet.konular.length) blok += `Konular: ${ozet.konular.slice(0, 12).join(' | ')}\n`;
    if (ozet.soruTipleri.length) blok += `Soru tipleri: ${ozet.soruTipleri.join(', ')}\n`;
    if (ozet.soruSayisi > 0) blok += `Tespit edilen soru sayısı: ~${ozet.soruSayisi}\n`;
    if (ozet.uretimYonergesi) blok += `Yönerge: ${ozet.uretimYonergesi}\n`;
    if (ozet.sorular.length) {
      blok += 'Örnek soru kavramları:\n';
      for (const s of ozet.sorular.slice(0, 8)) {
        blok += `  ${s.sira}. ${s.ozet}${s.konu ? ` (${s.konu})` : ''}\n`;
      }
    }
    parcalar.push(blok);
  }
  parcalar.push('— ANALİZ SONU —\n');
  return parcalar.join('');
}

// ── 6. PROMPT İÇİN KAYNAK BLOĞU ─────────────────────────────────────
/**
 * Bulunan chunk'ları prompt'a koyulacak biçimde formatlar.
 * Maks 4000 karakterlik bir blok döner — token bütçesini aşmamak için.
 */
export function kaynaklariPromptaCevir(kaynaklar: KaynakChunk[], analizBlogu = ''): string {
  if (kaynaklar.length === 0 && !analizBlogu) return '';
  const baslik =
    '📚 KAYNAK MATERYAL (Konu kapsamı ve soru kalıplarına sadık kal; metni kopyalama, aynı kazanımı ölçen özgün sorular üret):';
  const parcalar: string[] = [];
  let toplam = 0;
  const LIMIT = 4000;
  for (const k of kaynaklar) {
    const tur = k.dokumanTuru ? ` • ${k.dokumanTuru}` : '';
    const blok = `\n— [${k.dokumanBaslik}${tur}] —\n${k.metin}\n`;
    if (toplam + blok.length > LIMIT) break;
    parcalar.push(blok);
    toplam += blok.length;
  }
  const govde = parcalar.length ? `${baslik}\n${parcalar.join('')}\n— KAYNAK SONU —` : '';
  return analizBlogu ? `${analizBlogu}\n${govde}` : govde;
}
