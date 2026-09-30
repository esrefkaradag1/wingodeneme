import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { KocTipi, Rol } from '@prisma/client';
import { AppHatasi } from '../middlewares/hata.middleware';
import { cache } from '../config/redis';
import { prisma } from '../config/database';

/** Kişisel e-posta domain'leri — kurum eşlemesinde kullanılmaz */
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.tr',
  'yandex.com',
  'yandex.com.tr',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'gmx.com',
  'aol.com',
]);

/** Kurumsal domain (gmail vb. değilse) — örn. kapyaakademi.com */
export function emailDomainAl(email: string): string | null {
  const d = String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[1]
    ?.trim();
  if (!d || !d.includes('.') || PUBLIC_EMAIL_DOMAINS.has(d)) return null;
  return d;
}

/**
 * Öğrenci e-posta domain'i ile tek KURUMSAL hesabı bul.
 * Birden fazla kurum aynı domain'deyse eşleme yapılmaz (belirsizlik).
 */
export async function kurumIdEmailDomainIle(email: string): Promise<string | null> {
  const domain = emailDomainAl(email);
  if (!domain) return null;

  const kurums = await prisma.kocProfil.findMany({
    where: {
      tip: KocTipi.KURUMSAL,
      aktif: true,
      kullanici: { email: { endsWith: `@${domain}`, mode: 'insensitive' } },
    },
    select: { id: true, referansKod: true },
    take: 2,
  });
  return kurums.length === 1 ? kurums[0]!.id : null;
}

/** Domain üzerinden bulunan kurumun referans kodu (kayıt akışı için) */
export async function kurumReferansKodEmailDomainIle(email: string): Promise<string | null> {
  const id = await kurumIdEmailDomainIle(email);
  if (!id) return null;
  const p = await prisma.kocProfil.findUnique({
    where: { id },
    select: { referansKod: true },
  });
  return p?.referansKod || null;
}

/**
 * Kurum e-posta domain'indeki, henüz kuruma bağlı olmayan öğrencileri bağla.
 * Kapya SSO'da org_ref gelmeyen eski öğrenciler için.
 */
export async function ayniDomainOgrencileriniKurumaBagla(
  kurumId: string,
  kurumEmail: string,
): Promise<number> {
  const domain = emailDomainAl(kurumEmail);
  if (!domain || !kurumId) return 0;

  const sonuc = await prisma.ogrenciProfil.updateMany({
    where: {
      kocId: null,
      kullanici: {
        rol: Rol.OGRENCI,
        email: { endsWith: `@${domain}`, mode: 'insensitive' },
      },
    },
    data: { kocId: kurumId },
  });
  return sonuc.count;
}

/** Edulim (Kapya) ile paylaşılan HS256 secret — WINGO_JWT_SECRET ile aynı değer olmalı */
function partnerSecret(): string {
  const secret =
    process.env.KAPYA_PARTNER_JWT_SECRET ||
    process.env.WINGO_JWT_SECRET ||
    '';
  if (!secret) {
    throw new AppHatasi('Partner JWT secret yapılandırılmamış (KAPYA_PARTNER_JWT_SECRET)', 503);
  }
  return secret;
}

const PARTNER_KAPYA = 'kapya';
const MAX_TTL_SN = 300;

/** Redis yoksa process içi jti (serverless'ta zayıf; prod'da Redis önerilir) */
const jtiBellek = new Map<string, number>();

function jtiTemizle() {
  const simdi = Date.now();
  for (const [k, bitis] of jtiBellek) {
    if (bitis <= simdi) jtiBellek.delete(k);
  }
}

async function jtiKullanildiMi(jti: string): Promise<boolean> {
  const anahtar = `partner:jti:${jti}`;
  const rediste = await cache.al<boolean>(anahtar);
  if (rediste) return true;
  jtiTemizle();
  const bitis = jtiBellek.get(jti);
  return Boolean(bitis && bitis > Date.now());
}

async function jtiIsaretle(jti: string, ttlSn: number): Promise<void> {
  const anahtar = `partner:jti:${jti}`;
  await cache.yaz(anahtar, true, Math.max(60, ttlSn));
  jtiBellek.set(jti, Date.now() + Math.max(60, ttlSn) * 1000);
}

