import { prisma } from '../config/database';
import { OgretimTuru } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ogretimTuruIzinUyumlu, ogretimTurleriniGenislet } from '../utils/grupOgretimTuru';

/**
 * Branş -> izinli ders adları eşlemesi.
 * Çoğu branş kendi adıyla eşleşir; bazıları (Matematik öğretmeni → Geometri'yi de görsün gibi)
 * birden fazla ders kapsar.
 */
export const BRANS_DERS_HARITASI: Record<string, string[]> = {
  Matematik: ['Matematik', 'Geometri'],
  Geometri: ['Geometri', 'Matematik'],
  'Fen Bilimleri': ['Fen Bilimleri', 'Fizik', 'Kimya', 'Biyoloji'],
  Fizik: ['Fizik'],
  Kimya: ['Kimya'],
  Biyoloji: ['Biyoloji'],
  Türkçe: ['Türkçe', 'Edebiyat', 'Türk Dili ve Edebiyatı'],
  Edebiyat: ['Edebiyat', 'Türk Dili ve Edebiyatı', 'Türkçe'],
  Tarih: ['Tarih', 'İnkılap Tarihi ve Atatürkçülük', 'T.C. İnkılap Tarihi ve Atatürkçülük'],
  'İnkılap Tarihi ve Atatürkçülük': ['İnkılap Tarihi ve Atatürkçülük', 'T.C. İnkılap Tarihi ve Atatürkçülük', 'Tarih'],
  'Sosyal Bilgiler': ['Sosyal Bilgiler', 'Tarih', 'Coğrafya', 'İnkılap Tarihi ve Atatürkçülük', 'T.C. İnkılap Tarihi ve Atatürkçülük'],
  Coğrafya: ['Coğrafya'],
  /** ÖSYM AYT SB-2: aynı testte dört ders (branş “Felsefe” olsa da hepsi listelenmeli) */
  Felsefe: ['Felsefe', 'Psikoloji', 'Sosyoloji', 'Mantık'],
  Psikoloji: ['Felsefe', 'Psikoloji', 'Sosyoloji', 'Mantık'],
  Sosyoloji: ['Felsefe', 'Psikoloji', 'Sosyoloji', 'Mantık'],
  Mantık: ['Felsefe', 'Psikoloji', 'Sosyoloji', 'Mantık'],
  'Din Kültürü ve Ahlak Bilgisi': ['Din Kültürü ve Ahlak Bilgisi', 'Din Kültürü'],
  İngilizce: ['İngilizce', 'Yabancı Dil'],
  Almanca: ['Almanca', 'Yabancı Dil'],
  Fransızca: ['Fransızca', 'Yabancı Dil'],
};

export const LGS_BRANSLARI = [
  'Matematik',
  'Fen Bilimleri',
  'Türkçe',
  'Sosyal Bilgiler',
  'İnkılap Tarihi ve Atatürkçülük',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce',
] as const;

export const YKS_BRANSLARI = [
  'Matematik',
  'Geometri',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türkçe',
  'Edebiyat',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce',
  'Almanca',
  'Fransızca',
] as const;

export const KPSS_BRANSLARI = [
  'Türkçe',
  'Matematik',
  'Tarih',
  'Coğrafya',
  'Vatandaşlık',
  'Güncel Bilgiler',
] as const;

const BRANS_AYRAC = /[,;|]+/;

