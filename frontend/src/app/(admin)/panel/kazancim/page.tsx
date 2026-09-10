'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi } from '@/lib/api';
import {
  BadgePercent,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from '@/store/toast.store';

type Ozet = {
  ozet: {
    toplamKazanc: number;
    odenmisKazanc: number;
    odenecekKazanc: number;
    bekleyenKazanc: number;
    satisAdedi: number;
    bekleyenAdet: number;
    ciro: number;
  };
  kodlar: Array<{
    id: string;
    kod: string;
    aciklama: string | null;
    aktif: boolean;
    indirimTipi: 'YUZDE' | 'TUTAR';
    indirimDegeri: number;
    komisyonTipi: 'YUZDE' | 'TUTAR';
    komisyonDegeri: number;
    platform: string;
    kullanimSayisi: number;
    maksKullanim: number | null;
    bitis: string | null;
  }>;
  aylik: Array<{ ay: string; tutar: number }>;
  sonKullanimlar: Array<{
    id: string;
    kod: string;
    urun: string;
    netTutar: number;
    komisyonTutari: number;
    komisyonDurumu: string;
    tarih: string;
  }>;
};

type Hareket = {
  id: string;
  kod: string;
  urun: string;
  brutTutar: number;
  indirimTutari: number;
  netTutar: number;
  komisyonTutari: number;
  komisyonDurumu: string;
  siparisDurumu: string | null;
  odemeTarihi: string | null;
  tarih: string;
};

const DURUM_ETIKET: Record<string, { etiket: string; sinif: string }> = {
  BEKLEMEDE: { etiket: 'Ödeme bekleniyor', sinif: 'bg-amber-50 text-amber-700 border-amber-200' },
  ONAYLANDI: { etiket: 'Hakediş', sinif: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ODENDI: { etiket: 'Ödendi', sinif: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IPTAL: { etiket: 'İptal', sinif: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function tl(deger: number) {
  return `${(deger ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function ayEtiketi(ay: string) {
  const [yil, no] = ay.split('-');
  return format(new Date(Number(yil), Number(no) - 1, 1), 'MMM yy', { locale: tr });
}

export default function KazancimSayfasi() {
  const [durum, setDurum] = useState('');
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['kazancim-ozet'],
    queryFn: () => adminApi.kazancimOzet(),
  });
  const { data: hareketData } = useQuery({
    queryKey: ['kazancim-hareketler', durum],
    queryFn: () => adminApi.kazancimHareketler({ durum: durum || undefined }),
  });

  const veri = data?.data?.veri as Ozet | undefined;
  const hareketler: Hareket[] = hareketData?.data?.veri || [];

  const kodKopyala = async (kod: string) => {
    try {
      await navigator.clipboard.writeText(kod);
      setKopyalanan(kod);
      toast.basarili('Kod kopyalandı');
      setTimeout(() => setKopyalanan(null), 2000);
    } catch {
      toast.hata('Kopyalanamadı');
    }
  };

  if (isLoading || !veri) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const enYuksekAy = Math.max(1, ...veri.aylik.map((a) => a.tutar));

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <Wallet className="h-4 w-4" /> Muhasebe
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Kazançlarım</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Size tanımlı indirim kodlarıyla yapılan satışlardan hak ettiğiniz komisyonlar. Öğrenci kodunuzu
            ödemede kullandığında kazanç otomatik olarak buraya işlenir.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { etiket: 'Toplam kazanç', deger: tl(veri.ozet.toplamKazanc), ikon: Wallet, kutu: 'bg-emerald-50 text-emerald-600' },
          { etiket: 'Ödenen', deger: tl(veri.ozet.odenmisKazanc), ikon: Check, kutu: 'bg-teal-50 text-teal-600' },
          { etiket: 'Ödenecek', deger: tl(veri.ozet.odenecekKazanc), ikon: Receipt, kutu: 'bg-indigo-50 text-indigo-600' },
          { etiket: 'Ödeme bekleyen sipariş', deger: tl(veri.ozet.bekleyenKazanc), ikon: Clock, kutu: 'bg-amber-50 text-amber-600' },
        ].map((k) => (
          <div key={k.etiket} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.kutu}`}>
                <k.ikon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.etiket}</p>
                <p className="truncate text-xl font-black text-gray-900">{k.deger}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Son 6 ay
          </h2>
          <div className="mt-5 flex h-40 items-end gap-3">
            {veri.aylik.map((a) => (
              <div key={a.ay} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500">{a.tutar > 0 ? tl(a.tutar) : ''}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400"
                  style={{ height: `${Math.max(4, (a.tutar / enYuksekAy) * 100)}%` }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {ayEtiketi(a.ay)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {veri.ozet.satisAdedi} satış · {tl(veri.ozet.ciro)} ciro üzerinden hesaplandı
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
            <BadgePercent className="h-4 w-4 text-emerald-600" /> Kodlarım
          </h2>
          {veri.kodlar.length === 0 ? (
            <p className="mt-4 text-xs text-gray-500">
              Henüz size tanımlı bir indirim kodu yok. Yöneticinizden kod talep edebilirsiniz.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {veri.kodlar.map((k) => (
                <li key={k.id} className="rounded-2xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => kodKopyala(k.kod)}
                      className="inline-flex items-center gap-1.5 font-mono text-sm font-black text-gray-900"
                    >
                      {kopyalanan === k.kod ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      {k.kod}
                    </button>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        k.aktif
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                    >
                      {k.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Öğrenci indirimi:{' '}
                    <strong>
                      {k.indirimTipi === 'YUZDE' ? `%${k.indirimDegeri}` : tl(k.indirimDegeri)}
                    </strong>{' '}
                    · Komisyonunuz:{' '}
                    <strong className="text-emerald-700">
                      {k.komisyonTipi === 'YUZDE' ? `%${k.komisyonDegeri}` : tl(k.komisyonDegeri)}
                    </strong>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {k.kullanimSayisi} kullanım
                    {k.maksKullanim ? ` / ${k.maksKullanim}` : ''}
                    {k.bitis ? ` · son ${format(new Date(k.bitis), 'd MMM yyyy', { locale: tr })}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <h2 className="flex items-center gap-2 text-base font-black text-gray-900">
            <CalendarDays className="h-4 w-4 text-emerald-600" /> Kazanç hareketleri
          </h2>
          <select
            value={durum}
            onChange={(e) => setDurum(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
          >
            <option value="">Tümü</option>
            <option value="ONAYLANDI">Ödenecek</option>
            <option value="ODENDI">Ödenen</option>
            <option value="BEKLEMEDE">Ödeme bekleyen</option>
            <option value="IPTAL">İptal</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Tarih</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Kod / ürün</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Satış</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Kazancım</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Durum</th>
              </tr>
            </thead>
            <tbody>
              {hareketler.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm font-medium text-gray-500">
                    Bu filtrede kayıt yok. Kodunuz kullanıldığında satışlar burada listelenir.
                  </td>
                </tr>
              ) : (
                hareketler.map((h) => {
                  const d = DURUM_ETIKET[h.komisyonDurumu] ?? DURUM_ETIKET.BEKLEMEDE;
                  return (
                    <tr key={h.id} className="border-b border-gray-50">
                      <td className="p-4 text-xs font-bold text-gray-700">
                        {format(new Date(h.tarih), 'd MMM yyyy', { locale: tr })}
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-xs font-black text-gray-900">{h.kod}</p>
                        <p className="text-xs text-gray-500">{h.urun}</p>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-800">
                        {tl(h.netTutar)}
                        <p className="text-[10px] font-medium text-gray-400">
                          liste {tl(h.brutTutar)} · indirim {tl(h.indirimTutari)}
                        </p>
                      </td>
                      <td className="p-4 text-sm font-black text-emerald-700">{tl(h.komisyonTutari)}</td>
                      <td className="p-4">
                        <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${d.sinif}`}>
                          {d.etiket}
                        </span>
                        {h.odemeTarihi && (
                          <p className="mt-1 text-[10px] text-gray-400">
                            {format(new Date(h.odemeTarihi), 'd MMM yyyy', { locale: tr })}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
