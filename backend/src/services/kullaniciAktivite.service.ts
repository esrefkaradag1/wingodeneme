import type { Request } from 'express';
import { KullaniciAktiviteTuru, Prisma, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { soruOlusturulduAraligi } from '../utils/tarihAraligi';

const TAKIP_ROLLER: Rol[] = [Rol.TEACHER, Rol.ADMIN, Rol.SUPER_ADMIN];
const sonAktiviteGuncelleme = new Map<string, number>();
const AKTIVITE_GUNCELLEME_MS = 5 * 60 * 1000;

export function istekIpAdresi(req: Pick<Request, 'headers' | 'socket'>): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip) return ip.slice(0, 64);
  }
  const ip = req.socket?.remoteAddress;
  return ip ? String(ip).slice(0, 64) : undefined;
}

function istekUserAgent(req: Pick<Request, 'headers'>): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua.slice(0, 512) : undefined;
}

function takipEdilenRol(rol?: string): rol is Rol {
  return Boolean(rol && TAKIP_ROLLER.includes(rol as Rol));
}

async function acikOturumGetir(kullaniciId: string) {
  return prisma.kullaniciOturum.findFirst({
    where: { kullaniciId, bitis: null },
    orderBy: { baslangic: 'desc' },
  });
}

export async function oturumBaslat(
  kullaniciId: string,
  rol: string,
  req?: Pick<Request, 'headers' | 'socket'>,
): Promise<void> {
  if (!takipEdilenRol(rol)) return;

  await oturumBitir(kullaniciId, false);

  const oturum = await prisma.kullaniciOturum.create({
    data: {
      kullaniciId,
      ipAdresi: req ? istekIpAdresi(req) : undefined,
      userAgent: req ? istekUserAgent(req) : undefined,
    },
  });

  await aktiviteKaydet({
    kullaniciId,
    oturumId: oturum.id,
    tur: KullaniciAktiviteTuru.GIRIS,
    aciklama: 'Sisteme giriş yapıldı',
  });
}

export async function oturumBitir(kullaniciId: string, aktiviteKaydi = true): Promise<void> {
  const acik = await acikOturumGetir(kullaniciId);
  if (!acik) return;

  const bitis = new Date();
  const sureSaniye = Math.max(0, Math.floor((bitis.getTime() - acik.baslangic.getTime()) / 1000));

  await prisma.kullaniciOturum.update({
    where: { id: acik.id },
    data: { bitis, sureSaniye, sonAktivite: bitis },
  });

  if (aktiviteKaydi) {
    await aktiviteKaydet({
      kullaniciId,
      oturumId: acik.id,
      tur: KullaniciAktiviteTuru.CIKIS,
      aciklama: 'Sistemden çıkış yapıldı',
      meta: { sureSaniye },
    });
  }

  sonAktiviteGuncelleme.delete(kullaniciId);
}

export async function oturumSonAktiviteGuncelle(kullaniciId: string, rol: string): Promise<void> {
  if (!takipEdilenRol(rol)) return;

  const simdi = Date.now();
  const son = sonAktiviteGuncelleme.get(kullaniciId) ?? 0;
  if (simdi - son < AKTIVITE_GUNCELLEME_MS) return;
  sonAktiviteGuncelleme.set(kullaniciId, simdi);

  const acik = await acikOturumGetir(kullaniciId);
  if (!acik) return;

  await prisma.kullaniciOturum.update({
    where: { id: acik.id },
    data: { sonAktivite: new Date() },
  });
}

