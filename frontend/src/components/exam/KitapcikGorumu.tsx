'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, GraduationCap } from 'lucide-react';
import { SoruKarti } from './SoruKarti';
import { OsymSinavBasligi } from './OsymSinavBasligi';
import { KitapcikKapakSayfasi } from './KitapcikKapakSayfasi';
import { motion, AnimatePresence } from 'framer-motion';
import { cozumleKitapcikBolumleri } from '@/lib/kitapcikBolumleri';
import { KITAPCIK_SAYFA_BASI_SORU, kitapcikIkiSutunMu } from '@/lib/kitapcik-tema';

interface Soru {
  id: string;
  siraNo: number;
  metinHtml: string;
  gorselUrl?: string;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string };
  konuId?: string;
}

export interface SinavKitapcikMeta {
  baslik: string;
  tur: string;
  baslangicZamani: string;
  kitapcikBolumAdi?: string | null;
  kitapcikTarihMetni?: string | null;
  kitapcikUrl?: string | null;
  konuDagilimi?: unknown;
}

interface Props {
  sorular: Soru[];
  cevaplar: Record<string, string | null>;
  onCevapSec: (soruId: string, secilen: string | null) => void;
  aktifSoruIndex: number;
  onSoruDegistir: (index: number) => void;
  sinav?: SinavKitapcikMeta | null;
}

