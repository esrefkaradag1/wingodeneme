'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, X } from 'lucide-react';
import { toast } from '@/store/toast.store';

/** Kurum bir hesap açtığında / şifre sıfırladığında giriş bilgilerini bir kez gösterir */
export function GeciciSifreKarti({
  baslik,
  email,
  sifre,
  kapat,
}: {
  baslik: string;
  email: string;
  sifre: string;
  kapat: () => void;
}) {
  const [kopyalandi, setKopyalandi] = useState(false);

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(`E-posta: ${email}\nŞifre: ${sifre}`);
      setKopyalandi(true);
      toast.basarili('Giriş bilgileri kopyalandı');
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      toast.hata('Kopyalanamadı');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <KeyRound className="h-4 w-4 text-teal-600" /> {baslik}
          </h3>
          <button onClick={kapat} className="rounded-lg p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Bu şifre yalnızca şimdi gösterilir. Kullanıcıya iletin; giriş yaptıktan sonra değiştirebilir.
        </p>

        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">E-posta</span>
            <span className="font-semibold text-slate-900 break-all">{email}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Geçici şifre</span>
            <span className="font-mono font-bold text-slate-900">{sifre}</span>
          </div>
        </div>

        <button
          onClick={kopyala}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {kopyalandi ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Giriş bilgilerini kopyala
        </button>
      </div>
    </div>
  );
}

export function apiMesaj(err: unknown, varsayilan = 'Bir hata oluştu'): string {
  const mesaj = (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj;
  return mesaj || varsayilan;
}
