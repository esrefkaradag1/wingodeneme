'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { adminNavItems } from '@/components/layout/AdminLayout';
import { ShieldCheck, Save, Loader2, RotateCcw } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { useAuthStore } from '@/store/auth.store';

type IzinHaritasi = Record<string, string[]>;

const ROLLER: { id: string; ad: string; aciklama: string; renk: string }[] = [
  {
    id: 'TEACHER',
    ad: 'Öğretmen',
    aciklama:
      'Soru üretimi, inceleme ve (admin onayıyla) sınava soru atama. Sınav oluşturma/yayınlama admin’de kalır.',
    renk: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'OGRENCI',
    ad: 'Öğrenci',
    aciklama: 'Sadece kendi paneline erişir; admin paneline erişimi olmaz.',
    renk: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'VELI',
    ad: 'Veli',
    aciklama: 'Veli paneline erişir; admin paneline normalde erişmez.',
    renk: 'bg-emerald-50 border-emerald-200',
  },
];

const ADMIN_ROLLER = ['ADMIN', 'SUPER_ADMIN'];

export default function RolIzinleriSayfasi() {
  const qc = useQueryClient();
  const benimRol = useAuthStore((s) => s.kullanici?.rol);
  const yoneticiMi = benimRol === 'ADMIN' || benimRol === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rol-izinleri'],
    queryFn: () => api.get('/admin/rol-izinleri').then((r) => r.data?.veri as IzinHaritasi),
    enabled: yoneticiMi,
  });

  const [taslak, setTaslak] = useState<IzinHaritasi>({});

  useEffect(() => {
    if (data) {
      setTaslak({ ...data });
    }
  }, [data]);

  const tumMenuler = useMemo(() => adminNavItems.filter((m) => !m.adminOnly), []);

  const kaydetMut = useMutation({
    mutationFn: (veri: IzinHaritasi) => api.put('/admin/rol-izinleri', veri),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rol-izinleri'] });
      toast.basarili('Rol izinleri güncellendi.');
    },
    onError: () => toast.hata('Rol izinleri kaydedilemedi.'),
  });

  if (!yoneticiMi) {
    return (
      <div className="p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700">
          Bu sayfayı görüntülemek için yönetici olmanız gerekir.
        </div>
      </div>
    );
  }

  const toggle = (rol: string, href: string) => {
    setTaslak((prev) => {
      const onceki = prev[rol] || [];
      const yeni = onceki.includes(href)
        ? onceki.filter((x) => x !== href)
        : [...onceki, href];
      return { ...prev, [rol]: yeni };
    });
  };

  const tumunuSec = (rol: string) => {
    setTaslak((prev) => ({ ...prev, [rol]: tumMenuler.map((m) => m.href) }));
  };

  const tumunuKaldir = (rol: string) => {
    setTaslak((prev) => ({ ...prev, [rol]: [] }));
  };

  const sifirla = () => {
    if (data) setTaslak({ ...data });
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4 border border-indigo-500/30">
              <ShieldCheck className="w-4 h-4" /> Yetki Yönetimi
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Rol İzinleri</h1>
            <p className="text-slate-400 mt-2 text-sm font-medium opacity-90 max-w-xl leading-relaxed">
              Her rolün admin panelinde hangi menüleri görebileceğini buradan ayarlayabilirsiniz.
              ADMIN ve SUPER_ADMIN roller her zaman tüm menüleri görür.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={sifirla}
              disabled={!data || kaydetMut.isPending}
              className="px-4 py-3 rounded-2xl bg-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/20 disabled:opacity-40 flex items-center gap-2"
              title="Değişiklikleri geri al"
            >
              <RotateCcw className="w-4 h-4" />
              Sıfırla
            </button>
            <button
              onClick={() => kaydetMut.mutate(taslak)}
              disabled={kaydetMut.isPending}
              className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 shadow-xl"
            >
              {kaydetMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Kaydet
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin inline-block" />
        </div>
      ) : (
        <div className="space-y-6">
          {ROLLER.map((rol) => {
            const secili = taslak[rol.id] || [];
            return (
              <div key={rol.id} className={`rounded-3xl border ${rol.renk} bg-white p-6 shadow-sm`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {rol.ad} <span className="text-gray-400 font-normal text-sm">({rol.id})</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{rol.aciklama}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => tumunuSec(rol.id)}
                      className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
                    >
                      Hepsini seç
                    </button>
                    <button
                      type="button"
                      onClick={() => tumunuKaldir(rol.id)}
                      className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
                    >
                      Hepsini kaldır
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tumMenuler.map((m) => {
                    const aktif = secili.includes(m.href);
                    const Ikon = m.ikon;
                    return (
                      <label
                        key={m.href}
                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          aktif
                            ? 'border-indigo-500 bg-indigo-50/60'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={aktif}
                          onChange={() => toggle(rol.id, m.href)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Ikon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-800">{m.etiket}</span>
                        <span className="ml-auto text-[10px] font-mono text-gray-400">{m.href}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Yöneticiler{' '}
              <span className="text-gray-400 font-normal text-sm">
                ({ADMIN_ROLLER.join(', ')})
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Bu roller her zaman tüm menülere erişir. Ayrı izin atanmaz.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
