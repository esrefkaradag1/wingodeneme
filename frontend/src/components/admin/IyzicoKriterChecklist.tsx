'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { VARSAYILAN_SITE_ICERIK, type SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { iyzicoKriterDurumlari } from '@/lib/iyzico-kriter-durumu';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';

export function IyzicoKriterChecklist() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-site-icerik'],
    queryFn: async () => {
      const r = await api.get<{ basarili: boolean; veri: SiteGenelIcerik }>('/public/site-icerik');
      return r.data.veri;
    },
  });

  const icerik = data ?? (VARSAYILAN_SITE_ICERIK as SiteGenelIcerik);
  const durumlar = iyzicoKriterDurumlari(icerik);
  const tamamlanan = durumlar.filter((d) => d.tamam).length;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50 bg-amber-50/80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Gereken Web Sitesi Kriterleri</h3>
            <p className="text-xs text-gray-500 mt-1">
              iyzico başvurusu için sitede bulunması gereken sayfalar ve logolar.
            </p>
          </div>
          <span className="text-sm font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full shrink-0">
            {isLoading ? '…' : `${tamamlanan}/${durumlar.length}`}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-gray-50 p-2">
        {durumlar.map((d) => (
          <li key={d.id} className="flex items-start gap-3 px-4 py-3 rounded-xl">
            {d.tamam ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${d.tamam ? 'text-gray-700' : 'text-gray-900'}`}>
                {d.etiket}
              </p>
              {d.aciklama && (
                <p className="text-xs text-gray-500 mt-0.5">{d.aciklama}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Yasal metinleri ve logoları düzenlemek için Site Yönetimi kullanın.
        </p>
        <Link
          href="/panel/site-yonetimi"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          Yasal & iyzico düzenle
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
