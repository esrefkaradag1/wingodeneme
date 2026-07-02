'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Loader2, X } from 'lucide-react';

interface AtananOgrencilerModalProps {
  sinav: { id: string; baslik: string };
  onClose: () => void;
}

interface SinavAtamaSatiri {
  id: string;
  kaynak: 'MANUEL' | 'PAKET';
  ogrenci: {
    id: string;
    ad: string;
    soyad: string;
    kullanici: { email: string | null };
  };
}

export default function AtananOgrencilerModal({ sinav, onClose }: AtananOgrencilerModalProps) {
  const { data: atananRes, isLoading } = useQuery({
    queryKey: ['admin-sinav-atananlar', sinav.id],
    queryFn: () => adminApi.sinavAtananOgrenciler(sinav.id),
  });

  const atananlar = (atananRes?.data?.veri || []) as SinavAtamaSatiri[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900">Atanan Öğrenciler</h3>
            <p className="text-xs text-gray-500 mt-0.5">{sinav.baslik}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Toplam {atananlar.length} öğrenci
          </p>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : atananlar.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Bu sınava henüz öğrenci atanmamış.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {atananlar.map((atama) => (
                <li key={atama.id} className="px-4 py-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {atama.ogrenci.ad} {atama.ogrenci.soyad}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {atama.ogrenci.kullanici.email ?? '—'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                        atama.kaynak === 'PAKET' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {atama.kaynak === 'PAKET' ? 'Paket' : 'Manuel'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
