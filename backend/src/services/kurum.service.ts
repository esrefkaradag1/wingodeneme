import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { KocTipi, KurumBasvuruDurum, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { ogretimTuruBelirle } from '../utils/ogretimTuru';
import { bildirimGonder } from './bildirim.service';
import { benzersizReferansKodUret, kurumKapsamGetir } from './koc.service';

/** Kurum tarafından açılan hesaplar için geçici şifre (en az 8 karakter, büyük harf + rakam) */
function geciciSifreUret(): string {
  const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const kucuk = 'abcdefghijkmnpqrstuvwxyz';
  let govde = '';
  for (let i = 0; i < 4; i++) govde += kucuk[randomInt(kucuk.length)];
  const rakam = String(randomInt(1000, 9999));
  return `${harfler[randomInt(harfler.length)]}${govde}${rakam}`;
}

function emailNormalize(ham: unknown): string {
  const email = String(ham || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppHatasi('Geçerli bir e-posta adresi girin', 400);
  }
  return email;
}

function adSoyadDogrula(ad: unknown, soyad: unknown): { ad: string; soyad: string } {
  const a = String(ad || '').trim();
  const s = String(soyad || '').trim();
  if (!a) throw new AppHatasi('Ad zorunlu', 400);
  return { ad: a, soyad: s };
}

/** Sınıfın bu kuruma ait olduğunu doğrular */
async function sinifDogrula(kurumId: string, sinifId: string) {
  const sinif = await prisma.kurumSinif.findFirst({ where: { id: sinifId, kurumId } });
  if (!sinif) throw new AppHatasi('Sınıf bulunamadı', 404);
  return sinif;
}

/** Öğretmenin bu kuruma bağlı olduğunu doğrular */
async function ogretmenDogrula(kurumId: string, ogretmenId: string) {
  const ogretmen = await prisma.kocProfil.findFirst({
    where: { id: ogretmenId, ustKurumId: kurumId, tip: KocTipi.KURUM_OGRETMENI },
    include: { kullanici: { select: { id: true, email: true, aktif: true } } },
  });
  if (!ogretmen) throw new AppHatasi('Öğretmen bulunamadı', 404);
  return ogretmen;
}

/** Öğrencinin bu kuruma bağlı olduğunu doğrular */
async function ogrenciDogrula(kurumId: string, ogrenciId: string) {
  const ogrenci = await prisma.ogrenciProfil.findFirst({
    where: { id: ogrenciId, kocId: kurumId },
    include: { kullanici: { select: { id: true, email: true, aktif: true } } },
  });
  if (!ogrenci) throw new AppHatasi('Öğrenci bu kuruma bağlı değil', 404);
  return ogrenci;
}

async function sinifAtamalariniAyarla(ogretmenId: string, kurumId: string, sinifIds: string[]) {
  const temiz = [...new Set(sinifIds.filter(Boolean))];
  if (temiz.length) {
    const gecerli = await prisma.kurumSinif.count({ where: { id: { in: temiz }, kurumId } });
    if (gecerli !== temiz.length) throw new AppHatasi('Geçersiz sınıf seçimi', 400);
  }
  await prisma.kurumSinifOgretmen.deleteMany({ where: { kocProfilId: ogretmenId } });
  if (temiz.length) {
    await prisma.kurumSinifOgretmen.createMany({
      data: temiz.map((sinifId) => ({ sinifId, kocProfilId: ogretmenId })),
      skipDuplicates: true,
    });
  }
}

// ============================================
// ÖZET
// ============================================

export async function kurumOzetGetir(kullaniciId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);

  const [ogrenciSayisi, ogretmenSayisi, sinifSayisi, sinifsizOgrenci] = await Promise.all([
    prisma.ogrenciProfil.count({ where: { kocId: kurum.id } }),
    prisma.kocProfil.count({ where: { ustKurumId: kurum.id } }),
    prisma.kurumSinif.count({ where: { kurumId: kurum.id } }),
    prisma.ogrenciProfil.count({ where: { kocId: kurum.id, kurumSinifId: null } }),
  ]);

  return {
    kurum: {
      id: kurum.id,
      ad: kurum.ad,
      soyad: kurum.soyad,
      kurumAdi: kurum.kurumAdi,
      referansKod: kurum.referansKod,
    },
    sayilar: { ogrenciSayisi, ogretmenSayisi, sinifSayisi, sinifsizOgrenci },
  };
}

