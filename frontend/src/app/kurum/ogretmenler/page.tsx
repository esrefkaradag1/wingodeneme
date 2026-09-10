'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { kocApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { GeciciSifreKarti, apiMesaj } from '@/components/koc/GeciciSifreKarti';

type Ogretmen = {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  telefon: string | null;
  aktif: boolean;
  profilAktif: boolean;
  siniflar: Array<{ id: string; ad: string }>;
  ogrenciSayisi: number;
};

type Sinif = { id: string; ad: string; ogrenciSayisi: number };

export default function KurumOgretmenlerSayfasi() {
  const qc = useQueryClient();
  const [modalAcik, setModalAcik] = useState(false);
  const [sifreKarti, setSifreKarti] = useState<{ baslik: string; email: string; sifre: string } | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<Ogretmen | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['kurum-ogretmenler'],
    queryFn: async () => (await kocApi.kurumOgretmenler()).data.veri as Ogretmen[],
  });
  const { data: siniflar } = useQuery({
    queryKey: ['kurum-siniflar'],
    queryFn: async () => (await kocApi.kurumSiniflar()).data.veri as Sinif[],
  });

  const tazele = () => {
    qc.invalidateQueries({ queryKey: ['kurum-ogretmenler'] });
    qc.invalidateQueries({ queryKey: ['kurum-siniflar'] });
  };

  const durumMut = useMutation({
    mutationFn: ({ id, aktif }: { id: string; aktif: boolean }) => kocApi.kurumOgretmenGuncelle(id, { aktif }),
    onSuccess: (_v, d) => {
      toast.basarili(d.aktif ? 'Öğretmen aktifleştirildi' : 'Öğretmen pasife alındı');
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Güncellenemedi')),
  });

  const sinifMut = useMutation({
    mutationFn: ({ id, sinifIds }: { id: string; sinifIds: string[] }) =>
      kocApi.kurumOgretmenGuncelle(id, { sinifIds }),
    onSuccess: () => {
      toast.basarili('Sınıf atamaları güncellendi');
      setDuzenlenen(null);
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Güncellenemedi')),
  });

  const sifreMut = useMutation({
    mutationFn: (o: Ogretmen) => kocApi.kurumOgretmenSifreSifirla(o.id),
    onSuccess: (res) => {
      setSifreKarti({
        baslik: 'Yeni geçici şifre',
        email: res.data.veri.email,
        sifre: res.data.veri.geciciSifre,
      });
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Şifre sıfırlanamadı')),
  });

  const silMut = useMutation({
    mutationFn: (id: string) => kocApi.kurumOgretmenSil(id),
    onSuccess: () => {
      toast.basarili('Öğretmen hesabı silindi');
      tazele();
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Silinemedi')),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Öğretmenler yükleniyor…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800">
        {apiMesaj(error, 'Öğretmenler getirilemedi')}
      </div>
    );
  }

  const ogretmenler = data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Kurum yönetimi</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Öğretmenler</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kurumunuzun öğretmenleri yalnızca atandıkları sınıfların öğrencilerini görür; soru bankasına erişemez.
          </p>
        </div>
        <button
          onClick={() => setModalAcik(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Öğretmen ekle
        </button>
      </div>

      {ogretmenler.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            Henüz öğretmen eklenmemiş. Öğretmen ekleyip sınıflara atayın; kendi öğrencilerinin sonuçlarını takip etsinler.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {ogretmenler.map((o) => (
              <li key={o.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {o.ad} {o.soyad}
                    {!o.aktif && (
                      <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        Pasif
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Mail className="h-3 w-3" /> {o.email}
                    {o.telefon ? ` · ${o.telefon}` : ''}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                    <Users className="h-3 w-3 text-slate-400" /> {o.ogrenciSayisi} öğrenci
                    {o.siniflar.length > 0 ? (
                      o.siniflar.map((s) => (
                        <span key={s.id} className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700">
                          {s.ad}
                        </span>
                      ))
                    ) : (
                      <span className="text-amber-600">· sınıf atanmamış</span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDuzenlenen(o)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Sınıfları düzenle
                  </button>
                  <button
                    onClick={() => sifreMut.mutate(o)}
                    disabled={sifreMut.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Şifre
                  </button>
                  <button
                    onClick={() => durumMut.mutate({ id: o.id, aktif: !o.profilAktif })}
                    disabled={durumMut.isPending}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      o.profilAktif
                        ? 'border border-amber-200 bg-amber-50 text-amber-700'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {o.profilAktif ? 'Pasife al' : 'Aktifleştir'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`${o.ad} ${o.soyad} hesabı tamamen silinsin mi? Bu işlem geri alınamaz.`)) {
                        silMut.mutate(o.id);
                      }
                    }}
                    disabled={silMut.isPending}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700"
                    title="Öğretmeni sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalAcik && (
        <OgretmenEkleModal
          siniflar={siniflar || []}
          kapat={() => setModalAcik(false)}
          tamamlandi={(bilgi) => {
            setModalAcik(false);
            setSifreKarti(bilgi);
            tazele();
          }}
        />
      )}

      {duzenlenen && (
        <SinifAtamaModal
          ogretmen={duzenlenen}
          siniflar={siniflar || []}
          kaydediliyor={sinifMut.isPending}
          kapat={() => setDuzenlenen(null)}
          kaydet={(sinifIds) => sinifMut.mutate({ id: duzenlenen.id, sinifIds })}
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

function OgretmenEkleModal({
  siniflar,
  kapat,
  tamamlandi,
}: {
  siniflar: Sinif[];
  kapat: () => void;
  tamamlandi: (bilgi: { baslik: string; email: string; sifre: string }) => void;
}) {
  const [form, setForm] = useState({ ad: '', soyad: '', email: '', telefon: '' });
  const [secili, setSecili] = useState<string[]>([]);

  const ekleMut = useMutation({
    mutationFn: () =>
      kocApi.kurumOgretmenEkle({
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        email: form.email.trim(),
        telefon: form.telefon.trim() || undefined,
        sinifIds: secili,
      }),
    onSuccess: (res) => {
      toast.basarili('Öğretmen hesabı oluşturuldu');
      tamamlandi({
        baslik: 'Öğretmen giriş bilgileri',
        email: res.data.veri.ogretmen.email,
        sifre: res.data.veri.geciciSifre,
      });
    },
    onError: (e) => toast.hata(apiMesaj(e, 'Öğretmen eklenemedi')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Öğretmen ekle</h2>
            <p className="mt-1 text-xs text-slate-500">
              Hesap açıldığında geçici bir şifre üretilir; öğretmene iletirsiniz.
            </p>
          </div>
          <button onClick={kapat} className="rounded-lg p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {([
            ['ad', 'Ad *'],
            ['soyad', 'Soyad'],
            ['email', 'E-posta *'],
            ['telefon', 'Telefon'],
          ] as const).map(([alan, etiket]) => (
            <input
              key={alan}
              value={form[alan]}
              onChange={(e) => setForm((f) => ({ ...f, [alan]: e.target.value }))}
              placeholder={etiket}
              type={alan === 'email' ? 'email' : 'text'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
            />
          ))}
        </div>

        {siniflar.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-slate-600">Sınıf ataması</p>
            <div className="flex flex-wrap gap-1.5">
              {siniflar.map((s) => {
                const aktif = secili.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setSecili((liste) => (aktif ? liste.filter((x) => x !== s.id) : [...liste, s.id]))
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                      aktif ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {s.ad}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => ekleMut.mutate()}
          disabled={ekleMut.isPending || !form.ad.trim() || !form.email.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {ekleMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Hesabı oluştur
        </button>
      </div>
    </div>
  );
}

function SinifAtamaModal({
  ogretmen,
  siniflar,
  kaydediliyor,
  kapat,
  kaydet,
}: {
  ogretmen: Ogretmen;
  siniflar: Sinif[];
  kaydediliyor: boolean;
  kapat: () => void;
  kaydet: (sinifIds: string[]) => void;
}) {
  const [secili, setSecili] = useState<string[]>(ogretmen.siniflar.map((s) => s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            {ogretmen.ad} {ogretmen.soyad} · sınıfları
          </h2>
          <button onClick={kapat} className="rounded-lg p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {siniflar.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Önce Sınıflar sayfasından sınıf oluşturun.
          </p>
        ) : (
          <div className="space-y-1.5">
            {siniflar.map((s) => {
              const aktif = secili.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setSecili((liste) => (aktif ? liste.filter((x) => x !== s.id) : [...liste, s.id]))
                  }
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                    aktif ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-semibold">{s.ad}</span>
                  <span className="text-xs text-slate-500">{s.ogrenciSayisi} öğrenci</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => kaydet(secili)}
          disabled={kaydediliyor}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {kaydediliyor && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
        </button>
      </div>
    </div>
  );
}
