'use client';

import Image from 'next/image';
import { SoruHtmlMath } from '@/components/admin/SoruHtmlMath';
import { duzMetinHtmlSar } from '@/lib/soruCozumYardim';
import { soruGorunurHtml } from '@/lib/soru-metin-parcalari';

interface Soru {
  id: string;
  siraNo: number;
  metinHtml: string;
  gorselUrl?: string | null;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string };
}

interface Props {
  soru: Soru;
  secilen: string | null;
  onSec: (secilen: string | null) => void;
  aktif?: boolean;
  onTikla?: () => void;
  /** Önizleme / yazdır: tıklanamaz */
  saltOkunur?: boolean;
  /** Kitapçık 4’lü ızgara: daha sıkı düzen, dış hücre çerçevesi vurgusu */
  kompakt?: boolean;
}

const SECENEKLER = ['A', 'B', 'C', 'D', 'E'];

export function SoruKarti({ soru, secilen, onSec, aktif, onTikla, saltOkunur, kompakt }: Props) {
  const gorunurMetin = soruGorunurHtml(soru.metinHtml);
  const kitapcikTipografi = saltOkunur ? 'text-[11pt] leading-[1.35]' : kompakt ? 'text-[11pt] leading-[1.35]' : 'text-[16px] mb-4 leading-[1.5]';
  const secenekTipografi = saltOkunur || kompakt ? 'text-[11pt] leading-[1.35]' : 'text-[13.5px]';
  const secenekTikla = (sik: string) => {
    if (secilen === sik) {
      onSec(null); // İşareti kaldır
    } else {
      onSec(sik);
    }
  };

  return (
    <div
      className={`osym-soru flex items-start transition-all ${kompakt ? 'gap-2 !border-b-0 !py-0 !px-0' : 'gap-3'} ${saltOkunur ? '' : 'cursor-pointer'} ${
        aktif && !kompakt ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white rounded-lg' : ''
      } ${aktif && kompakt ? 'rounded-lg' : ''}`}
      onClick={saltOkunur ? undefined : onTikla}
    >
      <span
        className={`osym-soru-no font-bold text-slate-900 tabular-nums shrink-0 leading-snug pt-0.5 ${kompakt ? 'text-sm' : 'text-[15px]'}`}
      >
        {soru.siraNo}.
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`osym-soru-konu-etiket font-medium uppercase tracking-wide text-slate-500 ${
            kompakt ? 'block mb-1.5 text-[9px] leading-tight' : 'text-xs text-gray-400 hidden sm:block mb-2'
          }`}
        >
          {soru.konu.ders} · {soru.konu.ad}
        </span>

      {/* Soru metni + gömülü SVG/görsel */}
      <SoruHtmlMath
        html={gorunurMetin}
        className={`text-gray-900 leading-snug osym-soru-metin font-serif ${kompakt ? 'text-[11pt] mb-3 leading-[1.35]' : saltOkunur ? `mb-4 ${kitapcikTipografi}` : 'text-[16px] mb-4 leading-[1.5]'} [&_.soru-svg-gorsel]:my-4 [&_.soru-svg-gorsel]:flex [&_.soru-svg-gorsel]:justify-center [&_.soru-svg-gorsel]:bg-gray-50 [&_.soru-svg-gorsel]:rounded-lg [&_.soru-svg-gorsel]:p-3 [&_.soru-svg-gorsel]:border [&_.soru-svg-gorsel]:border-gray-200 [&_svg]:max-w-full [&_svg]:h-auto`}
      />

      {/* DALL-E / harici görsel */}
      {soru.gorselUrl && (
        <div className="mb-4 flex justify-center">
          <Image
            src={soru.gorselUrl}
            alt={`Soru ${soru.siraNo} görseli`}
            width={400}
            height={300}
            className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
          />
        </div>
      )}

      {/* Seçenekler — deneme sınavı: ince çemberli şık harfleri */}
      <div className={kompakt ? 'space-y-2' : 'space-y-3'}>
        {SECENEKLER.map((sik) => {
          const secenekMetni = (soru.secenekler as Record<string, string>)[sik];
          if (!secenekMetni) return null;

          const isaretli = secilen === sik;

          const secIcerik = (
            <div className="flex items-start gap-2.5 w-full">
              <span
                className={`w-[20px] h-[20px] rounded-full border-[1.6px] flex items-center justify-center text-[10px] font-extrabold shrink-0 transition-all leading-none
                ${saltOkunur
                  ? 'border-gray-800 text-gray-900 bg-white'
                  : isaretli
                    ? 'border-indigo-600 bg-indigo-600 text-white scale-110'
                    : 'border-gray-900 text-gray-900 group-hover:border-indigo-600 group-hover:scale-105'}`}
              >
                {sik}
              </span>
              <SoruHtmlMath
                html={duzMetinHtmlSar(secenekMetni)}
                className={`flex-1 font-medium ${secenekTipografi} ${
                  saltOkunur ? 'text-gray-900' : isaretli ? 'text-indigo-900 font-bold' : 'text-gray-900 group-hover:text-gray-950'
                }`}
              />
            </div>
          );

          if (saltOkunur) {
            return (
              <div key={sik} className="osym-secenek osym-secenek--onizleme flex items-start gap-2 py-0.5">
                {secIcerik}
              </div>
            );
          }

          return (
            <button
              key={sik}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTikla?.();
                secenekTikla(sik);
              }}
              className={`osym-secenek w-full text-left group p-2 rounded-xl border border-transparent transition-all ${isaretli ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'hover:bg-gray-50'}`}
            >
              {secIcerik}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