// ============================================
// SINIFLAR
// ============================================

export async function kurumSinifListesi(kullaniciId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);

  const siniflar = await prisma.kurumSinif.findMany({
    where: { kurumId: kurum.id },
    orderBy: { ad: 'asc' },
    include: {
      _count: { select: { ogrenciler: true, ogretmenler: true } },
      ogretmenler: {
        include: { ogretmen: { select: { id: true, ad: true, soyad: true } } },
      },
    },
  });

  const sinifIds = siniflar.map((s) => s.id);
  const katilimlar = sinifIds.length
    ? await prisma.sinavKatilim.findMany({
        where: {
          durum: 'TAMAMLANDI',
          ogrenci: { kocId: kurum.id, kurumSinifId: { in: sinifIds } },
        },
        select: { netPuan: true, ogrenci: { select: { kurumSinifId: true } } },
      })
    : [];

  const netMap = new Map<string, number[]>();
  for (const k of katilimlar) {
    const sid = k.ogrenci.kurumSinifId;
    if (!sid) continue;
    const liste = netMap.get(sid) || [];
    liste.push(k.netPuan);
    netMap.set(sid, liste);
  }

  return siniflar.map((s) => {
    const netler = netMap.get(s.id) || [];
    return {
      id: s.id,
      ad: s.ad,
      seviye: s.seviye,
      aciklama: s.aciklama,
      aktif: s.aktif,
      ogrenciSayisi: s._count.ogrenciler,
      ogretmenSayisi: s._count.ogretmenler,
      ogretmenler: s.ogretmenler.map((o) => ({
        id: o.ogretmen.id,
        ad: o.ogretmen.ad,
        soyad: o.ogretmen.soyad,
      })),
      denemeSayisi: netler.length,
      ortalamaNet: netler.length
        ? parseFloat((netler.reduce((a, b) => a + b, 0) / netler.length).toFixed(2))
        : 0,
    };
  });
}

export async function kurumSinifOlustur(
  kullaniciId: string,
  girdi: { ad?: string; seviye?: string; aciklama?: string },
) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const ad = String(girdi.ad || '').trim();
  if (!ad) throw new AppHatasi('Sınıf adı zorunlu', 400);

  const mevcut = await prisma.kurumSinif.findFirst({ where: { kurumId: kurum.id, ad } });
  if (mevcut) throw new AppHatasi('Bu adla bir sınıf zaten var', 409);

  return prisma.kurumSinif.create({
    data: {
      kurumId: kurum.id,
      ad,
      seviye: String(girdi.seviye || '').trim() || null,
      aciklama: String(girdi.aciklama || '').trim() || null,
    },
  });
}

export async function kurumSinifGuncelle(
  kullaniciId: string,
  sinifId: string,
  girdi: { ad?: string; seviye?: string; aciklama?: string; aktif?: boolean },
) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const sinif = await sinifDogrula(kurum.id, sinifId);

  const ad = girdi.ad === undefined ? sinif.ad : String(girdi.ad).trim();
  if (!ad) throw new AppHatasi('Sınıf adı zorunlu', 400);
  if (ad !== sinif.ad) {
    const cakisma = await prisma.kurumSinif.findFirst({ where: { kurumId: kurum.id, ad } });
    if (cakisma) throw new AppHatasi('Bu adla bir sınıf zaten var', 409);
  }

  return prisma.kurumSinif.update({
    where: { id: sinif.id },
    data: {
      ad,
      seviye: girdi.seviye === undefined ? sinif.seviye : String(girdi.seviye || '').trim() || null,
      aciklama: girdi.aciklama === undefined ? sinif.aciklama : String(girdi.aciklama || '').trim() || null,
      aktif: typeof girdi.aktif === 'boolean' ? girdi.aktif : sinif.aktif,
    },
  });
}

export async function kurumSinifSil(kullaniciId: string, sinifId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const sinif = await sinifDogrula(kurum.id, sinifId);

  const ogrenciSayisi = await prisma.ogrenciProfil.count({ where: { kurumSinifId: sinif.id } });
  // Öğrenciler kurumda kalır, yalnızca sınıf bağlantısı düşer (FK: SET NULL)
  await prisma.kurumSinif.delete({ where: { id: sinif.id } });
  return { silindi: true, sinifsizKalanOgrenci: ogrenciSayisi };
}

