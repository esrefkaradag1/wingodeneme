'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BadgePercent, Check, Loader2, X } from 'lucide-react';
import { paketApi } from '@/lib/api';
import { toast } from '@/store/toast.store';

export type UygulananKod = {
  kod: string;
  indirimTutari: number;
  netTutar: number;
  aciklama: string | null;
};

/**
 * Ödeme öncesi indirim kodu girişi. Kod doğrulanınca üst bileşene bildirilir;
 * satın alma isteğinde `indirimKodu` alanı gönderilmelidir.
 */
export function IndirimKoduKutusu({
  tutar,
  uygulanan,
  onDegisim,
  koyuTema = false,
}: {
  tutar: number;
  uygulanan: UygulananKod | null;
  onDegisim: (kod: UygulananKod | null) => void;
  koyuTema?: boolean;
}) {
  const [kod, setKod] = useState('');

  const dogrulaMut = useMutation({
    mutationFn: () => paketApi.indirimKoduDogrula(kod.trim(), tutar),
    onSuccess: (res) => {
      const v = res.data.veri;
      onDegisim({ kod: v.kod, indirimTutari: v.indirimTutari, netTutar: v.netTutar, aciklama: v.aciklama });
      setKod('');
      toast.basarili('İndirim kodu uygulandı', `${v.indirimTutari.toFixed(2)} TL indirim`);
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'Kod uygulanamadı';
      toast.hata(mesaj);
    },
  });

  if (uygulanan) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
          koyuTema
            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span className="truncate font-semibold">{uygulanan.kod}</span>
          <span className="shrink-0 font-bold">-{uygulanan.indirimTutari.toFixed(2)} TL</span>
        </span>
        <button
          type="button"
          onClick={() => onDegisim(null)}
          className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100"
          title="Kodu kaldır"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <BadgePercent
          className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${koyuTema ? 'text-slate-500' : 'text-slate-400'}`}
        />
        <input
          value={kod}
          onChange={(e) => setKod(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && kod.trim()) {
              e.preventDefault();
              dogrulaMut.mutate();
            }
          }}
          placeholder="İndirim kodu"
          className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm font-semibold uppercase outline-none ${
            koyuTema
              ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-teal-400/50'
              : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-teal-400'
          }`}
        />
      </div>
      <button
        type="button"
        onClick={() => dogrulaMut.mutate()}
        disabled={dogrulaMut.isPending || !kod.trim()}
        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
          koyuTema ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {dogrulaMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Uygula
      </button>
    </div>
  );
}
