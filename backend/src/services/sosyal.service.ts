import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { ArkadaslikDurumu, DuelloDurumu } from '@prisma/client';

export async function arkadaslikIstegi(ogrenciId: string, hedefOgrenciId: string) {
  if (ogrenciId === hedefOgrenciId) throw new AppHatasi('Kendinize arkadaşlık isteği gönderemezsiniz', 400);

  const mevcutIstek = await prisma.arkadaslik.findUnique({
    where: { ogrenciId_arkadasId: { ogrenciId, arkadasId: hedefOgrenciId } },
  });

  if (mevcutIstek) throw new AppHatasi('Arkadaşlık isteği zaten gönderildi', 409);

  return prisma.arkadaslik.create({
    data: { ogrenciId, arkadasId: hedefOgrenciId, durum: ArkadaslikDurumu.BEKLIYOR },
  });
}

export async function arkadaslikYanit(arkadaslikId: string, ogrenciId: string, kabul: boolean) {
  const arkadaslik = await prisma.arkadaslik.findUnique({ where: { id: arkadaslikId } });
  if (!arkadaslik) throw new AppHatasi('Arkadaşlık isteği bulunamadı', 404);
  if (arkadaslik.arkadasId !== ogrenciId) throw new AppHatasi('Bu isteği yanıtlama yetkiniz yok', 403);

  return prisma.arkadaslik.update({
    where: { id: arkadaslikId },
    data: { durum: kabul ? ArkadaslikDurumu.KABUL_EDILDI : ArkadaslikDurumu.REDDEDILDI },
  });
}

export async function arkadaslariGetir(ogrenciId: string) {
  const arkadasliklar = await prisma.arkadaslik.findMany({
    where: {
      OR: [
        { ogrenciId, durum: ArkadaslikDurumu.KABUL_EDILDI },
        { arkadasId: ogrenciId, durum: ArkadaslikDurumu.KABUL_EDILDI },
      ],
    },
  });

  const arkadasIdleri = arkadasliklar.map((a) =>
    a.ogrenciId === ogrenciId ? a.arkadasId : a.ogrenciId
  );

  return prisma.ogrenciProfil.findMany({
    where: { id: { in: arkadasIdleri } },
    select: {
      id: true, ad: true, soyad: true, okul: true, sehir: true,
      avatarUrl: true, puan: true, ogretimTuru: true,
    },
  });
}

export async function gelenArkadaslikIstekleri(ogrenciId: string) {
  const istekler = await prisma.arkadaslik.findMany({
    where: { arkadasId: ogrenciId, durum: ArkadaslikDurumu.BEKLIYOR },
    orderBy: { olusturuldu: 'desc' },
    include: {
      ogrenci: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          okul: true,
          sehir: true,
          avatarUrl: true,
          puan: true,
          ogretimTuru: true,
        },
      },
    },
    take: 50,
  });

  return istekler;
}

export async function puanKarsilastir(ogrenciId: string, arkadasId: string, sinavId?: string) {
  const where = sinavId
    ? { ogrenciId: { in: [ogrenciId, arkadasId] }, sinavId }
    : { ogrenciId: { in: [ogrenciId, arkadasId] } };

  const katilimlar = await prisma.sinavKatilim.findMany({
    where,
    include: {
      sinav: { select: { baslik: true, tur: true } },
      ogrenci: { select: { ad: true, soyad: true, avatarUrl: true } },
    },
    orderBy: { olusturuldu: 'desc' },
    take: 20,
  });

  return katilimlar;
}

export async function duelloBaslat(davetedenId: string, davetEdilenId: string, konuId?: string) {
  return prisma.duello.create({
    data: {
      davetedenId,
      davetEdilenId,
      konuId,
      durum: DuelloDurumu.DAVET_GONDERILDI,
    },
  });
}

export async function duelloYanit(duelloId: string, ogrenciId: string, kabul: boolean) {
  const duello = await prisma.duello.findUnique({ where: { id: duelloId } });
  if (!duello) throw new AppHatasi('Düello bulunamadı', 404);
  if (duello.davetEdilenId !== ogrenciId) throw new AppHatasi('Yetkisiz erişim', 403);

  return prisma.duello.update({
    where: { id: duelloId },
    data: { durum: kabul ? DuelloDurumu.KABUL_EDILDI : DuelloDurumu.IPTAL },
  });
}

export async function gelenDuelloDavetleri(ogrenciId: string) {
  return prisma.duello.findMany({
    where: { davetEdilenId: ogrenciId, durum: DuelloDurumu.DAVET_GONDERILDI },
    orderBy: { olusturuldu: 'desc' },
    include: {
      daveteden: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          okul: true,
          sehir: true,
          avatarUrl: true,
          puan: true,
          ogretimTuru: true,
        },
      },
    },
    take: 50,
  });
}

export async function duelloTamamla(duelloId: string, ogrenciId: string, puan: number) {
  const duello = await prisma.duello.findUnique({ where: { id: duelloId } });
  if (!duello) throw new AppHatasi('Düello bulunamadı', 404);

  const guncelleme: Record<string, unknown> = {};

  if (duello.davetedenId === ogrenciId) {
    guncelleme.davetciPuan = puan;
  } else if (duello.davetEdilenId === ogrenciId) {
    guncelleme.davetEdilenPuan = puan;
  }

  const guncelDuello = await prisma.duello.update({
    where: { id: duelloId },
    data: guncelleme,
  });

  if (guncelDuello.davetciPuan !== null && guncelDuello.davetEdilenPuan !== null) {
    const kazanan = (guncelDuello.davetciPuan || 0) >= (guncelDuello.davetEdilenPuan || 0)
      ? guncelDuello.davetedenId
      : guncelDuello.davetEdilenId;

    await prisma.duello.update({
      where: { id: duelloId },
      data: { durum: DuelloDurumu.TAMAMLANDI, tamamlandi: new Date(), kazanan },
    });
  }

  return guncelDuello;
}

export async function kullaniciAra(query: string, suankiOgrenciId: string) {
  return prisma.ogrenciProfil.findMany({
    where: {
      AND: [
        { id: { not: suankiOgrenciId } },
        {
          OR: [
            { ad: { contains: query, mode: 'insensitive' } },
            { soyad: { contains: query, mode: 'insensitive' } },
            {
              kullanici: {
                OR: [
                  { email: { contains: query, mode: 'insensitive' } },
                  { telefon: { contains: query, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      ad: true,
      soyad: true,
      okul: true,
      avatarUrl: true,
      puan: true,
      kullanici: {
        select: {
          email: true,
          telefon: true,
        },
      },
    },
    take: 10,
  });
}