export function KitapcikGorumu({
  sorular,
  cevaplar,
  onCevapSec,
  aktifSoruIndex,
  onSoruDegistir,
  sinav,
}: Props) {
  function sayfaParcala<T>(dizi: T[], sayfaBoyu: number): T[][] {
    const cikis: T[][] = [];
    for (let i = 0; i < dizi.length; i += sayfaBoyu) {
      cikis.push(dizi.slice(i, i + sayfaBoyu));
    }
    return cikis;
  }

  const sorularSirali = useMemo(
    () => [...(sorular || [])].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0)),
    [sorular]
  );
  const [suankiSayfa, setSuankiSayfa] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward
  const onceSyncEdilenSoruIndex = useRef<number>(aktifSoruIndex);
  const ikiSutun = sinav ? kitapcikIkiSutunMu(sinav.tur) : true;
  const sayfaBoyu = ikiSutun ? KITAPCIK_SAYFA_BASI_SORU : 6;

  const bolumler = useMemo(() => {
    if (!sinav) {
      return [
        {
          bolumAdi: 'GENEL TEST',
          sorular: sorularSirali,
          dagilimBloklari: undefined,
          aciklama: undefined,
        },
      ];
    }
    return cozumleKitapcikBolumleri(sinav.tur, sorularSirali, sinav.konuDagilimi, sinav.kitapcikBolumAdi);
  }, [sinav, sorularSirali]);

  const sayfaPlan = useMemo(
    () =>
      bolumler.flatMap((b) => {
        const bolumSorularSirali = [...b.sorular].sort((x, y) => (x.siraNo ?? 0) - (y.siraNo ?? 0));
        const sayfalar = bolumSorularSirali.length === 0 ? [] : sayfaParcala(bolumSorularSirali, sayfaBoyu);
        return sayfalar.map((grup, idx) => ({
          bolumAdi: b.bolumAdi,
          isBolumIlkSayfa: idx === 0,
          sorular: grup,
          bolumToplam: bolumSorularSirali.length,
          dagilimBloklari: b.dagilimBloklari,
          aciklama: b.aciklama,
        }));
      }),
    [bolumler, sayfaBoyu]
  );

  const toplamSayfa = Math.max(1, sayfaPlan.length);
  const aktifSayfa = sayfaPlan[suankiSayfa];
  const sayfaSorulari = aktifSayfa?.sorular ?? [];
  const soruIndexById = useMemo(() => {
    const map = new Map<string, number>();
    sorularSirali.forEach((soru, idx) => map.set(soru.id, idx));
    return map;
  }, [sorularSirali]);

  const sayfaIndexBySoruId = useMemo(() => {
    const map = new Map<string, number>();
    sayfaPlan.forEach((sayfa, pageIdx) => {
      sayfa.sorular.forEach((soru) => map.set(soru.id, pageIdx));
    });
    return map;
  }, [sayfaPlan]);

  useEffect(() => {
    if (suankiSayfa > toplamSayfa - 1) {
      setSuankiSayfa(Math.max(0, toplamSayfa - 1));
    }
  }, [suankiSayfa, toplamSayfa]);

  useEffect(() => {
    if (onceSyncEdilenSoruIndex.current === aktifSoruIndex) return;
    onceSyncEdilenSoruIndex.current = aktifSoruIndex;
    const aktifSoru = sorularSirali[aktifSoruIndex];
    if (!aktifSoru) return;
    const hedefSayfa = sayfaIndexBySoruId.get(aktifSoru.id);
    if (hedefSayfa == null) return;
    setSuankiSayfa((prev) => {
      if (prev === hedefSayfa) return prev;
      setDirection(hedefSayfa > prev ? 1 : -1);
      return hedefSayfa;
    });
  }, [aktifSoruIndex, sayfaIndexBySoruId, sorularSirali]);

  const oncekiSayfa = () => {
    if (suankiSayfa > 0) {
      setDirection(-1);
      const yeniSayfa = suankiSayfa - 1;
      setSuankiSayfa(yeniSayfa);
      const ilkSoru = sayfaPlan[yeniSayfa]?.sorular?.[0];
      if (ilkSoru) {
        const idx = soruIndexById.get(ilkSoru.id);
        if (idx != null) onSoruDegistir(idx);
      }
    }
  };

  const sonrakiSayfa = () => {
    if (suankiSayfa < toplamSayfa - 1) {
      setDirection(1);
      const yeniSayfa = suankiSayfa + 1;
      setSuankiSayfa(yeniSayfa);
      const ilkSoru = sayfaPlan[yeniSayfa]?.sorular?.[0];
      if (ilkSoru) {
        const idx = soruIndexById.get(ilkSoru.id);
        if (idx != null) onSoruDegistir(idx);
      }
    }
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 500 : -500,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 500 : -500,
      opacity: 0,
    }),
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#F1F5F9] relative overflow-hidden">
      {/* Decorative Booklet Binder / Crease */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-black/5 z-10 hidden md:block" />
      <div className="absolute left-1/2 top-0 bottom-0 w-[40px] -translate-x-1/2 bg-gradient-to-r from-transparent via-black/[0.03] to-transparent z-10 hidden md:block pointer-events-none" />

      {/* Top Navigation */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur shadow-sm border-b border-gray-200 z-20">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BookOpen className="w-4 h-4" />
           </div>
           <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Sınav Kitapçığı</p>
              <h2 className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{sinav?.baslik}</h2>
           </div>
        </div>
        
        <div className="flex items-center gap-4">

           <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
              <span className="text-[10px] font-black text-gray-400 uppercase">İlerleme</span>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                 <div 
                  className="h-full bg-indigo-600 transition-all duration-500" 
                  style={{ width: `${((suankiSayfa + 1) / toplamSayfa) * 100}%` }}
                 />
              </div>
              <span className="text-[10px] font-bold text-gray-600">%{Math.round(((suankiSayfa + 1) / toplamSayfa) * 100)}</span>
           </div>
           <span className="text-[11px] font-black text-gray-900 tabular-nums bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
             SAYFA {suankiSayfa + 1} / {toplamSayfa}
           </span>
        </div>
      </div>

      {/* Booklet Content Area (outer scroll) */}
      <div className="flex-1 relative overflow-y-auto min-h-0 flex flex-col items-center p-4 sm:p-8 pb-28 gap-6">
        {sinav?.kitapcikUrl?.trim() ? (
          <div className="w-full max-w-[210mm] shrink-0">
            <KitapcikKapakSayfasi url={sinav.kitapcikUrl} />
          </div>
        ) : null}
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={suankiSayfa}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-6xl h-full flex flex-col bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-200 rounded-sm relative"
            style={{ 
              backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
              backgroundSize: '20px 20px',
              backgroundPosition: '10px 10px'
            }}
          >
            {/* Paper Texture Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />

            <div className="flex-1 p-6 sm:p-10 flex flex-col">
              {sinav && aktifSayfa?.isBolumIlkSayfa && (
                <div className="shrink-0 mb-10 pb-10 border-b-2 border-dashed border-gray-200">
                  <OsymSinavBasligi
                    tur={sinav.tur}
                    baslangicZamani={sinav.baslangicZamani}
                    kitapcikBolumAdi={aktifSayfa.bolumAdi}
                    kitapcikTarihMetni={sinav.kitapcikTarihMetni}
                    soruSayisi={aktifSayfa.bolumToplam}
                    ilkKonuDers={null}
                    tamKapak
                    dagilimBloklari={aktifSayfa.dagilimBloklari}
                    talimat1Override={aktifSayfa.aciklama}
                    sinavBaslik={sinav.baslik}
                  />
                </div>
              )}

              {sinav && aktifSayfa && !aktifSayfa.isBolumIlkSayfa && (
                <div className="shrink-0 mb-8">
                  <OsymSinavBasligi
                    tur={sinav.tur}
                    baslangicZamani={sinav.baslangicZamani}
                    kitapcikBolumAdi={aktifSayfa.bolumAdi}
                    kitapcikTarihMetni={sinav.kitapcikTarihMetni}
                    soruSayisi={aktifSayfa.bolumToplam}
                    ilkKonuDers={null}
                    tamKapak={false}
                    sinavBaslik={sinav.baslik}
                  />
                </div>
              )}

              {(() => {
                const renderSoru = (soru: Soru) => {
                  const globalIndex = soruIndexById.get(soru.id) ?? 0;
                  const aktif = aktifSoruIndex === globalIndex;
                  return (
                    <div
                      key={soru.id}
                      className={`relative p-2 transition-all duration-300 rounded-xl ${
                        aktif ? 'bg-indigo-50/30 ring-1 ring-indigo-100 shadow-lg shadow-indigo-500/5' : ''
                      }`}
                    >
                      <SoruKarti
                        soru={soru}
                        secilen={cevaplar[soru.id] || null}
                        onSec={(secilen) => onCevapSec(soru.id, secilen)}
                        aktif={aktif}
                        onTikla={() => onSoruDegistir(globalIndex)}
                        kompakt={false}
                      />
                    </div>
                  );
                };

                return (
                  <>
                    {/* Mobile: tek kolon, doğal sıralama */}
                    <div className="grid grid-cols-1 gap-y-10 md:hidden">
                      {sayfaSorulari.map((s) => renderSoru(s))}
                    </div>

                    {/* Desktop: admindekiyle aynı iki-sütun akış (CSS column flow). */}
                    <div className="hidden md:block deneme-iki-sutun">
                      {sayfaSorulari.map((s) => renderSoru(s))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Page Footer */}
            <div className="px-10 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-400 tracking-widest uppercase">
               <span>WingoSınav Akıllı Kitapçık Altyapısı</span>
               <div className="flex items-center gap-4">
                  <span className="italic text-gray-500">{suankiSayfa < toplamSayfa - 1 ? 'Diğer sayfaya geçiniz' : ''}</span>
                  <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-900 shadow-sm">
                    {suankiSayfa + 1}
                  </span>
               </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls (always visible) */}
      <div className="sticky bottom-0 left-0 right-0 shrink-0 py-4 sm:py-5 flex items-center justify-center bg-gradient-to-t from-[#F1F5F9] via-[#F1F5F9]/95 to-transparent">
        <div className="z-30 flex items-center gap-3">
         <button
            onClick={oncekiSayfa}
            disabled={suankiSayfa === 0}
            className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-2xl flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30 active:scale-95 group"
         >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
         </button>
         
         <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl p-1.5 shadow-2xl flex gap-1 max-w-[300px] overflow-x-auto no-scrollbar">
            {Array.from({ length: toplamSayfa }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > suankiSayfa ? 1 : -1);
                  setSuankiSayfa(i);
                }}
                className={`min-w-[40px] h-10 rounded-xl text-xs font-black transition-all ${suankiSayfa === i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                {i + 1}
              </button>
            ))}
         </div>

         <button
            onClick={sonrakiSayfa}
            disabled={suankiSayfa >= toplamSayfa - 1}
            className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-2xl flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30 active:scale-95 group"
         >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
         </button>
        </div>
      </div>
    </div>
  );
}
