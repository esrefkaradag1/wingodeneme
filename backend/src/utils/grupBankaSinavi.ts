import { OgretimTuru, SinavTuru } from '@prisma/client';
import { prisma } from '../config/database';

/** Grup için otomatik soru havuzu sınavı — sorular `sinavId` ile gruba bağlanır */
export const GRUP_BANKA_SINAV_BASLIGI = 'Soru Bankası (Grup)';

function ogretimTuruToSinavTuru(tur: OgretimTuru): SinavTuru {
  if (tur === 'LGS') return 'LGS';
  return 'TYT';
}

/** Verilen grupta sabit başlıklı bir sınav yoksa oluşturur; soru bankası kayıtları buraya yazılır */
export async function ensureGrupBankaSinavi(grupId: string): Promise<string | null> {
  const grup = await prisma.grup.findUnique({ where: { id: grupId } });
  if (!grup) return null;

  const mevcut = await prisma.sinav.findFirst({
    where: { grupId, baslik: GRUP_BANKA_SINAV_BASLIGI },
  });
  if (mevcut) return mevcut.id;

  const simdi = new Date();
  const bitis = new Date(simdi.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  const sinav = await prisma.sinav.create({
    data: {
      baslik: GRUP_BANKA_SINAV_BASLIGI,
      aciklama: 'Grup soru havuzu — otomatik oluşturuldu.',
      tur: ogretimTuruToSinavTuru(grup.tur),
      grupId,
      baslangicZamani: simdi,
      bitisZamani: bitis,
      sureDakika: 120,
      aktif: false,
      yayinlandi: false,
    },
  });
  return sinav.id;
}
