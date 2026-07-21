/**
 * Sınavdaki mükerrer (aynı metin) soruları listeler veya siler.
 *
 * Kullanım:
 *   npx ts-node scripts/sinav-mukerrer-temizle.ts --baslik "KPSS ORTA ÖĞRETİM DENEME 1"
 *   npx ts-node scripts/sinav-mukerrer-temizle.ts --sinavId <id> --sil
 */
import { PrismaClient } from '@prisma/client';
import { soruMetinImzasi, soruMetinImzasiGecerli } from '../src/utils/soruMetinImza';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const baslik = args.includes('--baslik') ? args[args.indexOf('--baslik') + 1] : undefined;
  const sinavIdArg = args.includes('--sinavId') ? args[args.indexOf('--sinavId') + 1] : undefined;
  const sil = args.includes('--sil');

  let sinavId = sinavIdArg;
  if (!sinavId && baslik) {
    const sn = await prisma.sinav.findFirst({
      where: { baslik: { contains: baslik, mode: 'insensitive' } },
      select: { id: true, baslik: true },
    });
    if (!sn) {
      console.error('Sınav bulunamadı:', baslik);
      process.exit(1);
    }
    sinavId = sn.id;
    console.log('Sınav:', sn.baslik, sn.id);
  }

  if (!sinavId) {
    console.error('--baslik veya --sinavId gerekli');
    process.exit(1);
  }

  const sorular = await prisma.soru.findMany({
    where: { sinavId },
    orderBy: { siraNo: 'asc' },
    select: { id: true, siraNo: true, metinHtml: true },
  });

  const imzaIlk = new Map<string, { id: string; siraNo: number }>();
  const silinecek: Array<{ id: string; siraNo: number; ilkSira: number }> = [];

  for (const s of sorular) {
    const imza = soruMetinImzasi(s.metinHtml);
    if (!soruMetinImzasiGecerli(imza)) continue;
    const ilk = imzaIlk.get(imza);
    if (!ilk) {
      imzaIlk.set(imza, { id: s.id, siraNo: s.siraNo });
      continue;
    }
    silinecek.push({ id: s.id, siraNo: s.siraNo, ilkSira: ilk.siraNo });
  }

  console.log(`Toplam soru: ${sorular.length}, mükerrer: ${silinecek.length}`);
  for (const s of silinecek) {
    console.log(`  S.${s.siraNo} → S.${s.ilkSira} ile aynı (${s.id})`);
  }

  if (sil && silinecek.length > 0) {
    await prisma.soru.deleteMany({
      where: { id: { in: silinecek.map((x) => x.id) } },
    });
    console.log(`${silinecek.length} mükerrer soru silindi. siraNo yeniden numaralandırılmalı — panelden kontrol edin.`);
  } else if (silinecek.length > 0) {
    console.log('Silmek için --sil ekleyin.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
