'use client';

import { kitapcikOgmTema } from '@/lib/kitapcik-tema';

type OgmKitapcikBasligiProps = {
  tur: string;
  yil: number;
  bolum: string;
  solKod: string;
  sagEtiket: string;
  variant?: 'kapak' | 'ic-sayfa';
  talimat1?: string;
  tarihAlt?: string | null;
  ustKodSatir?: string | null;
  satir?: string | null;
};

export function OgmKitapcikBasligi({
  tur,
  yil,
  bolum,
  solKod,
  sagEtiket,
  variant = 'kapak',
  talimat1 = '',
  tarihAlt,
  ustKodSatir,
  satir,
}: OgmKitapcikBasligiProps) {
  const tema = kitapcikOgmTema(tur);
  const accent = tema.accent;
  const icSayfa = variant === 'ic-sayfa';

  const kutu = (
    <div
      className={`overflow-hidden bg-white shadow-sm ${icSayfa ? 'rounded-[10px]' : 'rounded-[14px]'}`}
      style={{ border: `1px solid ${accent}` }}
    >
      <div
        className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_1fr] items-stretch"
        style={icSayfa ? undefined : { borderBottom: `1px solid ${accent}` }}
      >
        <div
          className={`px-3 bg-white flex flex-col justify-center gap-1 ${icSayfa ? 'py-2' : 'py-2.5'} border-b sm:border-b-0 sm:border-r`}
          style={{ borderColor: accent }}
        >
          <span className="text-[10px] sm:text-[11px] font-bold font-mono text-gray-900 leading-tight">{solKod}</span>
          <span className="text-[9px] text-gray-500 font-semibold">{tema.altEtiket(yil)}</span>
        </div>
        <div
          className={`px-3 text-center text-white font-extrabold tracking-wide flex items-center justify-center uppercase leading-snug ${
            icSayfa ? 'py-2 text-[11px]' : 'py-2.5 text-[11px] sm:text-[12px]'
          }`}
          style={{ backgroundColor: accent }}
        >
          {bolum}
        </div>
        <div
          className={`px-3 text-right bg-white text-gray-900 font-bold flex items-center justify-end border-t sm:border-t-0 sm:border-l ${
            icSayfa ? 'py-2 text-[11px]' : 'py-2.5 text-[11px]'
          }`}
          style={{ borderColor: accent }}
        >
          {sagEtiket}
        </div>
      </div>

      {!icSayfa && talimat1 ? (
        <div
          className="px-3 py-2.5 sm:py-3 text-[11px] leading-relaxed text-gray-900 space-y-2 bg-white font-serif"
          style={{ borderTop: `1px solid ${accent}33` }}
        >
          <p>
            <span className="font-sans font-bold">1.</span> {talimat1}
          </p>
          <p>
            <span className="font-sans font-bold">2.</span> Cevaplarınızı, cevap kâğıdının{' '}
            <strong className="font-bold uppercase">{bolum}</strong> için ayrılan kısmına işaretleyiniz.
          </p>
        </div>
      ) : null}
    </div>
  );

  if (icSayfa) {
    return <div className="deneme-ic-sayfa-ogm mb-4">{kutu}</div>;
  }

  return (
    <div className="ogm-kapak mb-0 text-gray-900 select-none">
      <p className="text-[9px] text-center text-gray-400 font-semibold tracking-widest mb-2 uppercase">
        Wingo Deneme — Öğrenci kitapçığı önizlemesi
      </p>
      <div className="text-center leading-none mb-1.5 select-none">
        <div className="text-[22px] font-black tracking-[0.08em]" style={{ color: accent }}>
          WINGO
        </div>
        <div className="text-[9px] font-black tracking-[0.14em] text-gray-900 -mt-0.5">DENEME</div>
      </div>
      {kutu}
      {tarihAlt ? (
        <p className="mt-2 text-[9px] text-gray-500 text-center font-medium">
          {tarihAlt}
          {ustKodSatir ? (
            <>
              {' '}
              · <span className="font-mono">{ustKodSatir}</span>
            </>
          ) : null}
          {satir ? <> · {satir}</> : null}
        </p>
      ) : null}
    </div>
  );
}
