/**
 * Talip Çukurlu (ve genel) KPSS Türkçe sorularını eşleşen TYT konularına kopyalar.
 * Yarınki TYT sınavı için acil: panelde "0 soru" görünen TYT konularını doldurur.
 *
 * Kullanım:
 *   npx ts-node --transpile-only scripts/kpss-turkce-tyt-kopyala.ts
 *   npx ts-node --transpile-only scripts/kpss-turkce-tyt-kopyala.ts --dry
 *   npx ts-node --transpile-only scripts/kpss-turkce-tyt-kopyala.ts --email tcoogu@gmail.com
 */
import { Prisma, PrismaClient, SoruOnayDurumu } from '@prisma/client';
import { soruMetinImzasi, soruMetinImzasiGecerli } from '../src/utils/soruMetinImza';

const p = new PrismaClient();

/** KPSS / eski YKS konu adı → TYT konu adı */
const KONU_ESLEME: Record<string, string> = {
  'Anlatım Bozuklukları': 'Anlatım Bozuklukları',
  'Cümlede Anlam': 'Cümlede Anlam',
  'Cümlenin Ögeleri': 'Cümlenin Ögeleri',
  'Noktalama İşaretleri': 'Noktalama İşaretleri',
  'Paragrafta Anlam': 'Paragrafta Anlam',
  Paragraf: 'Paragrafta Anlam',
  'Ses Bilgisi': 'Ses Bilgisi',
  'Sözcükte Anlam': 'Sözcükte Anlam',
  'Yazım Kuralları': 'Yazım Kuralları',
  'Anlam Bilgisi': 'Sözcükte Anlam',
  'Fiiller ve Fiilimsiler': 'Fiiller',
  Fiiller: 'Fiiller',
  Fiilimsiler: 'Fiilimsiler',
  Zarflar: 'Zarflar',
  'Cümle Türleri': 'Cümle Türleri',
};

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const emailIdx = args.indexOf('--email');
  const email = emailIdx >= 0 ? args[emailIdx + 1] : 'tcoogu@gmail.com';

  const kullanici = await p.kullanici.findFirst({
    where: { email },
    select: { id: true, email: true, adminProfil: { select: { ad: true, soyad: true } } },
  });
  if (!kullanici) {
    console.error('Kullanıcı bulunamadı:', email);
    process.exit(1);
  }
  console.log(
    'Kaynak öğretmen:',
    kullanici.adminProfil?.ad,
    kullanici.adminProfil?.soyad,
    kullanici.email,
    kullanici.id,
  );
  console.log(dry ? 'DRY-RUN (yazılmayacak)' : 'CANLI kopyalama');

  const tytKonular = await p.konu.findMany({
    where: {
      ogretimTuru: 'YKS',
      ders: { contains: 'Türkçe', mode: 'insensitive' },
      OR: [{ yksSegment: 'TYT' }, { yksSegment: null }],
    },
    select: { id: true, ad: true, yksSegment: true },
  });
  const tytByAd = new Map(tytKonular.map((k) => [k.ad, k]));

  const kaynakSorular = await p.soru.findMany({
    where: {
      olusturanId: kullanici.id,
      onayDurumu: SoruOnayDurumu.ONAYLANDI,
      konu: {
        ders: { contains: 'Türkçe', mode: 'insensitive' },
      },
    },
    include: {
      konu: { select: { id: true, ad: true, ogretimTuru: true, yksSegment: true } },
      uygunGruplar: { select: { grupId: true } },
      ekKonular: { select: { konuId: true } },
    },
  });
  console.log('Onaylı Türkçe kaynak soru:', kaynakSorular.length);

  // Hedef TYT konularındaki mevcut imzalar (mükerrer engeli)
  const tytKonuIds = [...new Set([...tytByAd.values()].map((k) => k.id))];
  const mevcutTyt = await p.soru.findMany({
    where: { konuId: { in: tytKonuIds } },
    select: { konuId: true, metinHtml: true },
  });
  const imzaSet = new Map<string, Set<string>>();
  for (const s of mevcutTyt) {
    const imza = soruMetinImzasi(s.metinHtml);
    if (!soruMetinImzasiGecerli(imza)) continue;
    const set = imzaSet.get(s.konuId) || new Set();
    set.add(imza);
    imzaSet.set(s.konuId, set);
  }

  let kopyalanan = 0;
  let atlananAyni = 0;
  let atlananEslesmeYok = 0;
  let zatenTyt = 0;
  const ozet = new Map<string, number>();

  for (const s of kaynakSorular) {
    // Zaten doğru TYT konusunda ise atla
    if (s.konu.ogretimTuru === 'YKS' && s.konu.yksSegment === 'TYT') {
      zatenTyt++;
      continue;
    }

    const hedefAd = KONU_ESLEME[s.konu.ad] || (tytByAd.has(s.konu.ad) ? s.konu.ad : null);
    if (!hedefAd) {
      atlananEslesmeYok++;
      continue;
    }
    const hedef = tytByAd.get(hedefAd);
    if (!hedef) {
      atlananEslesmeYok++;
      console.warn('TYT konu bulunamadı:', hedefAd);
      continue;
    }

    // Aynı konu id ise (null segment YKS) → segment düzeltmesi yerine kopya/taşı
    if (s.konuId === hedef.id) {
      zatenTyt++;
      continue;
    }

    const imza = soruMetinImzasi(s.metinHtml);
    const set = imzaSet.get(hedef.id) || new Set();
    if (soruMetinImzasiGecerli(imza) && set.has(imza)) {
      atlananAyni++;
      continue;
    }

    if (!dry) {
      const kopya = await p.soru.create({
        data: {
          sinavId: null,
          siraNo: s.siraNo,
          konuId: hedef.id,
          metinHtml: s.metinHtml,
          gorselUrl: s.gorselUrl,
          secenekler: (s.secenekler as Prisma.InputJsonValue) ?? {},
          dogruCevap: s.dogruCevap,
          zorluk: s.zorluk,
          kazanim: s.kazanim,
          onayDurumu: SoruOnayDurumu.ONAYLANDI,
          aiUretildi: s.aiUretildi,
          aiModeli: s.aiModeli,
          aiMeta:
            s.aiMeta === null
              ? Prisma.JsonNull
              : ({
                  ...(typeof s.aiMeta === 'object' && s.aiMeta && !Array.isArray(s.aiMeta)
                    ? (s.aiMeta as object)
                    : {}),
                  kopyaKaynak: {
                    soruId: s.id,
                    konuId: s.konuId,
                    konuAd: s.konu.ad,
                    ogretimTuru: s.konu.ogretimTuru,
                    amac: 'KPSS/YKS→TYT acil kopya',
                  },
                } as Prisma.InputJsonValue),
          ogretmenGuncelledi: s.ogretmenGuncelledi,
          olusturanId: s.olusturanId,
          duzenleyenId: s.duzenleyenId,
        },
      });
      if (s.uygunGruplar.length > 0) {
        await p.soruUygunGrup.createMany({
          data: s.uygunGruplar.map((u) => ({ soruId: kopya.id, grupId: u.grupId })),
          skipDuplicates: true,
        });
      }
      if (s.ekKonular.length > 0) {
        await p.soruKonuEtiket.createMany({
          data: s.ekKonular.map((e) => ({ soruId: kopya.id, konuId: e.konuId })),
          skipDuplicates: true,
        });
      }
    }

    if (soruMetinImzasiGecerli(imza)) {
      set.add(imza);
      imzaSet.set(hedef.id, set);
    }
    kopyalanan++;
    ozet.set(hedefAd, (ozet.get(hedefAd) || 0) + 1);
  }

  console.log('\n--- ÖZET ---');
  console.log('Kopyalanan:', kopyalanan);
  console.log('Zaten TYT:', zatenTyt);
  console.log('Mükerrer atlandı:', atlananAyni);
  console.log('Eşleşme yok:', atlananEslesmeYok);
  console.log('Konu başına:');
  for (const [ad, n] of [...ozet.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ad}: +${n}`);
  }

  // Doğrulama
  for (const ad of [
    'Anlatım Bozuklukları',
    'Cümlede Anlam',
    'Paragrafta Anlam',
    'Sözcükte Anlam',
    'Yazım Kuralları',
    'Noktalama İşaretleri',
  ]) {
    const k = tytByAd.get(ad);
    if (!k) continue;
    const n = await p.soru.count({
      where: { konuId: k.id, onayDurumu: SoruOnayDurumu.ONAYLANDI },
    });
    console.log(`TYT "${ad}" onaylı: ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
