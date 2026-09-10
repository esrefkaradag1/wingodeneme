'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  School,
  Trash2,
  TrendingUp,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { kocApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { apiMesaj } from '@/components/koc/GeciciSifreKarti';

type Sinif = {
  id: string;
  ad: string;
  seviye: string | null;
  aciklama: string | null;
  aktif: boolean;
  ogrenciSayisi: number;
  ogretmenSayisi: number;
  ogretmenler: Array<{ id: string; ad: string; soyad: string }>;
  denemeSayisi: number;
  ortalamaNet: number;
};

type SinifDetay = {
  sinif: { id: string; ad: string; seviye: string | null; aciklama: string | null; aktif: boolean };
  ogrenciler: Array<{
    id: string;
    ad: string;
    soyad: string;
    email: string;
    sinif: string | null;
    ogretimTuru: string;
    katilimSayisi: number;
  }>;
  ogretmenler: Array<{ id: string; ad: string; soyad: string; email: string; hesapAktif: boolean }>;
};

type Ogretmen = { id: string; ad: string; soyad: string };

export default function KurumSiniflarSayfasi() {
  const qc = useQueryClient();
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Sinif | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['kurum-siniflar'],
    queryFn: async () => (await kocApi.kurumSiniflar()).data.veri as Sinif[],
  });
  const { data: ogretmenler } = useQuery({
    queryKey: ['kurum-ogretmenler'],
    queryFn: async () => (await kocApi.kurumOgretmenler()).data.veri as Ogretmen[],
  });
  const { data: detay, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['kurum-sinif-detay', seciliId],
    queryFn: async () => (await kocApi.kurumSinifDetay(seciliId!)).data.veri as SinifDetay,
    enabled: !!seciliId,
  });

  const tazele = () => {
    qc.invalidateQueries({ queryKey: ['kurum-siniflar'] });
    qc.invalidateQueries({ queryKey: ['kurum-sinif-detay'] });
    qc.invalidateQueries({ queryKey: ['kurum-ogretmenler'] });
  };

  const silMut = useMutation({
    mutationFn: (id: string) => kocApi.kurumSinifSil(id),
    onSuccess: (res) => {
      const kalan = res.data.veri?.sinifsizKalanOgrenci ?? 0;
      toast.basarili(`Sınıf silindi${kalan ? ` · ${kalan} öğrenci sınıfsız kaldı` : ''}`);
      setSeciliId(null);
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Sınıf silinemedi')),
  });

  const ogretmenAtaMut = useMutation({
    mutationFn: ({ sinifId, ogretmenId }: { sinifId: string; ogretmenId: string }) =>
      kocApi.kurumSinifOgretmenAta(sinifId, ogretmenId),
    onSuccess: () => {
      toast.basarili('Öğretmen sınıfa atandı');
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Atanamadı')),
  });

  const ogretmenKaldirMut = useMutation({
    mutationFn: ({ sinifId, ogretmenId }: { sinifId: string; ogretmenId: string }) =>
      kocApi.kurumSinifOgretmenKaldir(sinifId, ogretmenId),
    onSuccess: () => {
      toast.basarili('Öğretmen sınıftan çıkarıldı');
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Kaldırılamadı')),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sınıflar yükleniyor…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800">
        {apiMesaj(error, 'Sınıflar getirilemedi')}
      </div>
    );
  }

  const siniflar = data || [];
  const atanabilirOgretmenler = (ogretmenler || []).filter(
    (o) => !detay?.ogretmenler.some((d) => d.id === o.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Kurum yönetimi</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Sınıflar</h1>
          <p className="mt-1 text-sm text-slate-600">
            Şubelerinizi oluşturun; öğretmen ve öğrencileri sınıflara atayın. Öğretmenler yalnızca kendi sınıflarını görür.
          </p>
        </div>
        <button
          onClick={() => {
            setDuzenlenen(null);
            setFormAcik(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Sınıf oluştur
        </button>
      </div>

      {siniflar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <School className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            Henüz sınıf yok. Örneğin &quot;12-Fen A&quot; veya &quot;TYT Hafta Sonu&quot; şeklinde bir sınıf açın.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {siniflar.map((s) => (
              <div
                key={s.id}
                onClick={() => setSeciliId(s.id)}
                className={`cursor-pointer rounded-2xl border bg-white p-4 transition ${
                  seciliId === s.id ? 'border-teal-400 ring-1 ring-teal-200' : 'border-slate-200 hover:border-teal-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">
                      {s.ad}
                      {s.seviye && <span className="ml-2 text-xs font-medium text-slate-500">{s.seviye}</span>}
                      {!s.aktif && (
                        <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                          Pasif
                        </span>
                      )}
                    </p>
                    {s.aciklama && <p className="mt-0.5 text-xs text-slate-500">{s.aciklama}</p>}
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" /> {s.ogrenciSayisi} öğrenci
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 text-slate-400" /> {s.ogretmenSayisi} öğretmen
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-slate-400" /> ort. net {s.ortalamaNet || '—'}
                        {s.denemeSayisi ? ` (${s.denemeSayisi} deneme)` : ''}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDuzenlenen(s);
                        setFormAcik(true);
                      }}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                      title="Düzenle"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`"${s.ad}" sınıfı silinsin mi? Öğrenciler kurumda kalır, sınıfsız olur.`)) {
                          silMut.mutate(s.id);
                        }
                      }}
                      className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700"
                      title="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {!seciliId ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Detay için bir sınıf seçin.
              </p>
            ) : detayYukleniyor || !detay ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-base font-bold text-slate-900">{detay.sinif.ad}</p>
                  {detay.sinif.seviye && <p className="text-xs text-slate-500">{detay.sinif.seviye}</p>}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Öğretmenler ({detay.ogretmenler.length})
                  </p>
                  <ul className="space-y-1.5">
                    {detay.ogretmenler.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {o.ad} {o.soyad}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{o.email}</p>
                        </div>
                        <button
                          onClick={() => ogretmenKaldirMut.mutate({ sinifId: detay.sinif.id, ogretmenId: o.id })}
                          className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                          title="Sınıftan çıkar"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                    {detay.ogretmenler.length === 0 && (
                      <li className="text-xs text-slate-500">Bu sınıfa öğretmen atanmamış.</li>
                    )}
                  </ul>

                  {atanabilirOgretmenler.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          ogretmenAtaMut.mutate({ sinifId: detay.sinif.id, ogretmenId: e.target.value });
                        }
                      }}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <option value="">+ Öğretmen ata…</option>
                      {atanabilirOgretmenler.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.ad} {o.soyad}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Öğrenciler ({detay.ogrenciler.length})
                  </p>
                  {detay.ogrenciler.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Bu sınıfta öğrenci yok. Öğrenciler sayfasından atayabilirsiniz.
                    </p>
                  ) : (
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                      {detay.ogrenciler.map((o) => (
                        <li key={o.id} className="rounded-xl border border-slate-100 px-3 py-2">
                          <Link href={`/kurum/ogrenci/${o.id}`} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {o.ad} {o.soyad}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {o.ogretimTuru}
                                {o.sinif ? ` · ${o.sinif}` : ''} · {o.katilimSayisi} katılım
                              </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {formAcik && (
        <SinifFormModal
          mevcut={duzenlenen}
          kapat={() => {
            setFormAcik(false);
            setDuzenlenen(null);
          }}
          tamamlandi={() => {
            setFormAcik(false);
            setDuzenlenen(null);
            tazele();
          }}
        />
      )}
    </div>
  );
}

function SinifFormModal({
  mevcut,
  kapat,
  tamamlandi,
}: {
  mevcut: Sinif | null;
  kapat: () => void;
  tamamlandi: () => void;
}) {
  const [form, setForm] = useState({
    ad: mevcut?.ad || '',
    seviye: mevcut?.seviye || '',
    aciklama: mevcut?.aciklama || '',
    aktif: mevcut?.aktif ?? true,
  });

  const kaydetMut = useMutation({
    mutationFn: () =>
      mevcut
        ? kocApi.kurumSinifGuncelle(mevcut.id, {
            ad: form.ad.trim(),
            seviye: form.seviye.trim(),
            aciklama: form.aciklama.trim(),
            aktif: form.aktif,
          })
        : kocApi.kurumSinifOlustur({
            ad: form.ad.trim(),
            seviye: form.seviye.trim() || undefined,
            aciklama: form.aciklama.trim() || undefined,
          }),
    onSuccess: () => {
      toast.basarili(mevcut ? 'Sınıf güncellendi' : 'Sınıf oluşturuldu');
      tamamlandi();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Kaydedilemedi')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">{mevcut ? 'Sınıfı düzenle' : 'Sınıf oluştur'}</h2>
          <button onClick={kapat} className="rounded-lg p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <input
            value={form.ad}
            onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
            placeholder="Sınıf adı * (örn. 12-Fen A)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
          />
          <input
            value={form.seviye}
            onChange={(e) => setForm((f) => ({ ...f, seviye: e.target.value }))}
            placeholder="Kademe / seviye (örn. YKS 12. sınıf)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
          />
          <textarea
            value={form.aciklama}
            onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
            placeholder="Açıklama (opsiyonel)"
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
          />
          {mevcut && (
            <label className="flex items-center gap-2 px-1 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm((f) => ({ ...f, aktif: e.target.checked }))}
              />
              Sınıf aktif
            </label>
          )}
        </div>

        <button
          onClick={() => kaydetMut.mutate()}
          disabled={kaydetMut.isPending || !form.ad.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {kaydetMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mevcut ? 'Kaydet' : 'Oluştur'}
        </button>
      </div>
    </div>
  );
}
