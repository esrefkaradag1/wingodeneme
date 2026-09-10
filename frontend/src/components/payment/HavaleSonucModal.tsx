'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { HavaleOdemeKarti } from '@/components/payment/HavaleOdemeKarti';

type Props = {
  open: boolean;
  onClose: () => void;
  tutar?: number;
  referansNo?: string | null;
  siparisId?: string;
};

export function HavaleSonucModal({ open, onClose, tutar, referansNo, siparisId }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Havale siparişi oluşturuldu</h2>
            <p className="text-sm text-gray-500 mt-1">
              Aşağıdaki hesaba transfer yapıp Siparişlerim’den ödeme bildirimi gönderin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <HavaleOdemeKarti tutar={tutar} referansNo={referansNo} siparisId={siparisId} />

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Link
            href="/market/siparislerim"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center rounded-2xl py-3 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Siparişlerime git
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center rounded-2xl py-3 text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
