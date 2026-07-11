'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicApi, sinavApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Bell,
  Zap,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from '@/store/toast.store';
import { useSinavSepetStore, sepetToplamTutar, type SepetSinav } from '@/store/sinav-sepet.store';
import { kademeliSepetToplamHesapla, type SinavSepetFiyatAyarlari } from '@/lib/sinavFiyatKademe';
import { erisimSonrasiYenile } from '@/lib/erisimYenile';
import {
  ShoppingBag,
  Trash2,
  Plus,
} from 'lucide-react';

type TakvimSinav = {
  id: string;
  baslik: string;
  aciklama?: string | null;
  tur: string;
  baslangicZamani: string;
  bitisZamani: string;
  sureDakika: number;
  soruSayisi?: number;
  ucret?: number | null;
  indirimliUcret?: number | null;
  gosterilenFiyat?: number | null;
  satinAlinabilir: boolean;
  erisimVar: boolean;
  bekleyenSatinAlim: boolean;
  durum: string;
  grup?: { ad: string };
};

function sepeteEklenebilir(s: TakvimSinav) {
  return !s.erisimVar && !s.bekleyenSatinAlim && s.satinAlinabilir && s.gosterilenFiyat != null;
}

function sinaviSepetUrununeCevir(s: TakvimSinav): SepetSinav {
  return {
    id: s.id,
    baslik: s.baslik,
    tur: s.tur,
    baslangicZamani: s.baslangicZamani,
    gosterilenFiyat: s.gosterilenFiyat!,
  };
}

