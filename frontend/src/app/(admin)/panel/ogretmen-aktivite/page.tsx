'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Activity,
  Calendar,
  Clock,
  GraduationCap,
  Loader2,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

type OgretmenAktivite = {
  id: string;
  email: string;
  aktif: boolean;
  ad: string;
  soyad: string;
  brans: string | null;
  ogretimTuru: string | null;
  kayitTarihi: string;
  soruSayisi: number;
  aiSoruSayisi: number;
  onayBekleyenSayisi: number;
  sonSoruTarihi: string | null;
  oturumSayisi: number;
  toplamSureSaniye: number;
  toplamSureMetin: string;
  sonGiris: string | null;
  sonAktivite: string | null;
  acikOturum: boolean;
};

type AktiviteDetay = {
  ogretmen: {
    id: string;
    email: string;
    aktif: boolean;
    ad: string;
    soyad: string;
    brans: string | null;
    ogretimTuru: string | null;
    kayitTarihi: string;
  };
  istatistik: { soruSayisi: number; aiSoruSayisi: number };
  oturumlar: Array<{
    id: string;
    baslangic: string;
    bitis: string | null;
    sonAktivite: string;
    sureSaniye: number;
    sureMetin: string;
    ipAdresi: string | null;
    acik: boolean;
  }>;
  aktiviteler: Array<{
    id: string;
    tur: string;
    aciklama: string | null;
    meta: Record<string, unknown> | null;
    olusturuldu: string;
  }>;
};

function tarihGoster(iso?: string | null) {
  if (!iso) return '—';
  return format(new Date(iso), 'dd MMM yyyy HH:mm', { locale: tr });
}

function turEtiket(tur: string) {
  const map: Record<string, string> = {
    GIRIS: 'Giriş',
    CIKIS: 'Çıkış',
    SORU_OLUSTUR: 'Soru oluşturdu',
    SORU_GUNCELLE: 'Soru güncelledi',
    SORU_SIL: 'Soru sildi',
    AI_SORU_URET: 'AI soru üretti',
    PANEL_ERISIM: 'Panel erişimi',
  };
  return map[tur] || tur;
}

