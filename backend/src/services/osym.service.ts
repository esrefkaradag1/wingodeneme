import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../config/database';
import { duyuruOlustur } from './duyuru.service';
import { logger } from '../utils/logger';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const OSYM_KAYNAKLAR = [
  {
    kod: 'YKS_KILAVUZ_2026',
    url: 'https://www.osym.gov.tr/TR,33851/2026-yuksekogretim-kurumlari-sinavi-yks-kilavuzu.html',
    aciklama: 'YKS Kılavuzu',
  },
  {
    kod: 'OSYM_ANASAYFA',
    url: 'https://www.osym.gov.tr/',
    aciklama: 'ÖSYM anasayfa',
  },
] as const;

function htmlNormalize(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function baslikCikar(html: string): string | null {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t?.[1]) return htmlNormalize(t[1]).slice(0, 500) || null;
  const h = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h?.[1]) return htmlNormalize(h[1]).replace(/<[^>]+>/g, '').slice(0, 500) || null;
  return null;
}

export type OsymBaglanti = { baslik: string; href: string };
export type OsymDuyuru = { baslik: string; href: string; tarih?: string };

function temizMetin(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** ÖSYM anasayfasındaki "DUYURULAR" bölümünden duyuru listesini çıkarmayı dener */
export function osymDuyurulariCikar(html: string, taban = 'https://www.osym.gov.tr'): OsymDuyuru[] {
  // Tercihen anasayfadaki "DUYURULAR" alanının kapsayıcı section'ını hedefle.
  // ÖSYM front-end zamanla değişebildiği için, class bazlı ve başlık bazlı iki fallback var.
  let bolum = html;
  const sectionMatch = html.match(
    /<section[^>]*class\s*=\s*"[^"]*\babout__area-two\b[^"]*\babout__bg\b[^"]*"[\s\S]*?<\/section>/i,
  );
  if (sectionMatch?.[0]) {
    bolum = sectionMatch[0];
  } else {
    // Sayfanın tamamını parse etmek yerine "DUYURULAR" başlığından sonraki ilk bağlantıları tarıyoruz.
    const idx = html.toUpperCase().indexOf('DUYURULAR');
    bolum = idx >= 0 ? html.slice(idx, idx + 40000) : html;
  }

  const out: OsymDuyuru[] = [];
  const gordum = new Set<string>();
  const re = /<a[^>]+href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bolum)) !== null) {
    let href = m[1].trim();
    const text = temizMetin(m[2]);
    if (!/\/TR,\d+/.test(href)) continue;
    if (text.length < 6 || text.length > 500) continue;
    // Duyuru satırları genellikle tarih içerir: (... 08.05.2026)
    const tarihMatch = text.match(/\((\d{2}\.\d{2}\.\d{4})\)\s*$/);
    if (!tarihMatch) continue;
    const tarih = tarihMatch[1];
    const baslik = text.replace(/\s*\(\d{2}\.\d{2}\.\d{4}\)\s*$/, '').trim();
    if (href.startsWith('/')) href = taban.replace(/\/$/, '') + href;
    if (!href.startsWith('http')) continue;
    if (gordum.has(href)) continue;
    gordum.add(href);
    out.push({ baslik, href, tarih });
    if (out.length >= 30) break;
  }
  return out;
}

/** Ana sayfa ve liste sayfalarındaki /TR,... bağlantılarını çıkarır */
export function osymTrBaglantilar(html: string, taban = 'https://www.osym.gov.tr'): OsymBaglanti[] {
  const out: OsymBaglanti[] = [];
  const gordum = new Set<string>();
  const re = /<a[^>]+href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].trim();
    const ic = temizMetin(m[2]);
    if (!/\/TR,\d+/.test(href)) continue;
    if (ic.length < 4 || ic.length > 400) continue;
    if (href.startsWith('/')) href = taban.replace(/\/$/, '') + href;
    if (!href.startsWith('http')) continue;
    if (gordum.has(href)) continue;
    gordum.add(href);
    out.push({ baslik: ic, href });
    if (out.length >= 40) break;
  }
  return out;
}

