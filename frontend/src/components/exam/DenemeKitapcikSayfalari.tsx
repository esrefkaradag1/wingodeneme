'use client';

import { OgmKitapcikBasligi } from '@/components/exam/OgmKitapcikBasligi';
import { OsymSinavBasligi } from '@/components/exam/OsymSinavBasligi';
import { SoruKarti } from '@/components/exam/SoruKarti';
import { TUR_BILGI, denemeEtiketiCikar, osymSatirKodu } from '@/lib/osymKitapcikMetin';
import { kitapcikSolKodSatir } from '@/lib/kitapcikDagilimMetni';
import { cozumleKitapcikBolumleri } from '@/lib/kitapcikBolumleri';
import {
  KITAPCIK_SAYFA_BASI_SORU,
  denemeSayfaFiligranSinifi,
  kitapcikIkiSutunMu,
  kitapcikOgmTema,
  ogmKapakMi,
} from '@/lib/kitapcik-tema';
import { KitapcikKapakSayfasi } from '@/components/exam/KitapcikKapakSayfasi';

type Soru = {
  id: string;
  siraNo: number;
  metinHtml: string;
  gorselUrl?: string | null;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string };
};

function sayfaParcala<T>(dizi: T[], sayfaBoyu: number): T[][] {
  const cikis: T[][] = [];
  for (let i = 0; i < dizi.length; i += sayfaBoyu) {
    cikis.push(dizi.slice(i, i + sayfaBoyu));
  }
  return cikis;
}

function DenemeIcSayfaBasligi({
  tur,
  baslangicZamani,
  kitapcikBolumAdi,
  sinavBaslik,
}: {
  tur: string;
  baslangicZamani: string;
  kitapcikBolumAdi?: string | null;
  sinavBaslik?: string | null;
}) {
  const yil = new Date(baslangicZamani).getFullYear();
  const bilgi = TUR_BILGI[tur] || TUR_BILGI.TYT;
  const bolum = (kitapcikBolumAdi || 'GENEL TEST').toLocaleUpperCase('tr-TR');
  const solKod = kitapcikSolKodSatir(yil, tur, bolum);
  const sagEtiket =
    denemeEtiketiCikar(sinavBaslik) || denemeEtiketiCikar(bolum) || `${yil}-${bilgi.kod}/TÜR`;

  if (ogmKapakMi(tur)) {
    return (
      <OgmKitapcikBasligi
        tur={tur}
        yil={yil}
        bolum={bolum}
        solKod={solKod}
        sagEtiket={sagEtiket}
        variant="ic-sayfa"
      />
    );
  }

  return (
    <div className="deneme-ic-sayfa-diger mb-4 pb-2 border-b border-gray-800 text-center">
      <p className="text-[11px] font-bold text-gray-900 tracking-wide font-serif">
        {osymSatirKodu(yil, tur, bolum)}
      </p>
    </div>
  );
}