export default function OgretmenAktiviteSayfasi() {
  const [q, setQ] = useState('');
  const [aktif, setAktif] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [seciliId, setSeciliId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ogretmen-aktivite', q, aktif, baslangic, bitis],
    queryFn: () =>
      adminApi.ogretmenAktivite({
        q: q.trim() || undefined,
        aktif: aktif || undefined,
        baslangicTarihi: baslangic || undefined,
        bitisTarihi: bitis || undefined,
      }),
  });

  const ogretmenler: OgretmenAktivite[] = data?.data?.veri?.ogretmenler || [];
  const ozet = data?.data?.veri?.ozet;

  const { data: detayData, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['ogretmen-aktivite-detay', seciliId, baslangic, bitis],
    queryFn: () =>
      adminApi.ogretmenAktiviteDetay(seciliId!, {
        baslangicTarihi: baslangic || undefined,
        bitisTarihi: bitis || undefined,
      }),
    enabled: !!seciliId,
  });

  const detay = detayData?.data?.veri as AktiviteDetay | undefined;
  const secili = useMemo(
    () => ogretmenler.find((o) => o.id === seciliId) || null,
    [ogretmenler, seciliId],
  );

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-4 border border-emerald-500/30">
            <Activity className="w-4 h-4" /> Süper Admin
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Öğretmen Aktivite Takibi</h1>
          <p className="text-slate-400 mt-3 max-w-2xl text-sm leading-relaxed">
            Öğretmenlerin sisteme giriş zamanları, oturum süreleri, soru üretimleri ve panel işlemlerini buradan izleyin.
            Ara veren hocaları son aktivite tarihine göre tespit edebilirsiniz.
          </p>
        </div>
      </section>

      {ozet && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { etiket: 'Toplam öğretmen', deger: ozet.toplamOgretmen, ikon: Users },
            { etiket: 'Aktif hesap', deger: ozet.aktifOgretmen, ikon: UserCheck },
            { etiket: 'Soru (filtre)', deger: ozet.toplamSoru, ikon: GraduationCap },
            { etiket: 'Oturum saati', deger: `${ozet.toplamOturumSaati} sa`, ikon: Clock },
          ].map((k) => (
            <div key={k.etiket} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <k.ikon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{k.etiket}</p>
                  <p className="text-2xl font-black text-gray-900">{k.deger}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Öğretmen adı, e-posta veya branş ara..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 bg-white text-sm font-bold shadow-sm"
          />
        </div>
        <select
          value={aktif}
          onChange={(e) => setAktif(e.target.value)}
          className="px-4 py-3 rounded-2xl border border-gray-100 bg-white text-sm font-bold shadow-sm"
        >
          <option value="">Tüm hesaplar</option>
          <option value="true">Yalnız aktif</option>
          <option value="false">Pasif / onay bekleyen</option>
        </select>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} className="text-sm font-bold" />
          <span className="text-gray-300">—</span>
          <input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} className="text-sm font-bold" />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Öğretmen</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Son giriş</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Süre</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Soru</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Durum</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    </td>
                  </tr>
                ) : ogretmenler.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-sm font-medium text-gray-500">
                      Filtreye uygun öğretmen bulunamadı.
                    </td>
                  </tr>
                ) : (
                  ogretmenler.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSeciliId(o.id)}
                      className={`border-b border-gray-50 cursor-pointer hover:bg-indigo-50/40 transition-colors ${
                        seciliId === o.id ? 'bg-indigo-50/60' : ''
                      }`}
                    >
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-900">
                          {o.ad} {o.soyad}
                        </p>
                        <p className="text-xs text-gray-500">{o.email}</p>
                        {o.brans && <p className="text-[10px] font-bold text-indigo-600 mt-1">{o.brans}</p>}
                      </td>
                      <td className="p-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                        {tarihGoster(o.sonGiris)}
                        {o.acikOturum && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Çevrimiçi
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-bold text-gray-700">
                        {o.toplamSureMetin}
                        <p className="text-[10px] text-gray-400 font-medium">{o.oturumSayisi} oturum</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-black text-gray-900">{o.soruSayisi}</p>
                        <p className="text-[10px] text-violet-600 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> {o.aiSoruSayisi} AI
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                            o.aktif
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                        >
                          {o.aktif ? 'Aktif' : 'Pasif'}
                        </span>
                        {o.onayBekleyenSayisi > 0 && (
                          <p className="text-[10px] font-bold text-amber-600 mt-1">{o.onayBekleyenSayisi} onay bekliyor</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 min-h-[420px]">
          {!seciliId ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-4">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-bold">Detay için listeden bir öğretmen seçin</p>
            </div>
          ) : detayYukleniyor ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : detay ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    {detay.ogretmen.ad} {detay.ogretmen.soyad}
                  </h2>
                  <p className="text-xs text-gray-500">{detay.ogretmen.email}</p>
                </div>
                <button type="button" onClick={() => setSeciliId(null)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Soru</p>
                  <p className="text-xl font-black">{detay.istatistik.soruSayisi}</p>
                </div>
                <div className="rounded-xl bg-violet-50 p-3">
                  <p className="text-[10px] font-bold text-violet-500 uppercase">AI soru</p>
                  <p className="text-xl font-black text-violet-700">{detay.istatistik.aiSoruSayisi}</p>
                </div>
              </div>

              {secili && (
                <div className="text-xs space-y-1 text-gray-600">
                  <p>
                    <span className="font-bold text-gray-800">Son aktivite:</span>{' '}
                    {tarihGoster(secili.sonAktivite)}
                  </p>
                  <p>
                    <span className="font-bold text-gray-800">Son soru:</span>{' '}
                    {tarihGoster(secili.sonSoruTarihi)}
                  </p>
                  <p>
                    <span className="font-bold text-gray-800">Kayıt:</span>{' '}
                    {tarihGoster(detay.ogretmen.kayitTarihi)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Son oturumlar</p>
                <div className="space-y-2 max-h-[140px] overflow-y-auto">
                  {detay.oturumlar.length === 0 ? (
                    <p className="text-xs text-gray-400">Henüz oturum kaydı yok (yeni girişlerden itibaren izlenir).</p>
                  ) : (
                    detay.oturumlar.map((o) => (
                      <div key={o.id} className="rounded-xl border border-gray-100 p-3 text-xs">
                        <p className="font-bold text-gray-800">{tarihGoster(o.baslangic)}</p>
                        <p className="text-gray-500 mt-0.5">
                          {o.sureMetin}
                          {o.acik ? ' · devam ediyor' : o.bitis ? ` · bitiş ${tarihGoster(o.bitis)}` : ''}
                        </p>
                        {o.ipAdresi && <p className="text-[10px] text-gray-400 mt-1">IP: {o.ipAdresi}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">İşlem geçmişi</p>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {detay.aktiviteler.length === 0 ? (
                    <p className="text-xs text-gray-400">Henüz işlem kaydı yok.</p>
                  ) : (
                    detay.aktiviteler.map((a) => (
                      <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-indigo-700">{turEtiket(a.tur)}</span>
                          <span className="text-[10px] text-gray-400">{tarihGoster(a.olusturuldu)}</span>
                        </div>
                        {a.aciklama && <p className="text-gray-600 mt-1">{a.aciklama}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
