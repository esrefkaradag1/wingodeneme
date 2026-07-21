import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { Rol } from '@prisma/client';
import { ogrenciAnalizGetir } from './analiz.service';
import { sinavListesiGetir } from './sinav.service';
import { onerileriGetir } from './oneri.service';
import { duyurularim } from './duyuru.service';
import { destekTaleplerim, veliDestekTalebiOlustur } from './destek.service';

/** Veli profili yoksa (eski veri / manuel rol) otomatik oluşturur */
export async function veliProfilGetirVeyaOlustur(kullaniciId: string) {
  const mevcut = await prisma.veliProfil.findUnique({
    where: { kullaniciId },
  });
  if (mevcut) return mevcut;

  const ku = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: { email: true, rol: true },
  });
  if (!ku || ku.rol !== Rol.VELI) {
    throw new AppHatasi('Veli profili bulunamadı', 404);
  }
  const local = ku.email.split('@')[0] || 'veli';
  const ad = local.charAt(0).toUpperCase() + local.slice(1);

  return prisma.veliProfil.create({
    data: {
      kullaniciId,
      ad,
      soyad: '',
    },
  });
}

export async function veliOgrenciBagla(veliKullaniciId: string, ogrenciEmail: string) {
  const email = ogrenciEmail.trim().toLowerCase();
  if (!email.length) {
    throw new AppHatasi('Öğrenci e-postası gerekli', 400);
  }

  const veliProfil = await veliProfilGetirVeyaOlustur(veliKullaniciId);

  const ogrenciKu = await prisma.kullanici.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
    },
    include: { ogrenciProfil: true },
  });

  if (!ogrenciKu) {
    throw new AppHatasi('Bu e-posta ile kayıtlı öğrenci bulunamadı', 404);
  }
  if (ogrenciKu.rol !== Rol.OGRENCI) {
    throw new AppHatasi('Bu e-posta bir öğrenci hesabına ait değil', 400);
  }
  if (!ogrenciKu.ogrenciProfil) {
    throw new AppHatasi('Öğrenci profili eksik', 400);
  }

  const op = ogrenciKu.ogrenciProfil;
  if (op.veliId && op.veliId !== veliProfil.id) {
    throw new AppHatasi('Bu öğrenci başka bir veli hesabına bağlı', 409);
  }
  if (op.veliId === veliProfil.id) {
    return {
      zatenBagli: true,
      ogrenci: { id: op.id, ad: op.ad, soyad: op.soyad } as const,
    };
  }

  await prisma.ogrenciProfil.update({
    where: { id: op.id },
    data: { veliId: veliProfil.id },
  });

  return {
    zatenBagli: false,
    ogrenci: { id: op.id, ad: op.ad, soyad: op.soyad } as const,
  };
}

export async function veliOzetGetir(veliKullaniciId: string) {
  const veliProfil = await veliProfilGetirVeyaOlustur(veliKullaniciId);

  const ogrenciler = await prisma.ogrenciProfil.findMany({
    where: { veliId: veliProfil.id },
    orderBy: { ad: 'asc' },
    include: {
      sinavKatilimlari: {
        where: { durum: 'TAMAMLANDI' },
        orderBy: { olusturuldu: 'desc' },
        take: 10,
        include: {
          sinav: { select: { baslik: true, tur: true } },
        },
      },
      studyPlanlar: {
        where: { aktif: true },
        orderBy: { olusturuldu: 'desc' },
        take: 1,
        include: {
          _count: { select: { gorevler: true } },
          gorevler: {
            where: { tamamlandi: false },
            take: 5,
            orderBy: { gun: 'asc' },
          },
        },
      },
    },
  });

  const ogrenciOzetleri = ogrenciler.map((o) => {
    const katilimlar = o.sinavKatilimlari;
    const n = katilimlar.length;
    const ortalamaNet = n > 0
      ? katilimlar.reduce((s, k) => s + k.netPuan, 0) / n
      : 0;
    const siralamalar = katilimlar.map((k) => k.ulusalSiralama).filter((x): x is number => x != null);
    const enIyiSiralama = siralamalar.length > 0 ? Math.min(...siralamalar) : null;

    const plan = o.studyPlanlar[0];
    let aktifCalismaPlani: {
      id: string;
      baslik: string;
      gorevSayisi: number;
      bekleyenGorev: number;
      bitis: string;
      onumdekiGorevler: Array<{ baslik: string; ders: string; gun: number }>;
    } | null = null;

    if (plan) {
      const bekleyen = plan.gorevler.filter((g) => !g.tamamlandi).length;
      aktifCalismaPlani = {
        id: plan.id,
        baslik: plan.baslik,
        gorevSayisi: plan._count.gorevler,
        bekleyenGorev: bekleyen,
        bitis: plan.bitis.toISOString(),
        onumdekiGorevler: plan.gorevler.map((g) => ({
          baslik: g.baslik,
          ders: g.ders,
          gun: g.gun,
        })),
      };
    }

    return {
      id: o.id,
      ad: o.ad,
      soyad: o.soyad,
      sinif: o.sinif,
      okul: o.okul,
      ogretimTuru: o.ogretimTuru,
      ozet: {
        tamamlananDeneme: n,
        ortalamaNet: parseFloat(ortalamaNet.toFixed(2)),
        enIyiSiralama,
      },
      sonDenemeler: katilimlar.map((k) => ({
        katilimId: k.id,
        sinavBaslik: k.sinav.baslik,
        sinavTur: k.sinav.tur,
        net: k.netPuan,
        siralama: k.ulusalSiralama,
        tarih: k.olusturuldu.toISOString(),
      })),
      aktifCalismaPlani,
    };
  });

  return {
    veli: {
      ad: veliProfil.ad,
      soyad: veliProfil.soyad,
    },
    ogrenciSayisi: ogrenciOzetleri.length,
    ogrenciler: ogrenciOzetleri,
  };
}