export async function aktiviteKaydet(opts: {
  kullaniciId: string;
  tur: KullaniciAktiviteTuru;
  aciklama?: string;
  meta?: Record<string, unknown>;
  oturumId?: string;
}): Promise<void> {
  let oturumId = opts.oturumId;
  if (!oturumId) {
    const acik = await acikOturumGetir(opts.kullaniciId);
    oturumId = acik?.id;
  }

  await prisma.kullaniciAktivite.create({
    data: {
      kullaniciId: opts.kullaniciId,
      oturumId,
      tur: opts.tur,
      aciklama: opts.aciklama,
      meta: (opts.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

function oturumAraligiWhere(baslangicTarihi?: unknown, bitisTarihi?: unknown) {
  const aralik = soruOlusturulduAraligi(baslangicTarihi, bitisTarihi);
  if (!aralik.olusturuldu) return {};
  return { baslangic: aralik.olusturuldu };
}

function sureHesapla(
  oturum: { baslangic: Date; bitis: Date | null; sonAktivite: Date; sureSaniye: number | null },
  simdi = new Date(),
): number {
  if (oturum.sureSaniye != null) return oturum.sureSaniye;
  const bitis = oturum.bitis ?? oturum.sonAktivite ?? simdi;
  return Math.max(0, Math.floor((bitis.getTime() - oturum.baslangic.getTime()) / 1000));
}

function sureFormat(saniye: number): string {
  if (saniye < 60) return `${saniye} sn`;
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  if (dk < 60) return sn > 0 ? `${dk} dk ${sn} sn` : `${dk} dk`;
  const sa = Math.floor(dk / 60);
  const kalanDk = dk % 60;
  return kalanDk > 0 ? `${sa} sa ${kalanDk} dk` : `${sa} sa`;
}

export async function ogretmenAktiviteOzetListe(opts: {
  baslangicTarihi?: string;
  bitisTarihi?: string;
  q?: string;
  aktif?: string;
}) {
  const q = opts.q?.trim();
  const ogretmenler = await prisma.kullanici.findMany({
    where: {
      rol: Rol.TEACHER,
      ...(opts.aktif === 'true' ? { aktif: true } : opts.aktif === 'false' ? { aktif: false } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { adminProfil: { ad: { contains: q, mode: 'insensitive' } } },
              { adminProfil: { soyad: { contains: q, mode: 'insensitive' } } },
              { adminProfil: { brans: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { adminProfil: true },
    orderBy: [{ aktif: 'desc' }, { olusturuldu: 'desc' }],
  });

  const ids = ogretmenler.map((o) => o.id);
  if (ids.length === 0) {
    return { ogretmenler: [], ozet: { toplamOgretmen: 0, aktifOgretmen: 0, toplamSoru: 0, toplamOturumSaati: 0 } };
  }

  const tarihFiltre = soruOlusturulduAraligi(opts.baslangicTarihi, opts.bitisTarihi);
  const oturumFiltre = oturumAraligiWhere(opts.baslangicTarihi, opts.bitisTarihi);

  const [soruGruplar, aiSoruGruplar, onayBekleyenGruplar, oturumlar, sonGirisler] = await Promise.all([
    prisma.soru.groupBy({
      by: ['olusturanId'],
      where: { olusturanId: { in: ids }, ...tarihFiltre },
      _count: { _all: true },
      _max: { olusturuldu: true },
    }),
    prisma.soru.groupBy({
      by: ['olusturanId'],
      where: { olusturanId: { in: ids }, aiUretildi: true, ...tarihFiltre },
      _count: { _all: true },
    }),
    prisma.soru.groupBy({
      by: ['olusturanId'],
      where: { olusturanId: { in: ids }, onayDurumu: 'ONAY_BEKLIYOR' },
      _count: { _all: true },
    }),
    prisma.kullaniciOturum.findMany({
      where: { kullaniciId: { in: ids }, ...oturumFiltre },
      select: {
        kullaniciId: true,
        baslangic: true,
        bitis: true,
        sonAktivite: true,
        sureSaniye: true,
      },
      orderBy: { baslangic: 'desc' },
    }),
    prisma.kullaniciAktivite.findMany({
      where: { kullaniciId: { in: ids }, tur: KullaniciAktiviteTuru.GIRIS },
      select: { kullaniciId: true, olusturuldu: true },
      orderBy: { olusturuldu: 'desc' },
    }),
  ]);

  const soruMap = new Map(soruGruplar.map((g) => [g.olusturanId!, g]));
  const aiMap = new Map(aiSoruGruplar.map((g) => [g.olusturanId!, g._count._all]));
  const onayMap = new Map(onayBekleyenGruplar.map((g) => [g.olusturanId!, g._count._all]));
  const sonGirisMap = new Map<string, Date>();
  for (const g of sonGirisler) {
    if (!sonGirisMap.has(g.kullaniciId)) sonGirisMap.set(g.kullaniciId, g.olusturuldu);
  }

  const oturumAgg = new Map<
    string,
    { oturumSayisi: number; toplamSureSaniye: number; sonAktivite: Date | null; sonGiris: Date | null }
  >();

  for (const o of oturumlar) {
    const mevcut = oturumAgg.get(o.kullaniciId) ?? {
      oturumSayisi: 0,
      toplamSureSaniye: 0,
      sonAktivite: null,
      sonGiris: null,
    };
    mevcut.oturumSayisi += 1;
    mevcut.toplamSureSaniye += sureHesapla(o);
    if (!mevcut.sonGiris || o.baslangic > mevcut.sonGiris) mevcut.sonGiris = o.baslangic;
    const adayAktivite = o.bitis ?? o.sonAktivite;
    if (!mevcut.sonAktivite || adayAktivite > mevcut.sonAktivite) mevcut.sonAktivite = adayAktivite;
    oturumAgg.set(o.kullaniciId, mevcut);
  }

  const simdi = new Date();
  const liste = ogretmenler.map((o) => {
    const profil = o.adminProfil;
    const soru = soruMap.get(o.id);
    const oturum = oturumAgg.get(o.id);
    const toplamSureSaniye = oturum?.toplamSureSaniye ?? 0;
    const sonGiris = sonGirisMap.get(o.id) ?? oturum?.sonGiris ?? null;
    const sonAktivite = oturum?.sonAktivite ?? sonGiris;

    return {
      id: o.id,
      email: o.email,
      aktif: o.aktif,
      ad: profil?.ad ?? '',
      soyad: profil?.soyad ?? '',
      brans: profil?.brans ?? null,
      ogretimTuru: profil?.ogretimTuru ?? null,
      kayitTarihi: o.olusturuldu,
      soruSayisi: soru?._count._all ?? 0,
      aiSoruSayisi: aiMap.get(o.id) ?? 0,
      onayBekleyenSayisi: onayMap.get(o.id) ?? 0,
      sonSoruTarihi: soru?._max.olusturuldu ?? null,
      oturumSayisi: oturum?.oturumSayisi ?? 0,
      toplamSureSaniye,
      toplamSureMetin: sureFormat(toplamSureSaniye),
      sonGiris,
      sonAktivite,
      acikOturum: oturumlar.some((x) => x.kullaniciId === o.id && !x.bitis),
    };
  });

  liste.sort((a, b) => {
    const aT = a.sonAktivite?.getTime() ?? 0;
    const bT = b.sonAktivite?.getTime() ?? 0;
    if (bT !== aT) return bT - aT;
    return b.soruSayisi - a.soruSayisi;
  });

  const toplamSoru = liste.reduce((t, x) => t + x.soruSayisi, 0);
  const toplamOturumSaati = Math.round(liste.reduce((t, x) => t + x.toplamSureSaniye, 0) / 3600);

  return {
    ogretmenler: liste,
    ozet: {
      toplamOgretmen: liste.length,
      aktifOgretmen: liste.filter((x) => x.aktif).length,
      toplamSoru,
      toplamOturumSaati,
    },
  };
}

export async function ogretmenAktiviteDetay(
  kullaniciId: string,
  opts: { baslangicTarihi?: string; bitisTarihi?: string; limit?: number },
) {
  const ogretmen = await prisma.kullanici.findFirst({
    where: { id: kullaniciId, rol: Rol.TEACHER },
    include: { adminProfil: true },
  });
  if (!ogretmen) return null;

  const limit = Math.min(100, Math.max(10, opts.limit ?? 50));
  const tarihFiltre = soruOlusturulduAraligi(opts.baslangicTarihi, opts.bitisTarihi);
  const oturumFiltre = oturumAraligiWhere(opts.baslangicTarihi, opts.bitisTarihi);

  const [oturumlar, aktiviteler, soruSayisi, aiSoruSayisi] = await Promise.all([
    prisma.kullaniciOturum.findMany({
      where: { kullaniciId, ...oturumFiltre },
      orderBy: { baslangic: 'desc' },
      take: limit,
    }),
    prisma.kullaniciAktivite.findMany({
      where: {
        kullaniciId,
        ...(tarihFiltre.olusturuldu ? { olusturuldu: tarihFiltre.olusturuldu } : {}),
      },
      orderBy: { olusturuldu: 'desc' },
      take: limit,
    }),
    prisma.soru.count({ where: { olusturanId: kullaniciId, ...tarihFiltre } }),
    prisma.soru.count({ where: { olusturanId: kullaniciId, aiUretildi: true, ...tarihFiltre } }),
  ]);

  return {
    ogretmen: {
      id: ogretmen.id,
      email: ogretmen.email,
      aktif: ogretmen.aktif,
      ad: ogretmen.adminProfil?.ad ?? '',
      soyad: ogretmen.adminProfil?.soyad ?? '',
      brans: ogretmen.adminProfil?.brans ?? null,
      ogretimTuru: ogretmen.adminProfil?.ogretimTuru ?? null,
      kayitTarihi: ogretmen.olusturuldu,
    },
    istatistik: { soruSayisi, aiSoruSayisi },
    oturumlar: oturumlar.map((o) => ({
      id: o.id,
      baslangic: o.baslangic,
      bitis: o.bitis,
      sonAktivite: o.sonAktivite,
      sureSaniye: sureHesapla(o),
      sureMetin: sureFormat(sureHesapla(o)),
      ipAdresi: o.ipAdresi,
      acik: !o.bitis,
    })),
    aktiviteler: aktiviteler.map((a) => ({
      id: a.id,
      tur: a.tur,
      aciklama: a.aciklama,
      meta: a.meta,
      olusturuldu: a.olusturuldu,
    })),
  };
}

export { sureFormat };
