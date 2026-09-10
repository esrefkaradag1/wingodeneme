'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Loader2, UserPlus, ArrowRight, Users, TrendingUp, Package, School, GraduationCap } from 'lucide-react';
import { kocApi } from '@/lib/api';
import { usePanelYolu } from '@/components/panel/PanelYolu';
import { toast } from '@/store/toast.store';

function axiosApiMesaj(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data && typeof (error.response.data as { mesaj?: string }).mesaj === 'string') {
    return (error.response.data as { mesaj: string }).mesaj;
  }
  return (error as Error)?.message || 'Bir hata oluştu.';
}

interface KocOzet {
  koc: {
    ad: string;
    soyad: string;
    tip: string;
    kurumAdi?: string | null;
    referansKod: string;
    kurumYoneticisi?: boolean;
    kurumOgretmeni?: boolean;
  };
  ogrenciSayisi: number;
  toplu: {
    toplamDeneme: number;
    sinifOrtalamaNet: number;
    aktifOgrenci: number;
    tamamlananPaketSatisi: number;
    sinifSayisi: number;
    ogretmenSayisi: number;
  };
  ogrenciler: Array<{
    id: string;
    ad: string;
    soyad: string;
    sinif: string | null;
    okul: string | null;
    ogretimTuru: string;
    kurumSinifAdi?: string | null;
    ozet: { tamamlananDeneme: number; ortalamaNet: number; enIyiSiralama: number | null };
    sonDenemeler: Array<{
      katilimId: string;
      sinavBaslik: string;
      net: number;
      tarih: string;
    }>;
  }>;
}