export async function kurumSinifDetay(kullaniciId: string, sinifId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const sinif = await sinifDogrula(kurum.id, sinifId);

  const [ogrenciler, ogretmenler] = await Promise.all([
    prisma.ogrenciProfil.findMany({
      where: { kurumSinifId: sinif.id },
      orderBy: [{ ad: 'asc' }, { soyad: 'asc' }],
      include: {
        kullanici: { select: { email: true, aktif: true } },
        _count: { select: { sinavKatilimlari: true } },
      },
    }),
    prisma.kurumSinifOgretmen.findMany({
      where: { sinifId: sinif.id },
      include: {
        ogretmen: {
          include: { kullanici: { select: { email: true, aktif: true } } },
        },
      },
    }),
  ]);

  return {
    sinif: {
      id: sinif.id,
      ad: sinif.ad,
      seviye: sinif.seviye,
      aciklama: sinif.aciklama,
      aktif: sinif.aktif,
    },
    ogrenciler: ogrenciler.map((o) => ({
      id: o.id,
      ad: o.ad,
      soyad: o.soyad,
      email: o.kullanici.email,
      hesapAktif: o.kullanici.aktif,
      sinif: o.sinif,
      ogretimTuru: o.ogretimTuru,
      katilimSayisi: o._count.sinavKatilimlari,
    })),
    ogretmenler: ogretmenler.map((a) => ({
      id: a.ogretmen.id,
      ad: a.ogretmen.ad,
      soyad: a.ogretmen.soyad,
      email: a.ogretmen.kullanici.email,
      hesapAktif: a.ogretmen.kullanici.aktif && a.ogretmen.aktif,
    })),
  };
}

export async function kurumSinifOgretmenAta(kullaniciId: string, sinifId: string, ogretmenId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  await sinifDogrula(kurum.id, sinifId);
  await ogretmenDogrula(kurum.id, ogretmenId);

  await prisma.kurumSinifOgretmen.upsert({
    where: { sinifId_kocProfilId: { sinifId, kocProfilId: ogretmenId } },
    create: { sinifId, kocProfilId: ogretmenId },
    update: {},
  });
  return { atandi: true };
}

export async function kurumSinifOgretmenKaldir(kullaniciId: string, sinifId: string, ogretmenId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  await sinifDogrula(kurum.id, sinifId);
  await prisma.kurumSinifOgretmen.deleteMany({ where: { sinifId, kocProfilId: ogretmenId } });
  return { kaldirildi: true };
}

// ============================================
// ÖĞRETMENLER
// ============================================

export async function kurumOgretmenListesi(kullaniciId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);

  const ogretmenler = await prisma.kocProfil.findMany({
    where: { ustKurumId: kurum.id, tip: KocTipi.KURUM_OGRETMENI },
    orderBy: [{ ad: 'asc' }, { soyad: 'asc' }],
    include: {
      kullanici: { select: { email: true, aktif: true, olusturuldu: true } },
      sinifAtamalari: { include: { sinif: { select: { id: true, ad: true } } } },
    },
  });

  const sinifIds = ogretmenler.flatMap((o) => o.sinifAtamalari.map((a) => a.sinifId));
  const ogrenciSayilari = sinifIds.length
    ? await prisma.ogrenciProfil.groupBy({
        by: ['kurumSinifId'],
        where: { kocId: kurum.id, kurumSinifId: { in: [...new Set(sinifIds)] } },
        _count: { _all: true },
      })
    : [];
  const sayiMap = new Map(ogrenciSayilari.map((s) => [s.kurumSinifId, s._count._all]));

  return ogretmenler.map((o) => ({
    id: o.id,
    ad: o.ad,
    soyad: o.soyad,
    telefon: o.telefon,
    email: o.kullanici.email,
    aktif: o.aktif && o.kullanici.aktif,
    profilAktif: o.aktif,
    olusturuldu: o.kullanici.olusturuldu.toISOString(),
    siniflar: o.sinifAtamalari.map((a) => ({ id: a.sinif.id, ad: a.sinif.ad })),
    ogrenciSayisi: o.sinifAtamalari.reduce((s, a) => s + (sayiMap.get(a.sinifId) ?? 0), 0),
  }));
}