export default function TakvimSayfasi() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const { urunler, ekle, cikar, temizle, sepetteMi } = useSinavSepetStore();
  const [sepetAcik, setSepetAcik] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [seciliSinav, setSeciliSinav] = useState<TakvimSinav | null>(null);

  const yil = currentDate.getFullYear();
  const ay = currentDate.getMonth() + 1;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sinavlar-takvim', yil, ay, token ? 'auth' : 'public'],
    queryFn: async () => {
      if (token) {
        try {
          return await sinavApi.takvim({ yil, ay });
        } catch {
          /* oturum süresi dolmuş olabilir — public listeye düş */
        }
      }
      return publicApi.sinavTakvim({ yil, ay });
    },
    retry: 1,
  });

  const { data: fiyatKademeRes } = useQuery({
    queryKey: ['sinav-fiyat-kademeleri'],
    queryFn: () => sinavApi.fiyatKademeleri(),
  });
  const fiyatAyarlari = fiyatKademeRes?.data?.veri as SinavSepetFiyatAyarlari | undefined;

  const sinavlar = (data?.data?.veri || []) as TakvimSinav[];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const satinAlMutation = useMutation({
    mutationFn: (sinavIds: string[]) => sinavApi.sepetSatinAl({ sinavIds }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sinavlar-takvim'] });
      erisimSonrasiYenile(queryClient);
      const veri = res?.data?.veri;
      const adet = veri?.adet ?? urunler.length;
      const hataSayisi = veri?.hatalar?.length ?? 0;
      temizle();
      setSepetAcik(false);
      setSeciliSinav(null);
      if (hataSayisi > 0) {
        toast.uyari(`${adet} sipariş oluşturuldu, ${hataSayisi} sınav atlanamadı.`);
      } else {
        toast.basarili(
          adet > 1
            ? `${adet} sınav için siparişiniz alındı. Ödeme onayından sonra erişebilirsiniz.`
            : 'Siparişiniz alındı. Ödeme onayından sonra sınava erişebilirsiniz.'
        );
      }
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'Satın alma başarısız';
      toast.hata(String(mesaj));
    },
  });

  const sepeteEkle = (s: TakvimSinav) => {
    if (!sepeteEklenebilir(s)) return;
    ekle(sinaviSepetUrununeCevir(s));
    toast.basarili(`«${s.baslik}» sepete eklendi`);
    setSepetAcik(true);
  };

  const sepetListeToplam = sepetToplamTutar(urunler);
  const sepetKademe = useMemo(
    () => kademeliSepetToplamHesapla(urunler.length, sepetListeToplam, fiyatAyarlari),
    [urunler.length, sepetListeToplam, fiyatAyarlari]
  );
  const sepetToplam = sepetKademe.toplam;

  const getDayEvents = (day: Date) =>
    sinavlar.filter((s) => isSameDay(new Date(s.baslangicZamani), day));

  const yaklasanlar = useMemo(
    () =>
      [...sinavlar]
        .filter((s) => new Date(s.baslangicZamani) >= new Date())
        .sort((a, b) => new Date(a.baslangicZamani).getTime() - new Date(b.baslangicZamani).getTime())
        .slice(0, 4),
    [sinavlar]
  );

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase tracking-wider mb-3 border border-indigo-500/30">
              <CalendarIcon className="w-3 h-3" /> Sınav Ajandası
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Sınav Takvimi</h1>
            <p className="text-slate-400 mt-2 text-sm font-medium opacity-80 max-w-lg leading-relaxed">
              Önümüzdeki deneme oturumlarını görüntüleyin; erişiminiz yoksa satın alarak katılabilirsiniz.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSepetAcik(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Sepet
              {urunler.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
                  {urunler.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
            <button type="button" onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 text-sm font-bold min-w-[120px] text-center uppercase tracking-widest">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </span>
            <button type="button" onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          <div className="card !p-0 overflow-hidden shadow-xl border-white ring-1 ring-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
                    <div key={d} className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    const events = getDayEvents(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTdy = isToday(day);

                    return (
                      <div
                        key={i}
                        className={`min-h-[100px] p-2 border-r border-b border-gray-50 transition-colors hover:bg-indigo-50/30 ${!isCurrentMonth ? 'opacity-20' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-lg ${isTdy ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-900'}`}>
                            {format(day, 'd')}
                          </span>
                          {events.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                        </div>
                        <div className="space-y-1">
                          {events.slice(0, 2).map((e) => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => setSeciliSinav(e)}
                              className="w-full text-left px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 truncate shadow-sm hover:bg-indigo-100"
                            >
                              {e.baslik}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="xl:col-span-4 space-y-6">
          <div className="card !p-6 shadow-xl border-white bg-white/80">
            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> Yaklaşan Oturumlar
            </h3>
            <div className="space-y-4">
              {yaklasanlar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeciliSinav(s)}
                  className="w-full text-left p-4 rounded-xl bg-gray-50 border border-gray-100 group cursor-pointer hover:border-indigo-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{s.tur}</span>
                    <span className="text-[9px] font-bold text-gray-400">{format(new Date(s.baslangicZamani), 'd MMM', { locale: tr })}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{s.baslik}</h4>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                      <Clock className="w-3 h-3 text-indigo-400" /> {s.sureDakika} Dakika
                    </div>
                    {s.soruSayisi != null && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                        <Zap className="w-3 h-3 text-indigo-400" /> {s.soruSayisi} Soru
                      </div>
                    )}
                    {s.gosterilenFiyat != null && (
                      <span className="text-[9px] font-bold text-emerald-600">
                        {s.gosterilenFiyat > 0 ? `${s.gosterilenFiyat.toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {!isLoading && sinavlar.length === 0 && (
                <p className="text-center py-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {isError ? 'Takvim yüklenemedi' : 'Planlı Sınav Yok'}
                </p>
              )}
            </div>
          </div>

          {urunler.length > 0 && (
            <div className="card !p-5 shadow-xl border-indigo-100 bg-indigo-50/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" /> Sepetiniz
                </h3>
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  {urunler.length}
                </span>
              </div>
              <ul className="space-y-2 mb-3">
                {urunler.slice(0, 3).map((u) => (
                  <li key={u.id} className="text-xs font-semibold text-gray-700 line-clamp-1">{u.baslik}</li>
                ))}
                {urunler.length > 3 && (
                  <li className="text-[10px] text-gray-500">+{urunler.length - 3} sınav daha</li>
                )}
              </ul>
              <div className="flex items-center justify-between">
                <div>
                  {sepetKademe.indirim > 0 && (
                    <span className="text-xs text-gray-400 line-through block">
                      {sepetKademe.listeToplam.toLocaleString('tr-TR')} ₺
                    </span>
                  )}
                  <span className="text-sm font-black text-emerald-700">{sepetToplam.toLocaleString('tr-TR')} ₺</span>
                  {sepetKademe.kademe && (
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                      {sepetKademe.kademe.minAdet}+ deneme · %{sepetKademe.kademe.indirimYuzde} indirim
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSepetAcik(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Sepeti Aç →
                </button>
              </div>
            </div>
          )}

          <div className="card p-6 border-white bg-white/80">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-indigo-500" /> Hatırlatıcılar
            </h3>
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
              <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wider">Haftalık Hedef</p>
              <p className="text-[11px] font-semibold text-amber-900 mt-1">Bu ay toplam 12 deneme çözme hedefin var. Şu an 4/12 seviyesindesin.</p>
            </div>
          </div>
        </aside>
      </div>

      {seciliSinav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start gap-4">
              <div>
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{seciliSinav.tur}</span>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{seciliSinav.baslik}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(seciliSinav.baslangicZamani), 'd MMMM yyyy HH:mm', { locale: tr })}
                </p>
              </div>
              <button type="button" onClick={() => setSeciliSinav(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {seciliSinav.aciklama && <p className="text-sm text-gray-600">{seciliSinav.aciklama}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span>{seciliSinav.sureDakika} dk</span>
                {seciliSinav.soruSayisi != null && <span>{seciliSinav.soruSayisi} soru</span>}
                {seciliSinav.grup?.ad && <span>{seciliSinav.grup.ad}</span>}
              </div>
              {seciliSinav.gosterilenFiyat != null && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ücret</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {seciliSinav.gosterilenFiyat > 0 ? `${seciliSinav.gosterilenFiyat.toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                  </p>
                  {seciliSinav.gosterilenFiyat > 0 &&
                    seciliSinav.indirimliUcret != null &&
                    seciliSinav.ucret != null &&
                    seciliSinav.indirimliUcret < seciliSinav.ucret && (
                      <p className="text-xs text-gray-400 line-through mt-1">{seciliSinav.ucret.toLocaleString('tr-TR')} ₺</p>
                    )}
                </div>
              )}

              {seciliSinav.erisimVar ? (
                <Link href={`/sinavlar/${seciliSinav.id}`} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Sınava Git
                </Link>
              ) : seciliSinav.bekleyenSatinAlim ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center text-sm font-semibold text-amber-800">
                  Siparişiniz alındı — ödeme onayı bekleniyor
                </div>
              ) : sepeteEklenebilir(seciliSinav) ? (
                token ? (
                  <div className="space-y-2">
                    {sepetteMi(seciliSinav.id) ? (
                      <button
                        type="button"
                        onClick={() => cikar(seciliSinav.id)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold py-3"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Sepette — Çıkar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          sepeteEkle(seciliSinav);
                          setSeciliSinav(null);
                        }}
                        className="btn-primary w-full inline-flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Sepete Ekle
                      </button>
                    )}
                    {urunler.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSeciliSinav(null);
                          setSepetAcik(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                      >
                        <ShoppingBag className="w-4 h-4" /> Sepeti Gör ({urunler.length})
                      </button>
                    )}
                  </div>
                ) : (
                  <Link href="/giris" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                    Sepete eklemek için giriş yap
                  </Link>
                )
              ) : (
                <p className="text-center text-sm text-gray-500">Bu sınav şu an satışa açık değil.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {sepetAcik && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
            onClick={() => setSepetAcik(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-600" /> Sınav Sepeti
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">{urunler.length} sınav seçildi</p>
                </div>
                <button type="button" onClick={() => setSepetAcik(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {urunler.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-semibold">Sepetiniz boş</p>
                    <p className="text-xs mt-1">Takvimden sınav seçip sepete ekleyin</p>
                  </div>
                ) : (
                  urunler.map((u) => (
                    <div key={u.id} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-bold text-indigo-600 uppercase">{u.tur}</span>
                        <p className="text-sm font-bold text-gray-900 line-clamp-2 mt-0.5">{u.baslik}</p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {format(new Date(u.baslangicZamani), 'd MMM yyyy HH:mm', { locale: tr })}
                        </p>
                        <p className="text-sm font-black text-emerald-700 mt-2">
                          {u.gosterilenFiyat > 0 ? `${u.gosterilenFiyat.toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => cikar(u.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                        aria-label="Sepetten çıkar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Toplam</span>
                  <div className="text-right">
                    {sepetKademe.indirim > 0 && (
                      <span className="text-sm text-gray-400 line-through block">
                        {sepetKademe.listeToplam.toLocaleString('tr-TR')} ₺
                      </span>
                    )}
                    <span className="text-xl font-black text-gray-900">
                      {sepetToplam > 0 ? `${sepetToplam.toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                    </span>
                    {sepetKademe.indirim > 0 && (
                      <span className="text-xs text-emerald-600 font-bold block mt-0.5">
                        {sepetKademe.indirim.toLocaleString('tr-TR')} ₺ tasarruf
                      </span>
                    )}
                  </div>
                </div>
                {urunler.length > 0 && (
                  <>
                    {token ? (
                      <button
                        type="button"
                        onClick={() => satinAlMutation.mutate(urunler.map((u) => u.id))}
                        disabled={satinAlMutation.isPending}
                        className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3"
                      >
                        {satinAlMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4" />
                        )}
                        {sepetToplam <= 0
                          ? urunler.length > 1
                            ? `${urunler.length} Sınavı Ücretsiz Al`
                            : 'Ücretsiz Al'
                          : urunler.length > 1
                            ? `${urunler.length} Sınavı Satın Al`
                            : 'Satın Al'}
                      </button>
                    ) : (
                      <Link href="/giris" className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3">
                        Satın almak için giriş yap
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => temizle()}
                      className="w-full text-center text-xs font-bold text-gray-400 hover:text-red-500 py-1"
                    >
                      Sepeti Temizle
                    </button>
                  </>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