export function branslarParse(bransHam: string | null | undefined): string[] {
  if (!bransHam?.trim()) return [];
  return [
    ...new Set(
      bransHam
        .split(BRANS_AYRAC)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

export function branslarBirlestir(branslar: string[]): string {
  return [...new Set(branslar.map((b) => b.trim()).filter(Boolean))].join(', ');
}

function bransIcinTekBrans(brans: string): string[] {
  if (!brans) return [];
  const b = brans.trim();
  if (BRANS_DERS_HARITASI[b]) return BRANS_DERS_HARITASI[b];
  const eslesen = Object.keys(BRANS_DERS_HARITASI).find(
    (k) => b.toLowerCase() === k.toLowerCase() || b.toLowerCase().includes(k.toLowerCase())
  );
  if (eslesen) return BRANS_DERS_HARITASI[eslesen];
  return [b];
}

export function bransIcinDersler(bransHam: string): string[] {
  if (!bransHam?.trim()) return [];
  const liste = branslarParse(bransHam);
  const kaynak = liste.length ? liste : [bransHam.trim()];
  const dersler = new Set<string>();
  for (const b of kaynak) {
    bransIcinTekBrans(b).forEach((d) => dersler.add(d));
  }
  return [...dersler];
}

function parseOgretmenKademe(v: unknown): OgretimTuru {
  const s = String(v || '').trim().toUpperCase();
  if (s === 'LGS') return 'LGS';
  if (s === 'KPSS_LISANS') return 'KPSS_LISANS';
  if (s === 'KPSS_ONLISANS') return 'KPSS_ONLISANS';
  if (s === 'KPSS_ORTAOGRETIM') return 'KPSS_ORTAOGRETIM';
  if (s === 'KPSS') return 'KPSS_LISANS';
  return 'YKS';
}

export function parseOgretmenTurleri(v: unknown): OgretimTuru[] | null {
  if (!Array.isArray(v)) return null;
  const out = [...new Set(v.map((x) => parseOgretmenKademe(x)))];
  return out.length > 0 ? out : null;
}

/** Çoklu kademe: her kademe için branşları ayrı doğrular */
export function ogretmenBranslarByTurNormalize(
  branslarByTur: unknown,
  ogretimTurleri?: unknown,
): { brans: string; ogretimTurleri: OgretimTuru[]; branslarByTur: Record<string, string[]> } {
  if (!branslarByTur || typeof branslarByTur !== 'object') {
    throw new Error('Kademe bazlı branş seçimi gerekli');
  }
  const jb = branslarByTur as Record<string, unknown>;
  const turler = parseOgretmenTurleri(ogretimTurleri) ?? Object.keys(jb).map((k) => parseOgretmenKademe(k));
  if (turler.length === 0) throw new Error('En az bir kademe seçin');

  const out: Record<string, string[]> = {};
  for (const t of turler) {
    const list = Array.isArray(jb[t]) ? jb[t] : [];
    const normalized = ogretmenBransKayitNormalize({ branslar: list }, t);
    out[t] = branslarParse(normalized);
  }
  return {
    brans: branslarBirlestir(Object.values(out).flat()),
    ogretimTurleri: turler,
    branslarByTur: out,
  };
}

export function ogretmenBransKayitNormalize(
  girdi: { brans?: unknown; branslar?: unknown },
  ogretimTuru: string
): string {
  const ot = String(ogretimTuru || '').trim().toUpperCase();
  const izinli =
    ot === 'LGS'
      ? [...LGS_BRANSLARI]
      : ot.startsWith('KPSS')
        ? [...KPSS_BRANSLARI]
        : [...YKS_BRANSLARI];
  let liste: string[] = [];
  if (Array.isArray(girdi.branslar)) {
    liste = girdi.branslar.map(String).map((s) => s.trim()).filter(Boolean);
  } else if (typeof girdi.brans === 'string' && girdi.brans.trim()) {
    liste = branslarParse(girdi.brans);
  }
  liste = [...new Set(liste)];
  if (liste.length === 0) {
    throw new Error('En az bir branş seçin');
  }
  const gecersiz = liste.filter((b) => !(izinli as readonly string[]).includes(b));
  if (gecersiz.length > 0) {
    throw new Error(`Geçersiz branş: ${gecersiz.join(', ')}`);
  }
  return branslarBirlestir(liste);
}

/** Öğretmenin üretebileceği / görebileceği ders adı mı? (Matematik → Geometri dahil) */
export function ogretmenDersiUretebilirMi(kisit: OgretmenKisit | null, dersAdi: string): boolean {
  if (!kisit) return true;
  const ana = (dersAdi || '').split(',')[0].trim();
  if (!ana || ana.toLowerCase() === 'genel') return false;
  const anaL = ana.toLocaleLowerCase('tr-TR');
  return kisit.dersler.some((d) => {
    const dl = d.toLocaleLowerCase('tr-TR');
    return d === ana || anaL === dl || anaL.includes(dl) || dl.includes(anaL);
  });
}

/** Kademe bazlı ders kontrolü (varsa haritadan, yoksa birleşik havuzdan) */
export function ogretmenDersiUretebilirMiKademe(
  kisit: OgretmenKisit | null,
  dersAdi: string,
  ogretimTuru?: OgretimTuru | null,
): boolean {
  if (!kisit) return true;
  const tur = ogretimTuru ?? kisit.ogretimTuru;
  const dersler = (tur && kisit.derslerByTur && kisit.derslerByTur[tur] && kisit.derslerByTur[tur]!.length > 0)
    ? kisit.derslerByTur[tur]!
    : kisit.dersler;
  const ana = (dersAdi || '').split(',')[0].trim();
  if (!ana || ana.toLowerCase() === 'genel') return false;
  const anaL = ana.toLocaleLowerCase('tr-TR');
  return dersler.some((d) => {
    const dl = d.toLocaleLowerCase('tr-TR');
    return d === ana || anaL === dl || anaL.includes(dl) || dl.includes(anaL);
  });
}

/** UI / auth özeti için izinli ders etiketi */
export function ogretmenIzinliDersEtiketi(brans: string): string {
  return bransIcinDersler(brans).join(', ');
}

export interface OgretmenKisit {
  /** Virgülle birleştirilmiş ham değer (geriye uyum) */
  brans: string;
  branslar: string[];
  /** Geriye uyum: ilk kademe */
  ogretimTuru: OgretimTuru;
  /** Öğretmenin yetkili olduğu tüm kademeler */
  ogretimTurleri: OgretimTuru[];
  /** Kademeye göre seçilen branşlar (yoksa tüm branslar) */
  branslarByTur?: Partial<Record<OgretimTuru, string[]>>;
  /** Kademeye göre izinli dersler */
  derslerByTur?: Partial<Record<OgretimTuru, string[]>>;
  /** Geriye uyum: birleşik ders havuzu (tüm kademeler) */
  dersler: string[];
  /** Öğretmenin bağlı olduğu grup ID'leri */
  grupIds: string[];
}

/**
 * Kullanıcı TEACHER rolündeyse profilden branş+kademe bilgilerini çeker.
 * Diğer roller için null döndürür.
 */
export async function ogretmenKisitGetir(userId: string, rol: string): Promise<OgretmenKisit | null> {
  if (rol !== 'TEACHER') return null;
  const profil = await prisma.adminProfil.findUnique({
    where: { kullaniciId: userId },
    select: {
      brans: true, ogretimTuru: true, ogretimTurleri: true, ogretmenBranslar: true,
      ogretmenGruplari: { select: { grupId: true, grup: { select: { ad: true, tur: true } } } },
    },
  });
  if (!profil?.brans || !profil?.ogretimTuru) return null;
  const branslar = branslarParse(profil.brans);
  const ogretimTurleri = (profil.ogretimTurleri && profil.ogretimTurleri.length > 0)
    ? profil.ogretimTurleri
    : [profil.ogretimTuru];

  const branslarByTur: Partial<Record<OgretimTuru, string[]>> = {};
  const jb = profil.ogretmenBranslar as any;
  if (jb && typeof jb === 'object') {
    for (const t of ogretimTurleri) {
      const list = Array.isArray(jb[t]) ? jb[t] : [];
      branslarByTur[t] = [...new Set(list.map((x: any) => String(x).trim()).filter(Boolean))];
    }
  }

  // Öğretmenin bağlı olduğu grup ID'leri
  const grupIds = (profil.ogretmenGruplari || []).map((og) => og.grupId);

  const derslerByTur: Partial<Record<OgretimTuru, string[]>> = {};
  for (const t of ogretimTurleri) {
    const b = branslarByTur[t] && branslarByTur[t]!.length > 0 ? branslarByTur[t]! : branslar;
    derslerByTur[t] = [...new Set(b.flatMap((br) => bransIcinDersler(br)))];
  }
  const derslerBirlesik = [...new Set(Object.values(derslerByTur).flat())];
  return {
    brans: profil.brans,
    branslar,
    ogretimTuru: profil.ogretimTuru,
    ogretimTurleri,
    branslarByTur: Object.keys(branslarByTur).length ? branslarByTur : undefined,
    derslerByTur: Object.keys(derslerByTur).length ? derslerByTur : undefined,
    dersler: derslerBirlesik.length ? derslerBirlesik : bransIcinDersler(profil.brans),
    grupIds,
  };
}

/**
 * `req`'tan TEACHER kısıtını yükler ve cache'ler. ADMIN/SUPER_ADMIN için null döner (kısıt yok).
 */
/**
 * Grup listesi (AI panel vb.): YKS öğretmenine LGS grupları da gösterilir (ortak müfredat);
 * LGS öğretmenine YKS grupları — böylece "LGS kayboldu" / tek tür filtresi sorunu giderilir.
 */
export function ogretmenIcinGrupTurlari(kisit: OgretmenKisit | null): OgretimTuru[] | undefined {
  if (!kisit) return undefined;
  const turler = ogretimTurleriniGenislet(
    kisit.ogretimTurleri?.length ? kisit.ogretimTurleri : [kisit.ogretimTuru]
  );
  // YKS/LGS beraber çalışması için (eski davranış)
  if (turler.includes('YKS') && !turler.includes('LGS')) return [...turler, 'LGS'];
  if (turler.includes('LGS') && !turler.includes('YKS')) return [...turler, 'YKS'];
  return turler;
}

/** Öğretmenin sınav/grup kademesine erişimi (çoklu kademe + LGS↔YKS genişlemesi) */
export function ogretmenSinavTuruneErisebilir(
  kisit: OgretmenKisit | null,
  grupTur: OgretimTuru | string | null | undefined,
): boolean {
  if (!kisit) return true;
  if (!grupTur) return false;
  const izinli = ogretmenIcinGrupTurlari(kisit);
  if (!izinli?.length) return false;
  return ogretimTuruIzinUyumlu(grupTur as OgretimTuru, izinli);
}

/** AI / referans üretim: konu kademesi öğretmen izinleriyle uyumlu mu */
export function ogretmenKonuUretebilirMi(
  kisit: OgretmenKisit | null,
  konu: { ogretimTuru: OgretimTuru; ders: string },
): boolean {
  if (!kisit) return true;
  const izinli = ogretmenIcinGrupTurlari(kisit);
  if (!izinli?.length) return false;
  return (
    ogretimTuruIzinUyumlu(konu.ogretimTuru, izinli) &&
    ogretmenDersiUretebilirMiKademe(kisit, konu.ders, konu.ogretimTuru)
  );
}

export async function reqOgretmenKisit(req: AuthRequest): Promise<OgretmenKisit | null> {
  const k = req.kullanici;
  if (!k) return null;
  // basit per-request cache
  const w = req as AuthRequest & { _ogretmenKisit?: OgretmenKisit | null | 'BOS' };
  if (w._ogretmenKisit !== undefined) {
    return w._ogretmenKisit === 'BOS' ? null : w._ogretmenKisit;
  }
  const k2 = await ogretmenKisitGetir(k.userId, k.rol);
  w._ogretmenKisit = k2 ?? 'BOS';
  return k2;
}

/** Konu modeli üzerine uygulanacak Prisma where parçası. */
export function konuWhereKisiti(kisit: OgretmenKisit | null) {
  if (!kisit) return {};
  const turler = ogretimTurleriniGenislet(
    kisit.ogretimTurleri?.length ? kisit.ogretimTurleri : [kisit.ogretimTuru]
  );
  return {
    ogretimTuru: { in: turler },
    ders: { in: kisit.dersler },
  };
}

/** Soru modeli üzerine uygulanacak Prisma where parçası ( konu üzerinden ). */
export function soruWhereKisiti(kisit: OgretmenKisit | null) {
  if (!kisit) return {};
  const turler = ogretimTurleriniGenislet(
    kisit.ogretimTurleri?.length ? kisit.ogretimTurleri : [kisit.ogretimTuru]
  );
  return {
    konu: {
      ogretimTuru: { in: turler },
      ders: { in: kisit.dersler },
    },
  };
}

/** Öğretmen yalnızca kendi oluşturduğu / (eski kayıt) düzenlediği soruları görür */
export function ogretmenKendiSorulariWhere(userId: string) {
  return {
    OR: [
      { olusturanId: userId },
      { AND: [{ olusturanId: null }, { duzenleyenId: userId }] },
    ],
  };
}

type OgretmenSoruKayit = {
  olusturanId?: string | null;
  duzenleyenId?: string | null;
  onayDurumu?: string | null;
  konu?: { ders?: string | null; ogretimTuru?: OgretimTuru | null } | null;
};

/** TEACHER: branş + kendi hazırladığı soru kontrolü */
export async function ogretmenSoruIslemIzni(
  req: AuthRequest,
  soru: OgretmenSoruKayit,
): Promise<{ ok: true } | { ok: false; status: number; mesaj: string }> {
  const ogrKisit = await reqOgretmenKisit(req);
  if (!ogrKisit) return { ok: true };

  if (soru.konu) {
    if (!ogretmenKonuUretebilirMi(ogrKisit, {
      ogretimTuru: soru.konu.ogretimTuru as OgretimTuru,
      ders: soru.konu.ders || '',
    })) {
      return { ok: false, status: 403, mesaj: 'Bu soru sizin branşınıza ait değil.' };
    }
  }

  const userId = req.kullanici?.userId;
  if (!userId) {
    return { ok: false, status: 403, mesaj: 'Oturum gerekli.' };
  }

  const { soruOgretmenSahibiMi } = await import('../utils/soruDuzenleyen');
  if (!soruOgretmenSahibiMi(soru, userId)) {
    return {
      ok: false,
      status: 403,
      mesaj: 'Yalnızca kendi hazırladığınız sorular üzerinde işlem yapabilirsiniz.',
    };
  }
  return { ok: true };
}

/**
 * Öğretmen, gerçek deneme sınavına atanmış soruyu ONAYLANDI yapamaz —
 * atama onayı yalnızca ADMIN/SUPER_ADMIN tarafından verilir.
 * Soru bankası (grup havuzu) içerik onayı öğretmen için serbest kalır.
 */
export async function ogretmenSinavAtamaOnayEngeli(
  req: AuthRequest,
  soruIds: string[],
  hedefOnay: string,
): Promise<{ ok: true } | { ok: false; status: number; mesaj: string }> {
  if (hedefOnay !== 'ONAYLANDI') return { ok: true };
  const ogrKisit = await reqOgretmenKisit(req);
  if (!ogrKisit) return { ok: true };

  const { GRUP_BANKA_SINAV_BASLIGI } = await import('../utils/grupBankaSinavi');
  const sorular = await prisma.soru.findMany({
    where: { id: { in: soruIds } },
    select: {
      id: true,
      sinavId: true,
      sinav: { select: { baslik: true } },
    },
  });

  const denemede = sorular.some(
    (s) => s.sinavId && s.sinav?.baslik !== GRUP_BANKA_SINAV_BASLIGI,
  );
  if (denemede) {
    return {
      ok: false,
      status: 403,
      mesaj: 'Sınava atanmış soruları yalnızca yönetici onaylayabilir.',
    };
  }
  return { ok: true };
}

/** Toplu işlemler için tüm soruların öğretmen sahipliğini doğrular */
export async function ogretmenSoruIdsIslemIzni(
  req: AuthRequest,
  ids: string[],
): Promise<{ ok: true } | { ok: false; status: number; mesaj: string }> {
  const ogrKisit = await reqOgretmenKisit(req);
  if (!ogrKisit) return { ok: true };

  const userId = req.kullanici?.userId;
  if (!userId) {
    return { ok: false, status: 403, mesaj: 'Oturum gerekli.' };
  }

  const { soruOgretmenSahibiMi } = await import('../utils/soruDuzenleyen');
  const sorular = await prisma.soru.findMany({
    where: { id: { in: ids } },
    select: {
      olusturanId: true,
      duzenleyenId: true,
      onayDurumu: true,
      konu: { select: { ders: true, ogretimTuru: true } },
    },
  });

  if (sorular.length !== ids.length) {
    return { ok: false, status: 400, mesaj: 'Bazı sorular bulunamadı.' };
  }

  for (const s of sorular) {
    if (
      s.konu &&
      !ogretmenKonuUretebilirMi(ogrKisit, {
        ogretimTuru: s.konu.ogretimTuru as OgretimTuru,
        ders: s.konu.ders || '',
      })
    ) {
      return { ok: false, status: 403, mesaj: 'Seçilen sorulardan bazıları sizin branşınıza ait değil.' };
    }
    if (!soruOgretmenSahibiMi(s, userId)) {
      return {
        ok: false,
        status: 403,
        mesaj: 'Yalnızca kendi hazırladığınız sorular üzerinde işlem yapabilirsiniz.',
      };
    }
  }
  return { ok: true };
}