export async function kurumOgretmenEkle(
  kullaniciId: string,
  girdi: { ad?: string; soyad?: string; email?: string; telefon?: string; sinifIds?: string[] },
) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const { ad, soyad } = adSoyadDogrula(girdi.ad, girdi.soyad);
  const email = emailNormalize(girdi.email);

  const mevcut = await prisma.kullanici.findUnique({ where: { email } });
  if (mevcut) throw new AppHatasi('Bu e-posta adresi zaten kayıtlı', 409);

  const geciciSifre = geciciSifreUret();
  const sifreHash = await bcrypt.hash(geciciSifre, 12);
  const referansKod = await benzersizReferansKodUret();

  const yeni = await prisma.kullanici.create({
    data: {
      email,
      sifre: sifreHash,
      rol: Rol.KOC,
      aktif: true,
      kocProfil: {
        create: {
          ad,
          soyad,
          telefon: String(girdi.telefon || '').trim() || null,
          tip: KocTipi.KURUM_OGRETMENI,
          kurumAdi: kurum.kurumAdi,
          referansKod,
          ustKurumId: kurum.id,
        },
      },
    },
    include: { kocProfil: true },
  });

  if (girdi.sinifIds?.length) {
    await sinifAtamalariniAyarla(yeni.kocProfil!.id, kurum.id, girdi.sinifIds);
  }

  await bildirimGonder({
    kullaniciId: yeni.id,
    baslik: 'Öğretmen hesabınız açıldı',
    mesaj: `${kurum.kurumAdi || 'Kurumunuz'} sizin için bir öğretmen hesabı oluşturdu. Öğrencilerinizin deneme sonuçlarını panelden takip edebilirsiniz.`,
    tur: 'hos_geldiniz',
  });

  return {
    ogretmen: {
      id: yeni.kocProfil!.id,
      ad,
      soyad,
      email,
    },
    geciciSifre,
  };
}

export async function kurumOgretmenGuncelle(
  kullaniciId: string,
  ogretmenId: string,
  girdi: { ad?: string; soyad?: string; telefon?: string; aktif?: boolean; sinifIds?: string[] },
) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const ogretmen = await ogretmenDogrula(kurum.id, ogretmenId);

  const guncel = await prisma.kocProfil.update({
    where: { id: ogretmen.id },
    data: {
      ad: girdi.ad === undefined ? ogretmen.ad : String(girdi.ad).trim() || ogretmen.ad,
      soyad: girdi.soyad === undefined ? ogretmen.soyad : String(girdi.soyad || '').trim(),
      telefon: girdi.telefon === undefined ? ogretmen.telefon : String(girdi.telefon || '').trim() || null,
      aktif: typeof girdi.aktif === 'boolean' ? girdi.aktif : ogretmen.aktif,
    },
  });

  if (girdi.sinifIds) {
    await sinifAtamalariniAyarla(ogretmen.id, kurum.id, girdi.sinifIds);
  }

  return guncel;
}

export async function kurumOgretmenSil(kullaniciId: string, ogretmenId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const ogretmen = await ogretmenDogrula(kurum.id, ogretmenId);

  // Kullanıcı silinince koç profili ve sınıf atamaları cascade ile düşer
  await prisma.bildirim.deleteMany({ where: { kullaniciId: ogretmen.kullanici.id } });
  await prisma.kullaniciOturum.deleteMany({ where: { kullaniciId: ogretmen.kullanici.id } });
  await prisma.kullaniciAktivite.deleteMany({ where: { kullaniciId: ogretmen.kullanici.id } });
  await prisma.kullanici.delete({ where: { id: ogretmen.kullanici.id } });

  return { silindi: true };
}

export async function kurumOgretmenSifreSifirla(kullaniciId: string, ogretmenId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const ogretmen = await ogretmenDogrula(kurum.id, ogretmenId);

  const geciciSifre = geciciSifreUret();
  await prisma.kullanici.update({
    where: { id: ogretmen.kullanici.id },
    data: { sifre: await bcrypt.hash(geciciSifre, 12), refreshToken: null },
  });

  return { email: ogretmen.kullanici.email, geciciSifre };
}

// ============================================
// ÖĞRENCİLER
// ============================================

