'use client';

import { useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import { cozumleKitapcikBolumleri } from '@/lib/kitapcikBolumleri';

interface Soru {
  id: string;
  siraNo: number;
  konu?: { ders?: string };
  konuId?: string;
}

interface SinavMeta {
  tur: string;
  konuDagilimi?: unknown;
  kitapcikBolumAdi?: string | null;
}

interface CevapKartiSoru {
  id: string;
  siraNo: number;
  globalIndex: number;
}

interface CevapKartiBolumu {
  bolumAdi: string;
  sorular: CevapKartiSoru[];
}

interface Props {
  sorular: Soru[];
  cevaplar: Record<string, string | null>;
  aktifIndex: number;
  onSoruSec: (index: number) => void;
  cevaplanmisSayisi: number;
  sinav?: SinavMeta | null;
}

function cevapKartiBolumleriniOlustur(sorular: Soru[], sinav?: SinavMeta | null): CevapKartiBolumu[] {
  const sirali = [...sorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0));
  const globalIndexById = new Map(sirali.map((soru, idx) => [soru.id, idx]));

  if (!sinav?.tur) {
    return [
      {
        bolumAdi: 'CEVAP KARTI',
        sorular: sirali.map((soru, idx) => ({
          id: soru.id,
          siraNo: idx + 1,
          globalIndex: idx,
        })),
      },
    ];
  }

  const kitapcikBolumleri = cozumleKitapcikBolumleri(
    sinav.tur,
    sirali,
    sinav.konuDagilimi,
    sinav.kitapcikBolumAdi,
  );

  return kitapcikBolumleri.map((bolum) => ({
    bolumAdi: bolum.bolumAdi,
    sorular: bolum.sorular.map((soru) => ({
      id: soru.id!,
      siraNo: soru.siraNo ?? 1,
      globalIndex: globalIndexById.get(soru.id!) ?? 0,
    })),
  }));
}

export function CevapAnahtari({
  sorular,
  cevaplar,
  aktifIndex,
  onSoruSec,
  cevaplanmisSayisi,
  sinav,
}: Props) {
  const bolumler = useMemo(() => cevapKartiBolumleriniOlustur(sorular, sinav), [sorular, sinav]);
  const yuzde = sorular.length ? Math.round((cevaplanmisSayisi / sorular.length) * 100) : 0;
  const bolumlu = bolumler.length > 1 || (bolumler[0]?.bolumAdi !== 'CEVAP KARTI');

  return (
    <aside
      className={`${bolumlu ? 'w-[15rem] sm:w-64' : 'w-[13.5rem] sm:w-56'} flex flex-col shrink-0 rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/5 overflow-hidden`}
    >
      <div className="p-3 sm:p-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center gap-2 text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <ListChecks className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight">Cevap kartı</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {cevaplanmisSayisi}/{sorular.length} cevap · %{yuzde}
            </p>
          </div>
        </div>
        <div className="w-full bg-slate-200/80 rounded-full h-2 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${sorular.length ? (cevaplanmisSayisi / sorular.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 min-h-0 space-y-4">
        {bolumler.map((bolum) => (
          <div key={bolum.bolumAdi}>
            {bolumlu && (
              <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-700 mb-2 leading-snug border-b border-indigo-100 pb-1.5">
                {bolum.bolumAdi}
              </p>
            )}
            <div className="grid grid-cols-5 gap-1.5">
              {bolum.sorular.map((soru) => {
                const secilen = cevaplar[soru.id];
                const cevaplanmis = !!secilen;
                const aktif = soru.globalIndex === aktifIndex;

                return (
                  <button
                    key={soru.id}
                    type="button"
                    onClick={() => onSoruSec(soru.globalIndex)}
                    className={`relative aspect-square rounded-lg text-[11px] font-semibold transition-all tabular-nums
                      ${aktif ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white z-[1] shadow-sm' : ''}
                      ${
                        cevaplanmis
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-800 border border-slate-200/80'
                      }`}
                    title={`Soru ${soru.siraNo}${secilen ? `: ${secilen}` : ' (boş)'}`}
                  >
                    {soru.siraNo}
                    {cevaplanmis && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-white rounded-full border border-indigo-300 flex items-center justify-center text-indigo-700 text-[8px] font-bold leading-none">
                        {secilen}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/80 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Gösterge</p>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="w-3.5 h-3.5 rounded bg-indigo-600 shrink-0 shadow-sm" />
          Cevaplandı
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 shrink-0" />
          Boş
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="w-3.5 h-3.5 rounded ring-2 ring-indigo-500 ring-offset-1 bg-white shrink-0" />
          Seçili
        </div>
      </div>
    </aside>
  );
}