function metinAl(obj: Record<string, unknown>, ...anahtarlar: string[]): string {
  for (const a of anahtarlar) {
    const v = obj[a];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

/** "12. Sınıf" / "12" / "SINIF_12" → form değeri */
export function sinifNormalize(ham: string): string {
  const s = ham.trim();
  if (!s) return '';
  const upper = s.toUpperCase().replace(/\s+/g, '_');
  if (['KPSS_LISANS', 'KPSS_ONLISANS', 'KPSS_ORTAOGRETIM', 'KPSS'].includes(upper)) {
    return upper === 'KPSS' ? 'KPSS_LISANS' : upper;
  }
  if (upper === 'MEZUN' || upper === 'GRADUATE') return 'mezun';
  if (upper === 'LGS' || upper === 'YKS') {
    return upper === 'LGS' ? '8' : '';
  }
  const m = s.match(/(\d{1,2})/);
  if (m) {
    const n = m[1];
    if (['6', '7', '8', '9', '10', '11', '12'].includes(n)) return n;
  }
  return s;
}

function telefonNormalize(ham: string): string {
  let r = String(ham || '').replace(/\D/g, '');
  if (!r) return '';
  // +90 / 90 ülke kodunu (ve çift yazımı: +9090…) soy
  while (r.startsWith('90') && r.length > 11) r = r.slice(2);
  if (r.startsWith('90') && r.length === 12) r = r.slice(2);
  // 905XXXXXXXX (11) → 05XXXXXXXXX
  if (r.startsWith('90') && r.length === 11 && r[2] === '5') r = `0${r.slice(2)}`;
  if (r.length === 10 && r.startsWith('5')) return `0${r}`;
  if (r.length === 11 && r.startsWith('05')) return r;
  // Gürültülü önek: son 10 hane 5 ile başlıyorsa al
  if (r.length > 10) {
    const son10 = r.slice(-10);
    if (son10.startsWith('5')) return `0${son10}`;
  }
  return '';
}

/** Dışarıdan (auth SSO) kullanım için */
export function partnerTelefonNormalize(ham: string): string {
  return telefonNormalize(ham);
}

export type PartnerKayitPrefill = {
  partner: string;
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
  tcKimlikNo: string;
  sinif: string;
  okul: string;
  sehir: string;
  jti: string;
  mevcutHesap: boolean;
  /** JWT type/role — öğrenci akışında kurum token'ı reddedilir */
  hesapTuru: 'ogrenci' | 'kurum' | 'bilinmiyor';
  /** Kapya kurum referans kodu (WINGO-…) — öğrenci bu kuruma bağlanır */
  kocReferansKod: string;
};

export type PartnerKurumClaim = {
  partner: string;
  jti: string;
  email: string;
  ad: string;
  soyad: string;
  orgName: string;
  orgEmail: string;
  orgPhone: string;
  orgRef: string;
};

function jwtPayloadDogrula(tokenHam: string): Record<string, unknown> {
  const token = String(tokenHam || '').trim();
  if (!token) throw new AppHatasi('Partner token gerekli', 400);

  let payload: Record<string, unknown>;
  try {
    payload = jwt.verify(token, partnerSecret(), {
      algorithms: ['HS256'],
      clockTolerance: 30,
    }) as Record<string, unknown>;
  } catch (e) {
    const ad = e instanceof Error ? e.name : '';
    if (ad === 'TokenExpiredError') {
      throw new AppHatasi('Bağlantının süresi dolmuş. Kapya panelinden tekrar deneyin.', 401);
    }
    if (ad === 'JsonWebTokenError') {
      throw new AppHatasi('Geçersiz partner token (imza veya format)', 401);
    }
    throw new AppHatasi('Partner token doğrulanamadı', 401);
  }

  const partner = metinAl(payload, 'partner').toLowerCase();
  if (partner !== PARTNER_KAPYA) {
    throw new AppHatasi('Desteklenmeyen partner', 400);
  }

  const iat = typeof payload.iat === 'number' ? payload.iat : 0;
  if (iat > 0 && Math.floor(Date.now() / 1000) - iat > MAX_TTL_SN + 30) {
    throw new AppHatasi('Bağlantının süresi dolmuş. Kapya panelinden tekrar deneyin.', 401);
  }

  return payload;
}

function jtiAl(payload: Record<string, unknown>, tokenHam: string): string {
  return (
    metinAl(payload, 'jti') ||
    crypto.createHash('sha256').update(String(tokenHam || '').trim()).digest('hex').slice(0, 32)
  );
}

function hesapTuruCoz(payload: Record<string, unknown>): 'ogrenci' | 'kurum' | 'bilinmiyor' {
  const type = metinAl(payload, 'type', 'account_type', 'hesapTuru').toLowerCase();
  const role = metinAl(payload, 'role').toLowerCase();
  if (
    type === 'kurum' ||
    type === 'kurumsal' ||
    type === 'institution' ||
    role === 'institution' ||
    role === 'kurum'
  ) {
    return 'kurum';
  }
  if (type === 'student' || type === 'ogrenci' || role === 'student' || role === 'ogrenci') {
    return 'ogrenci';
  }
  return 'bilinmiyor';
}

async function jtiTuket(payload: Record<string, unknown>, jti: string): Promise<void> {
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  const kalan = exp > 0 ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : MAX_TTL_SN;
  await jtiIsaretle(jti, kalan);
}

/**
 * Edulim Kapya JWT doğrula → kayıt formu için güvenli alanlar.
 * `consumeJti=true` iken token tek kullanımlık işaretlenir (kayıt anında).
 */
export async function kapyaPartnerTokenDogrula(
  tokenHam: string,
  secenek: { consumeJti?: boolean } = {},
): Promise<PartnerKayitPrefill> {
  const payload = jwtPayloadDogrula(tokenHam);
  const tur = hesapTuruCoz(payload);
  if (tur === 'kurum') {
    throw new AppHatasi('Bu bağlantı kurum girişi içindir. /kurum üzerinden gelin.', 400);
  }

  const jti = jtiAl(payload, tokenHam);
  if (await jtiKullanildiMi(jti)) {
    throw new AppHatasi('Bu bağlantı daha önce kullanılmış. Kapya panelinden tekrar açın.', 409);
  }

  const ad = metinAl(payload, 'ad', 'firstName', 'firstname', 'name');
  const soyad = metinAl(payload, 'soyad', 'lastName', 'lastname', 'surname');
  const email = metinAl(payload, 'email', 'eposta', 'mail').toLowerCase();
  const telefonHam = metinAl(payload, 'telefon', 'phone', 'tel', 'mobile');
  const telefon = telefonNormalize(telefonHam) || telefonHam;
  const tcKimlikNo = metinAl(payload, 'tcKimlikNo', 'tc', 'tckn', 'tcKimlik').replace(/\D/g, '');
  const sinif = sinifNormalize(metinAl(payload, 'sinif', 'grade', 'class', 'kademe', 'ogretimTuru'));
  const okul = metinAl(payload, 'okul', 'school');
  const sehir = metinAl(payload, 'sehir', 'city');
  const kocReferansKod = metinAl(
    payload,
    'org_ref',
    'orgRef',
    'referans_kodu',
    'referansKod',
    'kocReferansKod',
    'wingoKod',
    'ref',
  )
    .toUpperCase()
    .replace(/\s+/g, '');

  if (!email) throw new AppHatasi('Token içinde e-posta yok', 400);

  const mevcut = await prisma.kullanici.findUnique({
    where: { email },
    select: { id: true },
  });

  if (secenek.consumeJti) {
    await jtiTuket(payload, jti);
  }

  return {
    partner: PARTNER_KAPYA,
    ad,
    soyad,
    email,
    telefon,
    tcKimlikNo,
    sinif,
    okul,
    sehir,
    jti,
    mevcutHesap: Boolean(mevcut),
    hesapTuru: tur === 'bilinmiyor' ? 'ogrenci' : tur,
    kocReferansKod,
  };
}

/**
 * Kapya kurum JWT doğrula → org_ref / org_email / admin email claim'leri.
 */
export async function kapyaKurumTokenDogrula(
  tokenHam: string,
  secenek: { consumeJti?: boolean } = {},
): Promise<PartnerKurumClaim> {
  const payload = jwtPayloadDogrula(tokenHam);
  const tur = hesapTuruCoz(payload);
  if (tur === 'ogrenci') {
    throw new AppHatasi('Bu bağlantı öğrenci girişi içindir. /kayit üzerinden gelin.', 400);
  }
  if (tur === 'bilinmiyor') {
    // Kapya eski format: yalnızca partner + email (type/org_* yok) → kurum girişi kabul
    const emailIpucu = metinAl(payload, 'email', 'eposta', 'mail', 'org_email', 'orgEmail');
    const orgIpucu =
      metinAl(payload, 'org_ref', 'orgRef', 'referans_kodu', 'referansKod') ||
      metinAl(payload, 'org_name', 'orgName', 'kurumAdi', 'kurum_adi');
    if (!orgIpucu && !emailIpucu) {
      throw new AppHatasi('Kurum token\'ında e-posta veya org bilgisi gerekli', 400);
    }
  }

  const jti = jtiAl(payload, tokenHam);
  if (await jtiKullanildiMi(jti)) {
    throw new AppHatasi('Bu bağlantı daha önce kullanılmış. Kapya panelinden tekrar açın.', 409);
  }

  const email = metinAl(payload, 'email', 'eposta', 'mail').toLowerCase();
  const orgEmail = metinAl(payload, 'org_email', 'orgEmail', 'kurum_email', 'kurumEmail').toLowerCase();
  const orgRef = metinAl(
    payload,
    'org_ref',
    'orgRef',
    'referans_kodu',
    'referansKod',
    'wingoKod',
    'ref',
  ).toUpperCase().replace(/\s+/g, '');
  const orgName = metinAl(payload, 'org_name', 'orgName', 'kurumAdi', 'kurum_adi', 'kurum');
  const orgPhoneHam = metinAl(payload, 'org_phone', 'orgPhone', 'kurum_telefon', 'kurumTelefon');
  const orgPhone = telefonNormalize(orgPhoneHam) || orgPhoneHam;
  const ad = metinAl(payload, 'ad', 'first_name', 'firstName', 'firstname', 'name') || 'Kurum';
  const soyad = metinAl(payload, 'soyad', 'last_name', 'lastName', 'lastname', 'surname') || 'Yönetici';

  if (!email && !orgEmail && !orgRef) {
    throw new AppHatasi('Token içinde org_ref, org_email veya email gerekli', 400);
  }

  if (secenek.consumeJti) {
    await jtiTuket(payload, jti);
  }

  return {
    partner: PARTNER_KAPYA,
    jti,
    email: email || orgEmail,
    ad,
    soyad,
    orgName: orgName || 'Kurum',
    orgEmail: orgEmail || email,
    orgPhone,
    orgRef,
  };
}