export async function kurumOgrenciListesi(kullaniciId: string, sinifId?: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);

  const ogrenciler = await prisma.ogrenciProfil.findMany({
    where: {
      kocId: kurum.id,
      ...(sinifId === 'yok' ? { kurumSinifId: null } : sinifId ? { kurumSinifId: sinifId } : {}),
    },
    orderBy: [{ ad: 'asc' }, { soyad: 'asc' }],
    include: {
      kullanici: { select: { email: true, aktif: true } },
      kurumSinif: { select: { id: true, ad: true } },
      _count: { select: { sinavKatilimlari: true } },
    },
  });

  return ogrenciler.map((o) => ({
    id: o.id,
    ad: o.ad,
    soyad: o.soyad,
    email: o.kullanici.email,
    hesapAktif: o.kullanici.aktif,
    sinif: o.sinif,
    okul: o.okul,
    ogretimTuru: o.ogretimTuru,
    kurumSinifId: o.kurumSinifId,
    kurumSinifAdi: o.kurumSinif?.ad ?? null,
    katilimSayisi: o._count.sinavKatilimlari,
  }));
}

export async function kurumOgrenciHesapAc(
  kullaniciId: string,
  girdi: {
    ad?: string;
    soyad?: string;
    email?: string;
    telefon?: string;
    sinif?: string;
    ogretimTuru?: string;
    okul?: string;
    kurumSinifId?: string;
  },
) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const { ad, soyad } = adSoyadDogrula(girdi.ad, girdi.soyad);
  const email = emailNormalize(girdi.email);

  const mevcut = await prisma.kullanici.findUnique({ where: { email } });
  if (mevcut) throw new AppHatasi('Bu e-posta adresi zaten kayıtlı — "mevcut öğrenci bağla" seçeneğini kullanın', 409);

  if (girdi.kurumSinifId) await sinifDogrula(kurum.id, girdi.kurumSinifId);

  const ogretimTuru = ogretimTuruBelirle(girdi.sinif, girdi.ogretimTuru);
  const geciciSifre = geciciSifreUret();
  const sifreHash = await bcrypt.hash(geciciSifre, 12);

  const yeni = await prisma.kullanici.create({
    data: {
      email,
      sifre: sifreHash,
      rol: Rol.OGRENCI,
      aktif: true,
      ogrenciProfil: {
        create: {
          ad,
          soyad,
          sinif: String(girdi.sinif || '').trim() || null,
          okul: String(girdi.okul || '').trim() || kurum.kurumAdi,
          ogretimTuru,
          kocId: kurum.id,
          kurumSinifId: girdi.kurumSinifId || null,
        },
      },
    },
    include: { ogrenciProfil: true },
  });

  await bildirimGonder({
    kullaniciId: yeni.id,
    baslik: 'Hesabınız hazır',
    mesaj: `${kurum.kurumAdi || 'Kurumunuz'} sizin için bir öğrenci hesabı oluşturdu. Denemelere katılıp sonuçlarınızı görebilirsiniz.`,
    tur: 'hos_geldiniz',
  });

  return {
    ogrenci: {
      id: yeni.ogrenciProfil!.id,
      ad,
      soyad,
      email,
      kurumSinifId: yeni.ogrenciProfil!.kurumSinifId,
    },
    geciciSifre,
  };
}

export async function kurumOgrenciBagla(
  kullaniciId: string,
  girdi: { email?: string; kurumSinifId?: string },
) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const email = emailNormalize(girdi.email);
  if (girdi.kurumSinifId) await sinifDogrula(kurum.id, girdi.kurumSinifId);

  const ogrenciKu = await prisma.kullanici.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { ogrenciProfil: true },
  });
  if (!ogrenciKu?.ogrenciProfil || ogrenciKu.rol !== Rol.OGRENCI) {
    throw new AppHatasi('Bu e-posta ile kayıtlı öğrenci bulunamadı', 404);
  }

  const op = ogrenciKu.ogrenciProfil;
  if (op.kocId && op.kocId !== kurum.id) {
    throw new AppHatasi('Bu öğrenci başka bir koç / kuruma bağlı', 409);
  }

  const guncel = await prisma.ogrenciProfil.update({
    where: { id: op.id },
    data: { kocId: kurum.id, kurumSinifId: girdi.kurumSinifId || op.kurumSinifId },
  });

  return {
    zatenBagli: op.kocId === kurum.id,
    ogrenci: { id: guncel.id, ad: guncel.ad, soyad: guncel.soyad, email },
  };
}