/** Veli–öğrenci ilişkisini doğrular; yetkisiz erişimde hata fırlatır */
export async function veliOgrenciDogrula(veliKullaniciId: string, ogrenciProfilId: string) {
  const veliProfil = await veliProfilGetirVeyaOlustur(veliKullaniciId);
  const ogrenci = await prisma.ogrenciProfil.findFirst({
    where: { id: ogrenciProfilId, veliId: veliProfil.id },
    include: {
      kullanici: { select: { id: true, email: true } },
      veli: { select: { ad: true, soyad: true } },
    },
  });
  if (!ogrenci) {
    throw new AppHatasi('Bu öğrenciye erişim yetkiniz yok', 403);
  }
  return ogrenci;
}

export async function veliOgrenciProfilGetir(veliKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  return {
    id: ogrenci.id,
    ad: ogrenci.ad,
    soyad: ogrenci.soyad,
    sinif: ogrenci.sinif,
    okul: ogrenci.okul,
    ogretimTuru: ogrenci.ogretimTuru,
    hedefUniversite: ogrenci.hedefUniversite,
    hedefBolum: ogrenci.hedefBolum,
    email: ogrenci.kullanici.email,
  };
}

export async function veliOgrenciAnalizGetir(veliKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  const analiz = await ogrenciAnalizGetir(ogrenci.id);
  const sonAi = await prisma.aIAnaliz.findFirst({
    where: { ogrenciId: ogrenci.id },
    orderBy: { olusturuldu: 'desc' },
  });
  return {
    analiz,
    aiAnaliz: sonAi?.oneriler ?? null,
  };
}

export async function veliOgrenciSinavlarGetir(
  veliKullaniciId: string,
  ogrenciProfilId: string,
  isKpssPlatform = false,
) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  return sinavListesiGetir(ogrenci.id, isKpssPlatform);
}

export async function veliOgrenciSonucGetir(
  veliKullaniciId: string,
  ogrenciProfilId: string,
  katilimId: string,
) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);

  const katilim = await prisma.sinavKatilim.findUnique({
    where: { id: katilimId },
    include: {
      sinav: { select: { baslik: true, tur: true } },
      cevaplar: { include: { soru: { include: { konu: true } } } },
    },
  });
  if (!katilim) {
    throw new AppHatasi('Katılım bulunamadı', 404);
  }
  if (katilim.ogrenciId !== ogrenci.id) {
    throw new AppHatasi('Bu sonuca erişim yetkiniz yok', 403);
  }

  const kazanimMap = new Map<
    string,
    {
      kazanim: string;
      ders: string;
      konu: string;
      toplam: number;
      dogru: number;
      yanlis: number;
      bos: number;
      yanlisSoruNo: number[];
    }
  >();

  for (const c of katilim.cevaplar) {
    const kazanim = (c.soru as { kazanim?: string }).kazanim;
    if (!kazanim?.trim()) continue;

    const key = `${c.soru.konu.ders}::${c.soru.konu.ad}::${kazanim.trim()}`;
    const mevcut =
      kazanimMap.get(key) || {
        kazanim: kazanim.trim(),
        ders: c.soru.konu.ders,
        konu: c.soru.konu.ad,
        toplam: 0,
        dogru: 0,
        yanlis: 0,
        bos: 0,
        yanlisSoruNo: [] as number[],
      };

    mevcut.toplam += 1;
    if (c.dogru === true) mevcut.dogru += 1;
    else if (c.dogru === false) {
      mevcut.yanlis += 1;
      mevcut.yanlisSoruNo.push((c.soru as { siraNo?: number }).siraNo ?? 0);
    } else {
      mevcut.bos += 1;
    }

    kazanimMap.set(key, mevcut);
  }

  const kazanimAnalizi = Array.from(kazanimMap.values())
    .map((k) => ({
      ...k,
      basariYuzdesi: k.toplam > 0 ? parseFloat(((k.dogru / k.toplam) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);

  return { ...katilim, kazanimAnalizi };
}

export async function veliOgrenciStudyPlanlarGetir(veliKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  return prisma.studyPlan.findMany({
    where: { ogrenciId: ogrenci.id },
    orderBy: { olusturuldu: 'desc' },
    include: {
      gorevler: { orderBy: [{ gun: 'asc' }, { olusturuldu: 'asc' }] },
    },
  });
}

export async function veliOgrenciOnerilerGetir(veliKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  return onerileriGetir(ogrenci.id);
}

export async function veliOgrenciDuyurularGetir(veliKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  return duyurularim(ogrenci.kullanici.id);
}

export async function veliOgrenciDestekGetir(veliKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  return destekTaleplerim(ogrenci.kullanici.id);
}

export async function veliOgrenciDestekOlustur(
  veliKullaniciId: string,
  ogrenciProfilId: string,
  girdi: { baslik: unknown; mesaj: unknown },
) {
  await veliOgrenciDogrula(veliKullaniciId, ogrenciProfilId);
  return veliDestekTalebiOlustur(veliKullaniciId, ogrenciProfilId, girdi);
}
