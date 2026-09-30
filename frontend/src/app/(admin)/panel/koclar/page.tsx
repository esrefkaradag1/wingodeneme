'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import {
  Check,
  Copy,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

type KocSatiri = {
  id: string;
  kullaniciId: string;
  email: string;
  rol: string;
  ad: string;
  soyad: string;
  telefon: string | null;
  referansKod: string;
  aktif: boolean;
  ogrenciSayisi: number;
  tamamlananSatis: number;
  olusturuldu: string;
};

type Ogretmen = {
  kullaniciId: string;
  email: string;
  rol: string;
  hesapAktif: boolean;
  ad: string;
  soyad: string;
  brans: string | null;
  ogretimTuru: string | null;
  kayitTarihi: string;
  kocYetkisi: boolean;
  kocProfilId: string | null;
  kocAktif: boolean;
  referansKod: string | null;
  ogrenciSayisi: number;
};

function hataMesaji(err: unknown, varsayilan: string): string {
  return (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || varsayilan;
}

export default function KoclarSayfasi() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);
  const [ogrenciEmail, setOgrenciEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-koclar', q],
    queryFn: () => adminApi.koclar({ q: q.trim() || undefined, kapsam: 'KOC' }),
  });

  const koclar: KocSatiri[] = data?.data?.veri?.koclar || [];
  const ozet = data?.data?.veri?.ozet as
    | { toplamKoc: number; aktifKoc: number; bagliOgrenci: number }
    | undefined;

  const secili = useMemo(() => koclar.find((k) => k.id === seciliId) || null, [koclar, seciliId]);

  const { data: detayData, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['admin-koc-ogrencileri', seciliId],
    queryFn: () => adminApi.kocOgrencileri(seciliId!),
    enabled: !!seciliId,
  });
  const ogrenciler = (detayData?.data?.veri?.ogrenciler || []) as Array<{
    id: string;
    ad: string;
    soyad: string;
    email: string;
    katilimSayisi: number;
  }>;

  const tazele = () => {
    qc.invalidateQueries({ queryKey: ['admin-koclar'] });
    qc.invalidateQueries({ queryKey: ['admin-koc-ogrencileri'] });
    qc.invalidateQueries({ queryKey: ['admin-koc-adaylari'] });
  };

  const durumMut = useMutation({
    mutationFn: ({ id, aktif }: { id: string; aktif: boolean }) => adminApi.kocGuncelle(id, { aktif }),
    onSuccess: (_v, d) => {
      toast.basarili(d.aktif ? 'Koç yetkisi aktifleştirildi' : 'Koç yetkisi pasife alındı');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Güncellenemedi')),
  });

  const silMut = useMutation({
    mutationFn: (id: string) => adminApi.kocYetkiKaldir(id),
    onSuccess: (res) => {
      const cozulen = res.data?.veri?.cozulenOgrenci ?? 0;
      toast.basarili(`Koç yetkisi kaldırıldı${cozulen ? ` · ${cozulen} öğrenci bağlantısı çözüldü` : ''}`);
      setSeciliId(null);
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Kaldırılamadı')),
  });

  const ogrenciAtaMut = useMutation({
    mutationFn: () => adminApi.kocOgrenciAta(seciliId!, ogrenciEmail.trim()),
    onSuccess: (res) => {
      const veri = res.data?.veri;
      toast.basarili(veri?.zatenBagli ? 'Öğrenci zaten bağlı' : veri?.devredildi ? 'Öğrenci devralındı' : 'Öğrenci bağlandı');
      setOgrenciEmail('');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Bağlanamadı')),
  });

  const ogrenciKaldirMut = useMutation({
    mutationFn: (ogrenciId: string) => adminApi.kocOgrenciKaldir(seciliId!, ogrenciId),
    onSuccess: () => {
      toast.basarili('Öğrenci bağlantısı kaldırıldı');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Kaldırılamadı')),
  });

  const kodKopyala = async (kod: string) => {
    try {
      await navigator.clipboard.writeText(kod);
      setKopyalanan(kod);
      toast.basarili('Referans kodu kopyalandı');
      setTimeout(() => setKopyalanan(null), 2000);
    } catch {
      toast.hata('Kopyalanamadı');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-300">
            <GraduationCap className="h-4 w-4" /> Bireysel
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Koçlar</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Özel ders öğretmenleri ve bireysel koçlar. Kendi referans kodlarıyla öğrenci bağlar, sonuç ve
            analizlerini takip ederler. Kurumsal hesaplar için{' '}
            <span className="font-semibold text-slate-300">Kurum Başvuruları</span> sayfasını kullanın.
          </p>
        </div>
      </section>

      {ozet && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[
            { etiket: 'Toplam koç', deger: ozet.toplamKoc, ikon: GraduationCap },
            { etiket: 'Aktif koç', deger: ozet.aktifKoc, ikon: Users },
            { etiket: 'Bağlı öğrenci', deger: ozet.bagliOgrenci, ikon: Users },
          ].map((k) => (
            <div key={k.etiket} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <k.ikon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.etiket}</p>
                  <p className="text-2xl font-black text-gray-900">{k.deger}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ad, e-posta veya referans kodu ara…"
            className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-12 pr-4 text-sm font-bold shadow-sm"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Koç</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Referans</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Öğrenci</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Durum</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
                    </td>
                  </tr>
                ) : koclar.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-sm font-medium text-gray-500">
                      Bireysel koç kaydı yok. Öğretmen hesaplarına buradan koç yetkisi verebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  koclar.map((k) => (
                    <tr
                      key={k.id}
                      onClick={() => setSeciliId(k.id)}
                      className={`cursor-pointer border-b border-gray-50 transition-colors ${
                        seciliId === k.id
                          ? 'bg-teal-100/80'
                          : k.aktif
                            ? 'bg-teal-50/50 hover:bg-teal-50'
                            : 'bg-amber-50/40 hover:bg-amber-50/70'
                      }`}
                    >
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-900">
                          {k.ad} {k.soyad}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="h-3 w-3" /> {k.email}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {k.rol === 'TEACHER' ? 'Öğretmen hesabı' : 'Koç hesabı'} ·{' '}
                          {format(new Date(k.olusturuldu), 'd MMM yyyy', { locale: tr })}
                        </p>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            kodKopyala(k.referansKod);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] font-bold text-gray-700 hover:bg-gray-100"
                        >
                          {kopyalanan === k.referansKod ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                          {k.referansKod}
                        </button>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-black text-gray-900">{k.ogrenciSayisi}</p>
                        <p className="text-[10px] font-bold text-teal-600">{k.tamamlananSatis} satış</p>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            durumMut.mutate({ id: k.id, aktif: !k.aktif });
                          }}
                          disabled={durumMut.isPending}
                          className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            k.aktif
                              ? 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {k.aktif ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
          {!secili ? (
            <div className="py-16 text-center text-sm font-medium text-gray-500">
              Bağlı öğrencileri görmek için listeden bir koç seçin.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-lg font-black text-gray-900">
                  {secili.ad} {secili.soyad}
                </p>
                <p className="text-xs text-gray-500">{secili.email}</p>
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Öğrenci bağla</p>
                <div className="flex gap-2">
                  <input
                    value={ogrenciEmail}
                    onChange={(e) => setOgrenciEmail(e.target.value)}
                    placeholder="ogrenci@ornek.com"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium"
                  />
                  <button
                    onClick={() => ogrenciAtaMut.mutate()}
                    disabled={ogrenciAtaMut.isPending || !ogrenciEmail.trim()}
                    className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Bağla
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Bağlı öğrenciler ({ogrenciler.length})
                </p>
                {detayYukleniyor ? (
                  <div className="py-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                  </div>
                ) : ogrenciler.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">Henüz bağlı öğrenci yok.</p>
                ) : (
                  <ul className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                    {ogrenciler.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {o.ad} {o.soyad}
                          </p>
                          <p className="truncate text-[11px] text-gray-500">
                            {o.email} · {o.katilimSayisi} katılım
                          </p>
                        </div>
                        <button
                          onClick={() => ogrenciKaldirMut.mutate(o.id)}
                          className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-rose-200 hover:text-rose-600"
                          title="Koç bağlantısını kaldır"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `${secili.ad} ${secili.soyad} koç yetkisi kaldırılsın mı? Bağlı ${secili.ogrenciSayisi} öğrencinin bağlantısı çözülür.`,
                    )
                  ) {
                    silMut.mutate(secili.id);
                  }
                }}
                disabled={silMut.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Koç yetkisini kaldır
              </button>
            </div>
          )}
        </div>
      </div>

      <OgretmenlerBolumu tazele={tazele} />
    </div>
  );
}

/** Sistemdeki öğretmenler — koç yetkisi buradan verilir */
function OgretmenlerBolumu({ tazele }: { tazele: () => void }) {
  const [q, setQ] = useState('');
  const [secili, setSecili] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-koc-adaylari', q],
    queryFn: () => adminApi.kocAdaylari({ q: q.trim() || undefined }),
  });
  const ogretmenler: Ogretmen[] = data?.data?.veri || [];
  const yetkisiz = ogretmenler.filter((o) => !o.kocYetkisi).length;

  const yetkiMut = useMutation({
    mutationFn: (o: Ogretmen) =>
      adminApi.kocYetkiVer({
        kullaniciId: o.kullaniciId,
        tip: 'BIREYSEL',
        ad: o.ad || undefined,
        soyad: o.soyad || undefined,
      }),
    onSuccess: (res) => {
      toast.basarili(`Koç yetkisi verildi · Referans kodu: ${res.data?.veri?.referansKod ?? ''}`);
      setSecili(null);
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Yetki verilemedi')),
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-gray-900">
            <Users className="h-4 w-4 text-teal-600" /> Sistemdeki öğretmenler
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {ogretmenler.length} öğretmen · {yetkisiz} tanesinin koç yetkisi yok
          </p>
        </div>
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Öğretmen adı, e-posta veya branş…"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-medium"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Öğretmen</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Branş</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Koç yetkisi</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
                </td>
              </tr>
            ) : ogretmenler.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-sm font-medium text-gray-500">
                  Öğretmen bulunamadı.
                </td>
              </tr>
            ) : (
              ogretmenler.map((o) => (
                <tr
                  key={o.kullaniciId}
                  className={`border-b border-gray-50 ${
                    o.kocYetkisi
                      ? o.kocAktif
                        ? 'bg-teal-50/80 hover:bg-teal-50'
                        : 'bg-amber-50/70 hover:bg-amber-50'
                      : 'hover:bg-gray-50/80'
                  }`}
                >
                  <td className="p-4">
                    <p className={`text-sm font-bold ${o.kocYetkisi ? 'text-teal-900' : 'text-gray-900'}`}>
                      {[o.ad, o.soyad].filter(Boolean).join(' ') || o.email}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3 w-3" /> {o.email}
                    </p>
                    {!o.hesapAktif && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        Hesap pasif
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-bold text-gray-700">{o.brans || '—'}</p>
                    {o.ogretimTuru && <p className="text-[10px] text-gray-400">{o.ogretimTuru}</p>}
                  </td>
                  <td className="p-4">
                    {o.kocYetkisi ? (
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            o.kocAktif
                              ? 'border-teal-200 bg-teal-100 text-teal-800'
                              : 'border-amber-200 bg-amber-100 text-amber-800'
                          }`}
                        >
                          <Check className="h-3 w-3" /> {o.kocAktif ? 'Koç yetkisi var' : 'Koç (pasif)'}
                        </span>
                        <p className="mt-1 font-mono text-[11px] font-bold text-teal-700">{o.referansKod}</p>
                      </div>
                    ) : (
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Yok
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {o.kocYetkisi ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {o.ogrenciSayisi} öğrenci
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSecili(o.kullaniciId);
                          yetkiMut.mutate(o);
                        }}
                        disabled={yetkiMut.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        {yetkiMut.isPending && secili === o.kullaniciId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Koç yetkisi ver
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