function DenemeSayfaAlti({
  tur,
  sayfaNo,
  toplamSayfa,
}: {
  tur: string;
  sayfaNo: number;
  toplamSayfa: number;
}) {
  const sonSayfa = sayfaNo >= toplamSayfa;
  const tema = kitapcikOgmTema(tur);
  const accent = ogmKapakMi(tur) ? tema.accent : '#9ca3af';

  return (
    <div className="deneme-sayfa-footer mt-auto pt-3">
      <div className="relative min-h-[1.75rem] pt-2" style={{ borderTop: `1px solid ${accent}` }}>
        {ogmKapakMi(tur) ? (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-900">
            {tema.footerSol}
          </span>
        ) : null}
        <span className="block text-center text-[12px] font-semibold text-gray-900 tabular-nums">
          {sayfaNo}
        </span>
        {!sonSayfa && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-900">
            Diğer sayfaya geçiniz.
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  tur: string;
  baslangicZamani: string;
  kitapcikBolumAdi?: string | null;
  kitapcikTarihMetni?: string | null;
  kitapcikUrl?: string | null;
  konuDagilimi?: unknown;
  sorular: Soru[];
  ilkKonuDers?: string | null;
  sinavBaslik?: string | null;
}

/** YKS + LGS: iki sütun, sayfa başına 8 soru (ÖSYM kitapçık düzeni) */
export function DenemeKitapcikSayfalari({
  tur,
  baslangicZamani,
  kitapcikBolumAdi,
  kitapcikTarihMetni,
  kitapcikUrl,
  konuDagilimi,
  sorular,
  ilkKonuDers,
  sinavBaslik,
}: Props) {
  const ikiSutun = kitapcikIkiSutunMu(tur);
  const sayfaBoyu = ikiSutun ? KITAPCIK_SAYFA_BASI_SORU : 6;
  const filigranSinifi = denemeSayfaFiligranSinifi(tur);
  const bolumler = cozumleKitapcikBolumleri(tur, sorular, konuDagilimi, kitapcikBolumAdi);

  const sayfaPlan = bolumler.flatMap((b) => {
    const bolumSorularSirali = [...b.sorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0));
    const sayfalar = bolumSorularSirali.length === 0 ? [] : sayfaParcala(bolumSorularSirali, sayfaBoyu);
    return sayfalar.map((grup, idx) => ({
      bolumAdi: b.bolumAdi,
      isBolumIlkSayfa: idx === 0,
      sorular: grup,
      bolumToplam: bolumSorularSirali.length,
      dagilimBloklari: b.dagilimBloklari,
      aciklama: b.aciklama,
    }));
  });

  const kapakVar = !!kitapcikUrl?.trim();
  const toplamSayfa = Math.max(1, sayfaPlan.length + (kapakVar ? 1 : 0));

  if (sorular.length === 0 && !kapakVar) {
    return (
      <div className="px-6 pb-8 text-sm text-gray-500 text-center">
        Bu sınava henüz soru eklenmemiş veya soru listesi alınamadı (backend güncelleyin).
      </div>
    );
  }

  return (
    <div className="deneme-cok-sayfa flex flex-col gap-8 print:gap-0">
      {kapakVar ? <KitapcikKapakSayfasi url={kitapcikUrl!.trim()} sayfaNo={1} toplamSayfa={toplamSayfa} /> : null}
      {sayfaPlan.map((p, idx) => (
        <section
          key={idx}
          className={`deneme-a4-sayfa flex flex-col bg-white border border-gray-300 rounded-sm shadow-md print:shadow-none print:rounded-none overflow-hidden ${
            filigranSinifi || ''
          }`}
        >
          <div className="deneme-a4-ic flex flex-col flex-1 min-h-0 px-[10mm] pt-[12mm] pb-[8mm] sm:px-8 sm:pt-10 sm:pb-6 print:px-[12mm] print:pt-[10mm]">
            {p.isBolumIlkSayfa ? (
              <OsymSinavBasligi
                tur={tur}
                baslangicZamani={baslangicZamani}
                kitapcikBolumAdi={p.bolumAdi}
                kitapcikTarihMetni={kitapcikTarihMetni}
                soruSayisi={p.bolumToplam}
                ilkKonuDers={null}
                tamKapak
                dagilimBloklari={p.dagilimBloklari}
                talimat1Override={p.aciklama}
                sinavBaslik={sinavBaslik}
              />
            ) : (
              <DenemeIcSayfaBasligi
                tur={tur}
                baslangicZamani={baslangicZamani}
                kitapcikBolumAdi={p.bolumAdi}
                sinavBaslik={sinavBaslik}
              />
            )}

            <div className={ikiSutun ? 'deneme-iki-sutun' : 'deneme-tek-sutun'}>
              {p.sorular.map((soru) => (
                <SoruKarti
                  key={soru.id}
                  soru={soru}
                  secilen={null}
                  onSec={() => {}}
                  saltOkunur
                />
              ))}
            </div>
          </div>

          <DenemeSayfaAlti
            tur={tur}
            sayfaNo={idx + 1 + (kapakVar ? 1 : 0)}
            toplamSayfa={toplamSayfa}
          />
        </section>
      ))}
    </div>
  );
}
