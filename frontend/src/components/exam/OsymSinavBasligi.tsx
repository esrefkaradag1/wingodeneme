'use client';

import { OgmKitapcikBasligi } from '@/components/exam/OgmKitapcikBasligi';
import type { DagilimBloku } from '@/lib/kitapcikDagilimMetni';
import {
  formatOsymDagilimCumlesi,
  kitapcikSolKodSatir,
  soruSirasinaGoreDersBloklari,
} from '@/lib/kitapcikDagilimMetni';
import { ogmKapakMi } from '@/lib/kitapcik-tema';
import {
  OSYM_UYARI_METNI,
  TUR_BILGI,
  bolumAdiCoz,
  denemeEtiketiCikar,
  osymSatirKodu,
  tarihMetniUret,
} from '@/lib/osymKitapcikMetin';

export { bolumAdiCoz, osymSatirKodu } from '@/lib/osymKitapcikMetin';

interface SoruDagilimKaynak {
  siraNo: number;
  konu?: { ders?: string };
}

interface OsymSinavBasligiProps {
  tur: string;
  baslangicZamani: string;
  kitapcikBolumAdi?: string | null;
  kitapcikTarihMetni?: string | null;
  soruSayisi: number;
  ilkKonuDers?: string | null;
  tamKapak?: boolean;
  dagilimBloklari?: DagilimBloku[] | null;
  talimat1Override?: string | null;
  sorularKaynak?: SoruDagilimKaynak[] | null;
  sinavBaslik?: string | null;
}

export function OsymSinavBasligi({
  tur,
  baslangicZamani,
  kitapcikBolumAdi,
  kitapcikTarihMetni,
  soruSayisi,
  ilkKonuDers,
  tamKapak = true,
  dagilimBloklari: dagilimProp,
  sorularKaynak,
  sinavBaslik,
  talimat1Override,
}: OsymSinavBasligiProps) {
  const yil = new Date(baslangicZamani).getFullYear();
  const bilgi = TUR_BILGI[tur] || TUR_BILGI.TYT;
  const bolum = bolumAdiCoz(kitapcikBolumAdi, ilkKonuDers);
  const tarih = tarihMetniUret(baslangicZamani, kitapcikTarihMetni);
  const satir = osymSatirKodu(yil, tur, bolum);
  const kod = bilgi.kod;
  const ustKodSatir = `${yil}-${kod}/TÜR`;

  const bloklar: DagilimBloku[] =
    dagilimProp && dagilimProp.length > 0
      ? dagilimProp
      : sorularKaynak && sorularKaynak.length > 0
        ? soruSirasinaGoreDersBloklari(sorularKaynak)
        : [];

  const talimat1 =
    bloklar.length > 0
      ? formatOsymDagilimCumlesi(bloklar, soruSayisi)
      : talimat1Override?.trim() || formatOsymDagilimCumlesi([], soruSayisi);

  const solKod = kitapcikSolKodSatir(yil, tur, bolum);
  const sagUstEtiket =
    denemeEtiketiCikar(sinavBaslik) || denemeEtiketiCikar(bolum) || `${yil}-${kod}/TÜR`;

  if (!tamKapak) {
    if (ogmKapakMi(tur)) {
      return (
        <OgmKitapcikBasligi
          tur={tur}
          yil={yil}
          bolum={bolum}
          solKod={solKod}
          sagEtiket={sagUstEtiket}
          variant="ic-sayfa"
        />
      );
    }
    return (
      <div className="osym-satir-kodu border-b border-gray-800 pb-2 mb-4 text-center text-[11px] font-bold text-gray-900 tracking-wide font-serif">
        <span className="block text-[10px] font-mono text-gray-600 mb-0.5">{solKod}</span>
        {satir}
      </div>
    );
  }

  if (ogmKapakMi(tur)) {
    return (
      <>
        <OgmKitapcikBasligi
          tur={tur}
          yil={yil}
          bolum={bolum}
          solKod={solKod}
          sagEtiket={sagUstEtiket}
          talimat1={talimat1}
          tarihAlt={tarih}
          ustKodSatir={ustKodSatir}
          satir={satir}
        />
        <div className="sr-only">{OSYM_UYARI_METNI}</div>
      </>
    );
  }

  return (
    <div className="osym-kapak mb-6 text-gray-900 select-none font-serif">
      <p className="text-[8.5px] leading-snug text-gray-600 border-b border-gray-300 pb-3 mb-4 text-justify">
        {OSYM_UYARI_METNI}
      </p>
      <div className="text-center space-y-1.5">
        <p className="text-[11px] font-semibold tracking-wide">{bilgi.ust}</p>
        <p className="text-[15px] font-bold tracking-wide leading-tight">{bilgi.alt}</p>
        <p className="text-xs font-semibold pt-0.5">({yil}-{bilgi.kod})</p>
        <p className="text-[11px] font-medium pt-2 text-gray-800">{tarih}</p>
      </div>
      <div className="mt-5 pt-5 border-t-[3px] border-black">
        <p className="text-center text-[13px] font-bold tracking-wide">{satir}</p>
        <div className="mt-4 space-y-2.5 text-[11px] leading-relaxed text-gray-900">
          <p>
            <span className="font-bold">1.</span> {talimat1}
          </p>
          <p>
            <span className="font-bold">2.</span> Cevaplarınızı, cevap kâğıdının bu test için ayrılan bölümüne işaretleyiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