export default function OgrenciListesiEkrani() {
  const temelYol = usePanelYolu();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['koc-ozet'],
    queryFn: async () => (await kocApi.ozet()).data.veri as KocOzet,
  });

  const bagla = useMutation({
    mutationFn: (e: string) => kocApi.ogrenciBagla(e),
    onSuccess: (res) => {
      const zaten = res.data.veri?.zatenBagli;
      toast.basarili(zaten ? 'Öğrenci zaten bağlı' : 'Öğrenci bağlandı');
      queryClient.invalidateQueries({ queryKey: ['koc-ozet'] });
      setEmail('');
    },
    onError: (err) => toast.hata(axiosApiMesaj(err)),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Öğrenciler yükleniyor…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800">
        {axiosApiMesaj(error)}
      </div>
    );
  }

  const hitap = [data.koc.ad, data.koc.soyad].filter(Boolean).join(' ');
  const kurumYoneticisi = data.koc.kurumYoneticisi === true;
  const kurumOgretmeni = data.koc.kurumOgretmeni === true;
  const tipEtiket = kurumYoneticisi
    ? 'Kurumsal hesap'
    : kurumOgretmeni
      ? 'Kurum öğretmeni'
      : 'Özel ders / koç';

  return (
    <div className="space-y-6">
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            kurumYoneticisi || kurumOgretmeni ? 'text-indigo-700' : 'text-teal-700'
          }`}
        >
          {tipEtiket}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Merhaba{hitap ? `, ${hitap}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {kurumYoneticisi
            ? 'Kurumunuzun öğretmenlerini, sınıflarını ve öğrencilerini buradan yönetin.'
            : kurumOgretmeni
              ? 'Atandığınız sınıflardaki öğrencilerin deneme sonuçlarını takip edin.'
              : 'Yönlendirdiğiniz öğrencilerin deneme sonuçlarını bireysel ve toplu takip edin.'}
          {data.koc.kurumAdi ? ` · ${data.koc.kurumAdi}` : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Users className="h-4 w-4" /> Öğrenci
          </div>
          <p className="mt-2 text-2xl font-bold">{data.ogrenciSayisi}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <TrendingUp className="h-4 w-4" /> Sınıf ort. net
          </div>
          <p className="mt-2 text-2xl font-bold">{data.toplu.sinifOrtalamaNet || '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-slate-500 text-xs font-semibold">Toplam deneme</div>
          <p className="mt-2 text-2xl font-bold">{data.toplu.toplamDeneme}</p>
        </div>
        {kurumYoneticisi ? (
          <Link href="/kurum/siniflar" className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <School className="h-4 w-4" /> Sınıf / öğretmen
            </div>
            <p className="mt-2 text-2xl font-bold">
              {data.toplu.sinifSayisi}
              <span className="ml-1 text-base font-semibold text-slate-400">/ {data.toplu.ogretmenSayisi}</span>
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Package className="h-4 w-4" /> Paket satışı
            </div>
            <p className="mt-2 text-2xl font-bold">{data.toplu.tamamlananPaketSatisi}</p>
          </div>
        )}
      </div>

      {kurumYoneticisi ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: '/kurum/ogrenciler', baslik: 'Öğrenciler', aciklama: 'Hesap aç, bağla, sınıfa dağıt', ikon: Users },
            { href: '/kurum/siniflar', baslik: 'Sınıflar', aciklama: 'Şube oluştur, öğretmen ata', ikon: School },
            { href: '/kurum/ogretmenler', baslik: 'Öğretmenler', aciklama: 'Öğretmen ekle ve yetkilendir', ikon: GraduationCap },
          ].map((k) => (
            <Link
              key={k.href}
              href={k.href}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-300"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <k.ikon className="h-4 w-4 text-teal-600" /> {k.baslik}
              </div>
              <p className="mt-1 text-xs text-slate-500">{k.aciklama}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                Aç <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {kurumOgretmeni || kurumYoneticisi ? null : (
      <div id="ogrenci-bagla" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <UserPlus className="h-4 w-4 text-teal-600" /> Öğrenci bağla
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Öğrenci kayıt olurken referans kodunuzu girebilir veya siz e-posta ile bağlayabilirsiniz.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            bagla.mutate(email.trim());
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ogrenci@email.com"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
          />
          <button
            type="submit"
            disabled={bagla.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {bagla.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Bağla
          </button>
        </form>
      </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-bold">{kurumYoneticisi ? 'Kurum öğrencileri' : 'Öğrencilerim'}</h2>
          <Link href={`${temelYol}/toplu`} className="text-xs font-semibold text-teal-700 hover:underline">
            Toplu analiz →
          </Link>
        </div>
        {data.ogrenciler.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {kurumYoneticisi
              ? 'Henüz öğrenci yok. Öğrenciler sayfasından hesap açabilir veya referans kodunuzu paylaşabilirsiniz.'
              : kurumOgretmeni
                ? 'Atandığınız sınıflarda henüz öğrenci yok. Kurum yöneticiniz sizi bir sınıfa atamalı.'
                : 'Henüz bağlı öğrenci yok. Referans kodunuzu paylaşın veya e-posta ile bağlayın.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.ogrenciler.map((o) => (
              <li key={o.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {o.ad} {o.soyad}
                  </p>
                  <p className="text-xs text-slate-500">
                    {o.ogretimTuru}
                    {o.sinif ? ` · ${o.sinif}` : ''}
                    {o.okul ? ` · ${o.okul}` : ''}
                    {o.kurumSinifAdi ? (
                      <span className="ml-1.5 rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700">
                        {o.kurumSinifAdi}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {o.ozet.tamamlananDeneme} deneme · ort. net {o.ozet.ortalamaNet}
                    {o.ozet.enIyiSiralama != null ? ` · en iyi sıra ${o.ozet.enIyiSiralama}` : ''}
                  </p>
                  {o.sonDenemeler[0] && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      Son: {o.sonDenemeler[0].sinavBaslik} ({o.sonDenemeler[0].net} net) ·{' '}
                      {format(new Date(o.sonDenemeler[0].tarih), 'd MMM yyyy', { locale: tr })}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`${temelYol}/ogrenci/${o.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Özet <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`${temelYol}/ogrenci/${o.id}/analiz`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Analiz
                  </Link>
                  <Link
                    href={`${temelYol}/ogrenci/${o.id}/sinavlar`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Sınavlar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
