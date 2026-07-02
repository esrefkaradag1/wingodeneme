'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, isSameDay, isSameMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { paketApi, sinavApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useSinavSepetStore, sepetToplamTutar, type SepetSinav } from '@/store/sinav-sepet.store';
import { kademeliSepetToplamHesapla, type SinavSepetFiyatAyarlari } from '@/lib/sinavFiyatKademe';
import {
  Check,
  Loader2,
  Star,
  ArrowLeft,
  Calendar,
  Clock,
  ShoppingCart,
  ShoppingBag,
  CheckCircle2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { paketKategoriEtiket, paketKategoriRenk } from '@/lib/paketKategori';
import { toast } from '@/store/toast.store';

type PaketSinav = {
  id: string;
  baslik: string;
  tur: string;
  baslangicZamani: string;
  bitisZamani: string;
  sureDakika: number;
  gosterilenFiyat: number | null;
  satinAlinabilir?: boolean;
  soruSayisi?: number;
  durum: string;
  grup?: { ad: string };
};

type PaketDetay = {
  id: string;
  ad: string;
  aciklama: string | null;
  kategori?: string;
  fiyat: number;
  indirimliFiyat: number | null;
  sinavSayisi: number;
  ozellikler: string[];
  populer: boolean;
  sinavlar?: PaketSinav[];
};

function sinaviSepetUrununeCevir(s: PaketSinav): SepetSinav {
  return {
    id: s.id,
    baslik: s.baslik,
    tur: s.tur,
    baslangicZamani: s.baslangicZamani,
    gosterilenFiyat: s.gosterilenFiyat!,
  };
}

const SINAV_LISTE_LIMIT = 8;

export default function PaketDetaySayfasi() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { urunler, ekle, cikar, temizle, sepetteMi } = useSinavSepetStore();
  const [seciliIds, setSeciliIds] = useState<string[]>([]);
  const [takvimAy, setTakvimAy] = useState(new Date());
  const [ozelliklerAcik, setOzelliklerAcik] = useState(false);
  const [sinavListesiGenis, setSinavListesiGenis] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['paket-detay', id],
    enabled: !!id,
    queryFn: () => paketApi.detay(id!),
    retry: false,
  });

  const { data: fiyatKademeRes } = useQuery({
    queryKey: ['sinav-fiyat-kademeleri'],
    queryFn: () => sinavApi.fiyatKademeleri(),
  });
  const fiyatAyarlari = fiyatKademeRes?.data?.veri as SinavSepetFiyatAyarlari | undefined;

  const paket: PaketDetay | null = data?.data?.veri || null;
  const sinavlar = paket?.sinavlar || [];

  const ozelliklerKatlanabilir = useMemo(() => {
    if (!paket?.ozellikler?.length) return false;
    return (
      paket.ozellikler.length > 3 ||
      paket.ozellikler.some((o) => o.length > 100)
    );
  }, [paket?.ozellikler]);

  const aylikSinavlar = useMemo(() => {
    const bas = startOfMonth(takvimAy);
    const son = endOfMonth(takvimAy);
    return sinavlar
      .filter((s) => {
        const d = new Date(s.baslangicZamani);
        return isWithinInterval(d, { start: bas, end: son });
      })
      .sort(
        (a, b) =>
          new Date(a.baslangicZamani).getTime() - new Date(b.baslangicZamani).getTime()
      );
  }, [sinavlar, takvimAy]);

  const aylarOzeti = useMemo(() => {
    const map = new Map<string, { date: Date; count: number }>();
    for (const s of sinavlar) {
      const ayBas = startOfMonth(new Date(s.baslangicZamani));
      const key = format(ayBas, 'yyyy-MM');
      const mevcut = map.get(key);
      if (mevcut) mevcut.count += 1;
      else map.set(key, { date: ayBas, count: 1 });
    }
    return [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [sinavlar]);

  const gunlereGore = useMemo(() => {
    const gruplar: { tarih: Date; sinavlar: PaketSinav[] }[] = [];
    for (const s of aylikSinavlar) {
      const d = new Date(s.baslangicZamani);
      const son = gruplar[gruplar.length - 1];
      if (son && isSameDay(son.tarih, d)) son.sinavlar.push(s);
      else gruplar.push({ tarih: d, sinavlar: [s] });
    }
    return gruplar;
  }, [aylikSinavlar]);

  const gorunenGunGruplari = useMemo(() => {
    if (sinavListesiGenis || aylikSinavlar.length <= SINAV_LISTE_LIMIT) return gunlereGore;
    let sayac = 0;
    const sonuc: { tarih: Date; sinavlar: PaketSinav[] }[] = [];
    for (const grup of gunlereGore) {
      if (sayac >= SINAV_LISTE_LIMIT) break;
      const kalan = SINAV_LISTE_LIMIT - sayac;
      if (grup.sinavlar.length <= kalan) {
        sonuc.push(grup);
        sayac += grup.sinavlar.length;
      } else {
        sonuc.push({ tarih: grup.tarih, sinavlar: grup.sinavlar.slice(0, kalan) });
        sayac += kalan;
      }
    }
    return sonuc;
  }, [gunlereGore, sinavListesiGenis, aylikSinavlar.length]);

  const buAySeciliSayisi = useMemo(
    () => seciliIds.filter((id) => aylikSinavlar.some((s) => s.id === id)).length,
    [seciliIds, aylikSinavlar]
  );

  useEffect(() => {
    if (sinavlar.length === 0) return;
    const bas = startOfMonth(takvimAy);
    const son = endOfMonth(takvimAy);
    const buAyda = sinavlar.some((s) =>
      isWithinInterval(new Date(s.baslangicZamani), { start: bas, end: son })
    );
    if (buAyda) return;
    const gelecek = sinavlar.find((s) => new Date(s.baslangicZamani) >= new Date());
    if (gelecek) setTakvimAy(startOfMonth(new Date(gelecek.baslangicZamani)));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sinavlar yüklendiğinde bir kez ay hizala
  }, [sinavlar]);

  useEffect(() => {
    setSinavListesiGenis(false);
  }, [takvimAy]);

  const satinAlMutation = useMutation({
    mutationFn: (sinavIds: string[]) => sinavApi.sepetSatinAl({ sinavIds }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['paket-detay', id] });
      const adet = res?.data?.veri?.adet ?? seciliIds.length;
      temizle();
      setSeciliIds([]);
      toast.basarili(
        adet > 1
          ? `${adet} deneme için siparişiniz alındı. Ödeme onayından sonra erişebilirsiniz.`
          : 'Siparişiniz alındı. Ödeme onayından sonra sınava erişebilirsiniz.'
      );
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Satın alma başarısız';
      toast.hata(String(mesaj));
    },
  });

  const paketSatinAlMutation = useMutation({
    mutationFn: () => paketApi.satinAl({ paketId: id!, odemeYontemi: 'KREDI_KARTI' }),
    onSuccess: (response) => {
      const checkout = response.data.veri?.checkoutFormContent;
      if (checkout) {
        const container = document.getElementById('iyzico-form-container');
        if (container) {
          container.innerHTML = checkout;
          const form = container.querySelector('form');
          form?.submit();
        }
      } else {
        toast.basarili('Siparişiniz oluşturuldu.');
      }
    },
    onError: () => toast.hata('Paket satın alma başarısız'),
  });

  const seciliSinavlar = useMemo(
    () => sinavlar.filter((s) => seciliIds.includes(s.id) && s.gosterilenFiyat != null),
    [sinavlar, seciliIds]
  );

  const sepetUrunleri: SepetSinav[] = useMemo(() => {
    const fromSecim = seciliSinavlar.map(sinaviSepetUrununeCevir);
    if (fromSecim.length > 0) return fromSecim;
    return urunler.filter((u) => sinavlar.some((s) => s.id === u.id));
  }, [seciliSinavlar, urunler, sinavlar]);

  const listeToplam = sepetToplamTutar(sepetUrunleri);
  const kademeSonuc = useMemo(
    () => kademeliSepetToplamHesapla(sepetUrunleri.length, listeToplam, fiyatAyarlari),
    [sepetUrunleri.length, listeToplam, fiyatAyarlari]
  );

  const toggleSecim = (s: PaketSinav) => {
    if (!s.gosterilenFiyat || s.satinAlinabilir === false) return;
    setSeciliIds((prev) =>
      prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
    );
  };

  const tumunuSec = () => {
    const ids = aylikSinavlar
      .filter((s) => s.gosterilenFiyat != null && s.satinAlinabilir !== false)
      .map((s) => s.id);
    setSeciliIds(ids);
  };

  const sepeteEkle = (s: PaketSinav) => {
    if (!s.gosterilenFiyat) return;
    ekle(sinaviSepetUrununeCevir(s));
    toast.basarili(`«${s.baslik}» sepete eklendi`);
  };

  const satinAlIds =
    seciliIds.length > 0 ? seciliIds : sepetUrunleri.map((u) => u.id);

  const sinavSatiri = (s: PaketSinav) => {
    const secili = seciliIds.includes(s.id);
    const sepette = sepetteMi(s.id);
    const fiyatYok = s.gosterilenFiyat == null;
    const satinAlinamaz = s.satinAlinabilir === false;
    const devreDisi = fiyatYok || satinAlinamaz;

    return (
      <div
        key={s.id}
        className={`rounded-2xl border p-4 transition-all ${
          secili
            ? 'border-indigo-400/50 bg-indigo-500/10'
            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            disabled={devreDisi}
            onClick={() => toggleSecim(s)}
            className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
              secili ? 'bg-indigo-600 border-indigo-500' : 'border-white/30 bg-white/5'
            } ${devreDisi ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {secili && <Check className="w-3 h-3 text-white" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-indigo-300">{s.tur}</span>
              {s.durum === 'YAKINDA' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Yakında
                </span>
              )}
              {sepette && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200">
                  Sepette
                </span>
              )}
            </div>
            <p className="text-white font-bold mt-0.5">{s.baslik}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
              {s.grup?.ad && <span>{s.grup.ad}</span>}
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(s.baslangicZamani), 'HH:mm', { locale: tr })}
              </span>
              <span className="inline-flex items-center gap-1">
                {s.sureDakika} dk
              </span>
              {s.soruSayisi != null && <span>{s.soruSayisi} soru</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            {fiyatYok ? (
              <span className="text-xs text-slate-500">Fiyat yok</span>
            ) : satinAlinamaz ? (
              <span className="text-xs text-slate-500">Satış kapalı</span>
            ) : (
              <>
                <p className="text-lg font-black text-emerald-400">
                  {s.gosterilenFiyat!.toLocaleString('tr-TR')} ₺
                </p>
                {!sepette && (
                  <button
                    type="button"
                    onClick={() => sepeteEkle(s)}
                    className="mt-1 text-[10px] font-bold text-indigo-300 hover:text-white inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Sepete
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <MarketingShell>
      <div className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-20 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap pt-6 md:pt-8 mb-8">
            <Link
              href="/paketler"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Tüm paketlere dön
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
            </div>
          ) : isError || !paket ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-10 text-center max-w-lg mx-auto">
              <p className="text-white font-semibold">Paket bulunamadı</p>
              <p className="text-slate-400 text-sm mt-1">
                Paket pasif olabilir veya kaldırılmış olabilir. Yönetici panelinden paketi «Satışa Açık» yapın.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/paketler"
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                >
                  Tüm paketler
                </Link>
                <Link
                  href="/takvim"
                  className="px-5 py-3 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 font-semibold transition-colors"
                >
                  Sınav takvimi
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Paket başlık */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-sm p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${paketKategoriRenk(paket.kategori)}`}>
                    {paketKategoriEtiket(paket.kategori)}
                  </span>
                  {paket.populer && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" /> Popüler
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{paket.ad}</h1>
                {paket.aciklama && (
                  <p className="text-slate-400 mt-3 leading-relaxed max-w-3xl text-justify hyphens-auto">
                    {paket.aciklama}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Deneme listesi */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      Sınav takvimi
                      {sinavlar.length > 0 && (
                        <span className="text-sm font-normal text-slate-400">
                          ({sinavlar.length} deneme)
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTakvimAy((d) => subMonths(d, 1))}
                        className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
                        aria-label="Önceki ay"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold text-white min-w-[120px] text-center capitalize">
                        {format(takvimAy, 'MMMM yyyy', { locale: tr })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTakvimAy((d) => addMonths(d, 1))}
                        className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
                        aria-label="Sonraki ay"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      {aylikSinavlar.length > 0 && (
                        <button
                          type="button"
                          onClick={tumunuSec}
                          className="text-xs font-bold text-indigo-300 hover:text-white ml-2"
                        >
                          Bu ayı seç
                        </button>
                      )}
                    </div>
                  </div>

                  {aylarOzeti.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                      {aylarOzeti.map(({ date, count }) => {
                        const aktif = isSameMonth(date, takvimAy);
                        return (
                          <button
                            key={format(date, 'yyyy-MM')}
                            type="button"
                            onClick={() => setTakvimAy(date)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                              aktif
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-white/[0.04] text-slate-300 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {format(date, 'MMM yyyy', { locale: tr })} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {sinavlar.length === 0 ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-center">
                      <p className="text-amber-100 font-semibold">Henüz satışa açık deneme yok</p>
                      <p className="text-amber-200/70 text-sm mt-2">
                        Pakete grup bağlayın ve sınav takviminde «Takvimde göster» ayarını açın.
                      </p>
                      <Link
                        href="/takvim"
                        className="inline-block mt-4 text-sm font-bold text-indigo-300 hover:text-white"
                      >
                        Genel sınav takvimine git →
                      </Link>
                    </div>
                  ) : aylikSinavlar.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                      <p className="text-slate-300 font-medium">
                        {format(takvimAy, 'MMMM yyyy', { locale: tr })} ayında deneme yok
                      </p>
                      <p className="text-slate-500 text-sm mt-2">Başka bir ay seçmeyi deneyin.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-2.5 text-xs">
                        <span className="text-slate-400">
                          <span className="text-white font-bold capitalize">
                            {format(takvimAy, 'MMMM yyyy', { locale: tr })}
                          </span>
                          {' · '}
                          <span className="text-white font-bold">{aylikSinavlar.length}</span> deneme
                          {buAySeciliSayisi > 0 && (
                            <>
                              {' · '}
                              <span className="text-indigo-300 font-bold">{buAySeciliSayisi} seçili</span>
                            </>
                          )}
                        </span>
                        {aylikSinavlar.length > SINAV_LISTE_LIMIT && (
                          <button
                            type="button"
                            onClick={() => setSinavListesiGenis((v) => !v)}
                            className="font-bold text-indigo-300 hover:text-white transition-colors"
                          >
                            {sinavListesiGenis
                              ? 'Daha az göster'
                              : `${aylikSinavlar.length - SINAV_LISTE_LIMIT} deneme daha`}
                          </button>
                        )}
                      </div>

                      <div
                        className={
                          sinavListesiGenis && aylikSinavlar.length > 12
                            ? 'max-h-[min(70vh,720px)] overflow-y-auto pr-1 space-y-4'
                            : 'space-y-4'
                        }
                      >
                        {gorunenGunGruplari.map((grup) => (
                          <div key={grup.tarih.toISOString()}>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                {format(grup.tarih, 'd MMMM yyyy, EEEE', { locale: tr })}
                              </span>
                              <div className="flex-1 h-px bg-white/[0.06]" />
                              <span className="text-[10px] font-bold text-slate-500">
                                {grup.sinavlar.length} deneme
                              </span>
                            </div>
                            <div className="space-y-2">
                              {grup.sinavlar.map((s) => sinavSatiri(s))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(paket.ozellikler) && paket.ozellikler.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
                      <h2 className="text-lg font-bold text-white mb-4">Paket özellikleri</h2>
                      <div className="relative">
                        <ul
                          className={`space-y-3 transition-[max-height] duration-300 ${
                            ozelliklerKatlanabilir && !ozelliklerAcik ? 'max-h-56 overflow-hidden' : ''
                          }`}
                        >
                          {paket.ozellikler.map((oz, idx) => (
                            <li
                              key={idx}
                              className="grid grid-cols-[1rem_1fr] gap-x-3 items-start text-sm text-slate-300"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="text-justify leading-relaxed hyphens-auto [text-align-last:left]">
                                {oz}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {!ozelliklerAcik && ozelliklerKatlanabilir && (
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a1024] via-[#0a1024]/90 to-transparent"
                            aria-hidden
                          />
                        )}
                      </div>
                      {ozelliklerKatlanabilir && (
                        <button
                          type="button"
                          onClick={() => setOzelliklerAcik((v) => !v)}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-300 hover:text-white transition-colors"
                        >
                          {ozelliklerAcik ? (
                            <>
                              Daha az göster
                              <ChevronDown className="w-4 h-4 rotate-180" />
                            </>
                          ) : (
                            <>
                              Devamını göster
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Satın alma özeti */}
                <div className="lg:col-span-1">
                  <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-b from-indigo-600/20 to-violet-600/10 backdrop-blur-sm p-6 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-5">
                    <h3 className="text-white font-bold text-lg">Satın alma</h3>

                    {sepetUrunleri.length > 0 ? (
                      <>
                        <ul className="space-y-2 max-h-40 overflow-y-auto text-sm">
                          {sepetUrunleri.map((u) => (
                            <li key={u.id} className="flex justify-between gap-2 text-slate-200">
                              <span className="line-clamp-1 flex-1">{u.baslik}</span>
                              <span className="font-bold shrink-0">{u.gosterilenFiyat.toLocaleString('tr-TR')} ₺</span>
                            </li>
                          ))}
                        </ul>
                        <div className="border-t border-white/10 pt-4">
                          {kademeSonuc.indirim > 0 && (
                            <p className="text-sm text-slate-400 line-through text-right">
                              {kademeSonuc.listeToplam.toLocaleString('tr-TR')} ₺
                            </p>
                          )}
                          <p className="text-2xl font-black text-white text-right">
                            {kademeSonuc.toplam.toLocaleString('tr-TR')} ₺
                          </p>
                          {kademeSonuc.indirim > 0 && (
                            <p className="text-xs text-emerald-300 text-right mt-1">
                              {kademeSonuc.indirim.toLocaleString('tr-TR')} ₺ indirim
                            </p>
                          )}
                        </div>
                        {token ? (
                          <button
                            type="button"
                            disabled={satinAlMutation.isPending || satinAlIds.length === 0}
                            onClick={() => satinAlMutation.mutate(satinAlIds)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                          >
                            {satinAlMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-4 h-4" />
                            )}
                            {satinAlIds.length > 1
                              ? `${satinAlIds.length} Denemeyi Satın Al`
                              : 'Seçili Denemeyi Satın Al'}
                          </button>
                        ) : (
                          <Link
                            href="/giris"
                            className="w-full inline-flex items-center justify-center rounded-2xl py-3.5 font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            Satın almak için giriş yap
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSeciliIds([]);
                            temizle();
                          }}
                          className="w-full text-center text-xs font-bold text-slate-400 hover:text-red-300"
                        >
                          Seçimi temizle
                        </button>
                      </>
                    ) : (
                      <p className="text-indigo-100/80 text-sm">
                        Listeden deneme seçin veya tek tek sepete ekleyin. Kademeli indirim otomatik uygulanır.
                      </p>
                    )}

                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">
                        veya tüm paket
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">
                          {(paket.indirimliFiyat ?? paket.fiyat).toLocaleString('tr-TR')} ₺
                        </span>
                        {paket.indirimliFiyat != null && (
                          <span className="text-slate-500 line-through">{paket.fiyat} ₺</span>
                        )}
                      </div>
                      {token ? (
                        <button
                          type="button"
                          onClick={() => paketSatinAlMutation.mutate()}
                          disabled={paketSatinAlMutation.isPending}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15"
                        >
                          {paketSatinAlMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShoppingBag className="w-4 h-4" />
                          )}
                          Tüm Paketi Satın Al
                        </button>
                      ) : (
                        <Link
                          href="/giris"
                          className="w-full inline-flex items-center justify-center rounded-2xl py-3 font-bold bg-white/10 text-white border border-white/15"
                        >
                          Paket için giriş yap
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div id="iyzico-form-container" className="hidden" />
    </MarketingShell>
  );
}