export async function kurumOgrenciSinifAta(
  kullaniciId: string,
  ogrenciId: string,
  kurumSinifId: string | null,
) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  await ogrenciDogrula(kurum.id, ogrenciId);
  if (kurumSinifId) await sinifDogrula(kurum.id, kurumSinifId);

  const guncel = await prisma.ogrenciProfil.update({
    where: { id: ogrenciId },
    data: { kurumSinifId },
    include: { kurumSinif: { select: { ad: true } } },
  });

  return { ogrenciId: guncel.id, kurumSinifId: guncel.kurumSinifId, kurumSinifAdi: guncel.kurumSinif?.ad ?? null };
}

export async function kurumOgrenciCikar(kullaniciId: string, ogrenciId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const ogrenci = await ogrenciDogrula(kurum.id, ogrenciId);

  await prisma.ogrenciProfil.update({
    where: { id: ogrenci.id },
    data: { kocId: null, kurumSinifId: null },
  });
  return { cikarildi: true, ogrenci: { id: ogrenci.id, ad: ogrenci.ad, soyad: ogrenci.soyad } };
}

export async function kurumOgrenciSifreSifirla(kullaniciId: string, ogrenciId: string) {
  const kurum = await kurumKapsamGetir(kullaniciId);
  const ogrenci = await ogrenciDogrula(kurum.id, ogrenciId);

  const geciciSifre = geciciSifreUret();
  await prisma.kullanici.update({
    where: { id: ogrenci.kullanici.id },
    data: { sifre: await bcrypt.hash(geciciSifre, 12), refreshToken: null },
  });

  return { email: ogrenci.kullanici.email, geciciSifre };
}

// ============================================
// YÖNETİCİ — DOĞRUDAN KURUM AÇMA
// ============================================

/**
 * Süper admin başvuru beklemeden kurum hesabı açar.
 * Hesap doğrudan AKTIF gelir; giriş bilgileri bir kez döndürülür.
 */
export async function adminKurumHesabiOlustur(girdi: {
  kurumAdi?: string;
  ad?: string;
  soyad?: string;
  email?: string;
  telefon?: string;
  sehir?: string;
  beklenenOgrenci?: number | string;
  demoGun?: number | string | null;
}) {
  const kurumAdi = String(girdi.kurumAdi || '').trim();
  if (!kurumAdi) throw new AppHatasi('Kurum adı zorunlu', 400);
  const { ad, soyad } = adSoyadDogrula(girdi.ad, girdi.soyad);
  const email = emailNormalize(girdi.email);

  const mevcut = await prisma.kullanici.findUnique({ where: { email } });
  if (mevcut) throw new AppHatasi('Bu e-posta adresi zaten kayıtlı', 409);

  const gun = Number(girdi.demoGun);
  const demoBitis =
    Number.isFinite(gun) && gun > 0
      ? new Date(Date.now() + Math.min(Math.round(gun), 3650) * 24 * 60 * 60 * 1000)
      : null;

  const beklenen = Number(girdi.beklenenOgrenci);
  const geciciSifre = geciciSifreUret();
  const referansKod = await benzersizReferansKodUret();

  const yeni = await prisma.kullanici.create({
    data: {
      email,
      sifre: await bcrypt.hash(geciciSifre, 12),
      rol: Rol.KOC,
      aktif: true,
      kocProfil: {
        create: {
          ad,
          soyad,
          telefon: String(girdi.telefon || '').trim() || null,
          tip: KocTipi.KURUMSAL,
          kurumAdi,
          referansKod,
          basvuruDurum: KurumBasvuruDurum.AKTIF,
          kararTarihi: new Date(),
          demoBitis,
          sehir: String(girdi.sehir || '').trim() || null,
          beklenenOgrenci: Number.isFinite(beklenen) && beklenen > 0 ? Math.round(beklenen) : null,
        },
      },
    },
    include: { kocProfil: true },
  });

  await bildirimGonder({
    kullaniciId: yeni.id,
    baslik: 'Kurum hesabınız açıldı',
    mesaj: demoBitis
      ? `Kurum paneliniz kullanıma hazır. Demo erişiminiz ${demoBitis.toLocaleDateString('tr-TR')} tarihine kadar geçerli. Referans kodunuz: ${referansKod}`
      : `Kurum paneliniz kullanıma hazır. Referans kodunuz: ${referansKod}`,
    tur: 'kurum_onay',
  });

  return {
    kurum: {
      id: yeni.kocProfil!.id,
      kurumAdi,
      ad,
      soyad,
      email,
      referansKod,
      demoBitis: demoBitis?.toISOString() ?? null,
    },
    geciciSifre,
  };
}
