'use client';

import { useState } from 'react';
import { Building2, Copy, Check, Landmark } from 'lucide-react';
import { HAVALE_HESAP, havaleAciklamaKodu } from '@/lib/havaleHesap';

type Props = {
  tutar?: number;
  referansNo?: string | null;
  siparisId?: string;
  className?: string;
  kompakt?: boolean;
};

async function kopyala(metin: string) {
  try {
    await navigator.clipboard.writeText(metin);
    return true;
  } catch {
    return false;
  }
}

function Satir({
  etiket,
  deger,
  kopyalanabilir,
}: {
  etiket: string;
  deger: string;
  kopyalanabilir?: boolean;
}) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-emerald-100/80 last:border-0">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">{etiket}</p>
        <p className="text-sm font-semibold text-gray-900 break-all mt-0.5">{deger}</p>
      </div>
      {kopyalanabilir ? (
        <button
          type="button"
          onClick={async () => {
            const basarili = await kopyala(deger.replace(/\s+/g, ''));
            if (basarili) {
              setOk(true);
              setTimeout(() => setOk(false), 1500);
            }
          }}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100"
        >
          {ok ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {ok ? 'Kopyalandı' : 'Kopyala'}
        </button>
      ) : null}
    </div>
  );
}

export function HavaleOdemeKarti({ tutar, referansNo, siparisId, className = '', kompakt }: Props) {
  const aciklama = havaleAciklamaKodu(referansNo, siparisId);

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
          <Landmark className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-black text-gray-900">Havale / EFT Bilgileri</p>
          <p className="text-[11px] text-emerald-800/80 font-medium">Albaraka Türk · Edunova Tech</p>
        </div>
      </div>

      {!kompakt ? (
        <div className="flex items-start gap-2 rounded-xl bg-white/80 border border-emerald-100 px-3 py-2 mb-3 text-[11px] text-gray-600">
          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{HAVALE_HESAP.unvan}</span>
        </div>
      ) : null}

      <div className="space-y-0">
        <Satir etiket="Banka" deger={HAVALE_HESAP.banka} />
        <Satir etiket="IBAN" deger={HAVALE_HESAP.ibanGorunum} kopyalanabilir />
        <Satir etiket="Hesap No" deger={HAVALE_HESAP.hesapNo} kopyalanabilir />
        {typeof tutar === 'number' ? (
          <Satir etiket="Ödenecek Tutar" deger={`${tutar.toLocaleString('tr-TR')} ₺`} />
        ) : null}
        <Satir etiket="Açıklama (zorunlu)" deger={aciklama} kopyalanabilir />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-emerald-900/80 font-medium">
        Havale/EFT yaptıktan sonra <strong>Siparişlerim</strong> üzerinden «Ödeme bildirimi gönder»
        ile bildirin. Onaylanınca deneme erişiminiz açılır.
      </p>
    </div>
  );
}
