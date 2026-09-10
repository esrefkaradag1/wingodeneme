'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  KeyRound,
  Link2,
  Loader2,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { kocApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { GeciciSifreKarti, apiMesaj } from '@/components/koc/GeciciSifreKarti';

type Ogrenci = {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  hesapAktif: boolean;
  sinif: string | null;
  okul: string | null;
  ogretimTuru: string;
  kurumSinifId: string | null;
  kurumSinifAdi: string | null;
  katilimSayisi: number;
};

type Sinif = { id: string; ad: string };

export default function KurumOgrencilerSayfasi() {
  const qc = useQueryClient();
  const [sinifFiltre, setSinifFiltre] = useState('');
  const [arama, setArama] = useState('');
  const [modal, setModal] = useState<'yeni' | 'bagla' | null>(null);
  const [sifreKarti, setSifreKarti] = useState<{ baslik: string; email: string; sifre: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['kurum-ogrenciler', sinifFiltre],
    queryFn: async () => (await kocApi.kurumOgrenciler(sinifFiltre || undefined)).data.veri as Ogrenci[],
  });
  const { data: siniflar } = useQuery({
    queryKey: ['kurum-siniflar'],
    queryFn: async () => (await kocApi.kurumSiniflar()).data.veri as Sinif[],
  });

  const tazele = () => {
    qc.invalidateQueries({ queryKey: ['kurum-ogrenciler'] });
    qc.invalidateQueries({ queryKey: ['kurum-siniflar'] });
    qc.invalidateQueries({ queryKey: ['koc-ozet'] });
  };

  const sinifAtaMut = useMutation({
    mutationFn: ({ id, sinifId }: { id: string; sinifId: string | null }) =>
      kocApi.kurumOgrenciSinifAta(id, sinifId),
    onSuccess: () => {
      toast.basarili('Sınıf güncellendi');
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Sınıf atanamadı')),
  });

  const sifreMut = useMutation({
    mutationFn: (id: string) => kocApi.kurumOgrenciSifreSifirla(id),
    onSuccess: (res) =>
      setSifreKarti({
        baslik: 'Yeni geçici şifre',
        email: res.data.veri.email,
        sifre: res.data.veri.geciciSifre,
      }),
    onError: (e) => toast.hata(apiMesaj(e, 'Şifre sıfırlanamadı')),
  });

  const cikarMut = useMutation({
    mutationFn: (id: string) => kocApi.kurumOgrenciCikar(id),
    onSuccess: () => {
      toast.basarili('Öğrenci kurumdan çıkarıldı');
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Çıkarılamadı')),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Öğrenciler yükleniyor…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800">
        {apiMesaj(error, 'Öğrenciler getirilemedi')}
      </div>
    );
  }

  const q = arama.trim().toLocaleLowerCase('tr');
  const ogrenciler = (data || []).filter((o) =>
    q ? `${o.ad} ${o.soyad} ${o.email}`.toLocaleLowerCase('tr').includes(q) : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Kurum yönetimi</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Öğrenciler</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kurumunuza bağlı öğrenciler. Yeni hesap açabilir, mevcut bir öğrenciyi bağlayabilir ve sınıflara dağıtabilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModal('bagla')}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-100"
          >
            <Link2 className="h-4 w-4" /> Mevcut öğrenciyi bağla
          </button>
          <button
            onClick={() => setModal('yeni')}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <UserPlus className="h-4 w-4" /> Öğrenci hesabı aç
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ad veya e-posta ara…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400"
          />
        </div>
        <select
          value={sinifFiltre}
          onChange={(e) => setSinifFiltre(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Tüm sınıflar</option>
          <option value="yok">Sınıfsız öğrenciler</option>
          {(siniflar || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.ad}
            </option>
          ))}
        </select>
      </div>

      {ogrenciler.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            Bu filtrede öğrenci yok. Referans kodunuzu paylaşabilir veya buradan hesap açabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {ogrenciler.map((o) => (
              <li key={o.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {o.ad} {o.soyad}
                    {!o.hesapAktif && (
                      <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        Pasif
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{o.email}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {o.ogretimTuru}
                    {o.sinif ? ` · ${o.sinif}` : ''} · {o.katilimSayisi} katılım
                    {o.kurumSinifAdi ? ` · ${o.kurumSinifAdi}` : ' · sınıfsız'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={o.kurumSinifId || ''}
                    onChange={(e) => sinifAtaMut.mutate({ id: o.id, sinifId: e.target.value || null })}
                    disabled={sinifAtaMut.isPending}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs"
                  >
                    <option value="">Sınıfsız</option>
                    {(siniflar || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ad}
                      </option>
                    ))}
                  </select>
                  <Link
                    href={`/kurum/ogrenci/${o.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Özet <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/kurum/ogrenci/${o.id}/analiz`}
                    className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                  >
                    Analiz
                  </Link>
                  <button
                    onClick={() => sifreMut.mutate(o.id)}
                    disabled={sifreMut.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Şifre
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`${o.ad} ${o.soyad} kurumdan çıkarılsın mı? Hesabı silinmez, bağlantısı kesilir.`)) {
                        cikarMut.mutate(o.id);
                      }
                    }}
                    disabled={cikarMut.isPending}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700"
                    title="Kurumdan çıkar"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal && (
        <OgrenciModal
          mod={modal}
          siniflar={siniflar || []}
          kapat={() => setModal(null)}
          tamamlandi={(bilgi) => {
            setModal(null);
            if (bilgi) setSifreKarti(bilgi);
            tazele();
          }}
        />
      )}

      {sifreKarti && (
        <GeciciSifreKarti
          baslik={sifreKarti.baslik}
          email={sifreKarti.email}
          sifre={sifreKarti.sifre}
          kapat={() => setSifreKarti(null)}
        />
      )}
    </div>
  );
}

function OgrenciModal({
  mod,
  siniflar,
  kapat,
  tamamlandi,
}: {
  mod: 'yeni' | 'bagla';
  siniflar: Sinif[];
  kapat: () => void;
  tamamlandi: (bilgi: { baslik: string; email: string; sifre: string } | null) => void;
}) {
  const [form, setForm] = useState({ ad: '', soyad: '', email: '', sinif: '', kurumSinifId: '' });

  const yeniMut = useMutation({
    mutationFn: () =>
      kocApi.kurumOgrenciHesapAc({
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        email: form.email.trim(),
        sinif: form.sinif.trim() || undefined,
        kurumSinifId: form.kurumSinifId || undefined,
      }),
    onSuccess: (res) => {
      toast.basarili('Öğrenci hesabı oluşturuldu');
      tamamlandi({
        baslik: 'Öğrenci giriş bilgileri',
        email: res.data.veri.ogrenci.email,
        sifre: res.data.veri.geciciSifre,
      });
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Hesap açılamadı')),
  });

  const baglaMut = useMutation({
    mutationFn: () =>
      kocApi.kurumOgrenciBagla({
        email: form.email.trim(),
        kurumSinifId: form.kurumSinifId || undefined,
      }),
    onSuccess: (res) => {
      toast.basarili(res.data.veri?.zatenBagli ? 'Öğrenci zaten kurumunuza bağlı' : 'Öğrenci kuruma bağlandı');
      tamamlandi(null);
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Bağlanamadı')),
  });

  const yeniMi = mod === 'yeni';
  const bekliyor = yeniMut.isPending || baglaMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {yeniMi ? 'Öğrenci hesabı aç' : 'Mevcut öğrenciyi bağla'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {yeniMi
                ? 'Hesap açılır ve geçici şifre üretilir; öğrenciye iletirsiniz.'
                : 'Zaten kayıtlı bir öğrenciyi e-posta ile kurumunuza bağlar.'}
            </p>
          </div>
          <button onClick={kapat} className="rounded-lg p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {yeniMi && (
            <>
              <input
                value={form.ad}
                onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
                placeholder="Ad *"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
              />
              <input
                value={form.soyad}
                onChange={(e) => setForm((f) => ({ ...f, soyad: e.target.value }))}
                placeholder="Soyad"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
              />
            </>
          )}
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="E-posta *"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
          />
          {yeniMi && (
            <input
              value={form.sinif}
              onChange={(e) => setForm((f) => ({ ...f, sinif: e.target.value }))}
              placeholder="Kademe / sınıf (örn. 12, 8, KPSS Lisans)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
            />
          )}
          <select
            value={form.kurumSinifId}
            onChange={(e) => setForm((f) => ({ ...f, kurumSinifId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          >
            <option value="">Kurum sınıfı seçilmedi</option>
            {siniflar.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => (yeniMi ? yeniMut.mutate() : baglaMut.mutate())}
          disabled={bekliyor || !form.email.trim() || (yeniMi && !form.ad.trim())}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {bekliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : yeniMi ? <UserPlus className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {yeniMi ? 'Hesabı oluştur' : 'Bağla'}
        </button>
      </div>
    </div>
  );
}
