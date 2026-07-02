'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, Loader2, X, Trash2 } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { confirmAsk } from '@/store/confirm-dialog.store';

interface OgrenciAtamaModalProps {
  sinav: { id: string; baslik: string };
  onClose: () => void;
}

interface OgrenciSecimKullanici {
  id: string;
  email: string;
  ogrenciProfil: { id: string; ad: string; soyad: string } | null;
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

export default function OgrenciAtamaModal({ sinav, onClose }: OgrenciAtamaModalProps) {
  const queryClient = useQueryClient();
  const [ogrenciListeArama, setOgrenciListeArama] = useState('');
  const [atamaOgrenciProfilId, setAtamaOgrenciProfilId] = useState<string | null>(null);

  // Atanabilecek öğrencileri ara
  const { data: ogrencilerRes, isLoading: ogrencilerYukleniyor } = useQuery({
    queryKey: ['admin-ogrenci-ara', ogrenciListeArama],
    queryFn: () =>
      adminApi.kullanicilar({
        rol: 'OGRENCI',
        q: ogrenciListeArama.trim() || undefined,
        boyut: 50,
      }),
  });

  // Zaten atanmış olanları çek
  const { data: atananRes, isLoading: atananYukleniyor } = useQuery({
    queryKey: ['admin-sinav-atananlar', sinav.id],
    queryFn: () => adminApi.sinavAtananOgrenciler(sinav.id),
  });

  const ogrenciSecenekleri = (ogrencilerRes?.data?.veri || []) as OgrenciSecimKullanici[];
  const atananlar = (atananRes?.data?.veri || []) as SinavAtamaSatiri[];

  const ogrenciAtaMut = useMutation({
    mutationFn: () => {
      if (!atamaOgrenciProfilId) {
        return Promise.reject(new Error('Öğrenci seçin'));
      }
      return adminApi.sinavOgrenciAta(sinav.id, { ogrenciId: atamaOgrenciProfilId });
    },
    onSuccess: () => {
      toast.basarili('Öğrenci atandı.');
      setAtamaOgrenciProfilId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-sinav-atananlar', sinav.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
    },
    onError: (err: any) => {
      toast.hata(err?.response?.data?.mesaj || err?.message || 'Atama başarısız.');
    },
  });

  const ogrenciAtamaKaldirMut = useMutation({
    mutationFn: (ogrenciId: string) => adminApi.sinavOgrenciAtamaKaldir(sinav.id, ogrenciId),
    onSuccess: () => {
      toast.basarili('Atama kaldırıldı.');
      queryClient.invalidateQueries({ queryKey: ['admin-sinav-atananlar', sinav.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
    },
  });

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
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900">Öğrenciye Sınav Erişimi</h3>
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
          <p className="text-xs text-gray-500 mb-4">
            Listeden öğrenci seçin; ad veya e-posta ile arayabilirsiniz. Paket satın alındığında eklenen erişimler
            &quot;Paket&quot; olarak listelenir; bunlar buradan kaldırılamaz.
          </p>

          <form
            className="space-y-3 mb-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!atamaOgrenciProfilId) {
                toast.hata('Öğrenci seçin');
                return;
              }
              ogrenciAtaMut.mutate();
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={ogrenciListeArama}
                onChange={(e) => setOgrenciListeArama(e.target.value)}
                className="input-field w-full pl-9"
                placeholder="Ad, soyad veya e-posta ara…"
                autoComplete="off"
              />
            </div>
            <div className="relative">
              {ogrencilerYukleniyor ? (
                <div className="flex justify-center py-10 border border-gray-100 rounded-lg bg-gray-50/80">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                </div>
              ) : (
                <select
                  value={atamaOgrenciProfilId ?? ''}
                  onChange={(e) => setAtamaOgrenciProfilId(e.target.value || null)}
                  className="input-field w-full min-h-[11rem] py-2"
                  size={Math.min(8, Math.max(3, ogrenciSecenekleri.length + 1))}
                >
                  <option value="">Öğrenci seçin…</option>
                  {ogrenciSecenekleri
                    .filter((k) => k.ogrenciProfil)
                    .map((k) => {
                    const p = k.ogrenciProfil!;
                    return (
                      <option key={k.id} value={p.id}>
                        {p.ad} {p.soyad} — {k.email}
                      </option>
                    );
                  })}
                </select>
              )}
              {!ogrencilerYukleniyor && ogrenciListeArama.trim().length >= 2 && ogrenciSecenekleri.length === 0 ? (
                <p className="text-xs text-amber-700 mt-2">
                  Bu aramaya uyan öğrenci yok.
                </p>
              ) : null}
              {!ogrencilerYukleniyor && ogrenciListeArama.trim().length < 2 && ogrenciSecenekleri.length === 0 ? (
                <p className="text-xs text-gray-500 mt-2">
                  Henüz kayıtlı öğrenci yok.
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={ogrenciAtaMut.isPending || !atamaOgrenciProfilId}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {ogrenciAtaMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Atama Yap
            </button>
          </form>

          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Erişimi Olan Öğrenciler ({atananlar.length})
          </h4>
          
          {atananYukleniyor ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : atananlar.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Henüz atanmış öğrenci yok.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {atananlar.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {a.ogrenci.ad} {a.ogrenci.soyad}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{a.ogrenci.kullanici.email ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        a.kaynak === 'PAKET' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {a.kaynak === 'PAKET' ? 'Paket' : 'Manuel'}
                    </span>
                    {a.kaynak === 'MANUEL' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            await confirmAsk({
                              title: 'Atamayı kaldır',
                              message: 'Bu öğrencinin sınav erişimini kaldırmak istiyor musunuz?',
                              variant: 'destructive',
                            })
                          ) {
                            ogrenciAtamaKaldirMut.mutate(a.ogrenci.id);
                          }
                        }}
                        className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