async function sayfaIndir(url: string): Promise<{ durum: number; govde: string; hata?: string }> {
  try {
    const r = await axios.get<string>(url, {
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
      validateStatus: (s) => s < 500,
    });
    return { durum: r.status, govde: typeof r.data === 'string' ? r.data : String(r.data) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn(`[ÖSYM] İndirme hatası ${url}: ${msg}`);
    return { durum: 0, govde: '', hata: msg };
  }
}

type EkVeri = { baglantilar: OsymBaglanti[]; duyurular?: OsymDuyuru[] };

export async function osymKaynaklariTara(opts: {
  olusturanKullaniciId?: string;
  duyuruAktar?: boolean;
}): Promise<{
  kaynaklar: Array<{
    kod: string;
    url: string;
    httpDurum: number;
    baslik: string | null;
    hash: string;
    degisti: boolean;
    hata?: string;
    yeniBaglantiSayisi?: number;
  }>;
}> {
  const duyuruAktar = opts.duyuruAktar !== false;

  const sonucKaynak: Array<{
    kod: string;
    url: string;
    httpDurum: number;
    baslik: string | null;
    hash: string;
    degisti: boolean;
    hata?: string;
    yeniBaglantiSayisi?: number;
  }> = [];

  for (const kaynak of OSYM_KAYNAKLAR) {
    const { durum, govde, hata } = await sayfaIndir(kaynak.url);
    const norm = htmlNormalize(govde);
    const hash = sha256Hex(norm);
    const baslik = baslikCikar(govde);

    const onceki = await prisma.osymKaynakSnapshot.findUnique({ where: { kod: kaynak.kod } });

    let ekJson: string | null = null;
    let yeniSay = 0;

    if (kaynak.kod === 'OSYM_ANASAYFA' && durum === 200 && govde.length > 100) {
      const baglantilar = osymTrBaglantilar(govde);
      const duyurular = osymDuyurulariCikar(govde);
      ekJson = JSON.stringify({ baglantilar, duyurular } satisfies EkVeri);

      const oncekiBag: OsymBaglanti[] = onceki?.ekVeriJson
        ? (JSON.parse(onceki.ekVeriJson) as EkVeri).baglantilar || []
        : [];
      const onceHref = new Set(oncekiBag.map((b) => b.href));
      const yeni = baglantilar.filter((b) => !onceHref.has(b.href));

      if (duyuruAktar && onceki && yeni.length > 0 && opts.olusturanKullaniciId) {
        for (const b of yeni.slice(0, 15)) {
          try {
            await duyuruOlustur(opts.olusturanKullaniciId, {
              baslik: `ÖSYM: ${b.baslik.slice(0, 120)}`,
              mesaj: `ÖSYM resmi web sitesinde yeni bir bağlantı tespit edildi.\n\n${b.baslik}\n${b.href}\n\nResmi bilgi ve güncellemeler için doğrudan ÖSYM sitesini kontrol edin.`,
              hedefTuru: 'TUMU',
            });
            yeniSay += 1;
          } catch (e) {
            logger.warn('[ÖSYM] Duyuru oluşturulamadı:', e);
          }
        }
      }
    }

    const degisti = !onceki || onceki.sonHash !== hash;

    await prisma.osymKaynakSnapshot.upsert({
      where: { kod: kaynak.kod },
      create: {
        kod: kaynak.kod,
        url: kaynak.url,
        sonHash: hash,
        sonBaslik: baslik,
        sonHttpDurum: durum || null,
        sonKontrol: new Date(),
        degisti,
        ekVeriJson: ekJson,
        hata: hata || null,
      },
      update: {
        url: kaynak.url,
        sonHash: hash,
        sonBaslik: baslik,
        sonHttpDurum: durum || null,
        sonKontrol: new Date(),
        degisti,
        ekVeriJson: ekJson ?? undefined,
        hata: hata || null,
      },
    });

    sonucKaynak.push({
      kod: kaynak.kod,
      url: kaynak.url,
      httpDurum: durum,
      baslik,
      hash,
      degisti,
      hata,
      yeniBaglantiSayisi: yeniSay || undefined,
    });
  }

  return { kaynaklar: sonucKaynak };
}

export async function osymOzetGetir() {
  const rows = await prisma.osymKaynakSnapshot.findMany({
    orderBy: { kod: 'asc' },
  });
  const meta = OSYM_KAYNAKLAR.map((k) => {
    const r = rows.find((x) => x.kod === k.kod);
    let baglantilar: OsymBaglanti[] = [];
    let duyurular: OsymDuyuru[] = [];
    if (r?.ekVeriJson) {
      try {
        const ek = JSON.parse(r.ekVeriJson) as EkVeri;
        baglantilar = ek.baglantilar?.slice(0, 20) || [];
        duyurular = ek.duyurular?.slice(0, 20) || [];
      } catch {
        baglantilar = [];
        duyurular = [];
      }
    }
    return {
      kod: k.kod,
      url: k.url,
      aciklama: k.aciklama,
      sonKontrol: r?.sonKontrol?.toISOString() ?? null,
      degisti: r?.degisti ?? false,
      baslik: r?.sonBaslik ?? null,
      httpDurum: r?.sonHttpDurum ?? null,
      hata: r?.hata ?? null,
      ornekBaglantilar: k.kod === 'OSYM_ANASAYFA' ? baglantilar : undefined,
      duyurular: k.kod === 'OSYM_ANASAYFA' ? duyurular : undefined,
    };
  });
  return { kaynaklar: meta };
}
