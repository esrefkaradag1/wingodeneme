'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, usePathname } from 'next/navigation';
import { useMemo, useState, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, isSameDay, isSameMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { paketApi, sinavApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { kademeliSepetToplamHesapla, kademeEtiketi, type SinavSepetFiyatAyarlari } from '@/lib/sinavFiyatKademe';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { IyzicoCheckoutModal } from '@/components/payment/IyzicoCheckoutModal';
import { iyzicoOdemeBaslat } from '@/lib/iyzicoCheckout';
import { paketKategoriEtiket, paketKategoriRenk } from '@/lib/paketKategori';
import { toast } from '@/store/toast.store';
import { usePaketSepetStore } from '@/store/paket-sepet.store';
import { girisUrlWithReturn, kayitUrlWithReturn } from '@/lib/returnUrl';
import { erisimSonrasiYenile } from '@/lib/erisimYenile';

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
  ucretsiz?: boolean;
  herkeseAcik?: boolean;
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
  ucretsizSinavlar?: PaketSinav[];
  kademeliFiyatlandirma?: SinavSepetFiyatAyarlari;
};

const SINAV_LISTE_LIMIT = 8;

export default function PaketDetaySayfasi() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const id = params?.id;
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { paketId: sepetPaketId, seciliSinavIds: sepetIds, kaydet: sepetKaydet, temizle: sepetTemizle } =
    usePaketSepetStore();
  const sepetToastGosterildi = useRef(false);
  const [sepetHydrate, setSepetHydrate] = useState(false);

  /** Bu paket sayfası için seçili denemeler — tek kaynak: zustand sepet store */
  const seciliIds = useMemo(() => {
    if (!id || sepetPaketId !== id) return [];
    return sepetIds;
  }, [id, sepetPaketId, sepetIds]);
  const [takvimAy, setTakvimAy] = useState(new Date());
  const [ozelliklerAcik, setOzelliklerAcik] = useState(false);
  const [sinavListesiGenis, setSinavListesiGenis] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<string | null>(null);
  const [checkoutAltBaslik, setCheckoutAltBaslik] = useState<string | undefined>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['paket-detay', id],
    enabled: !!id,
    queryFn: () => paketApi.detay(id!),
    retry: false,
  });

  const paket: PaketDetay | null = data?.data?.veri || null;
  const sinavlar = paket?.sinavlar || [];
  const ucretsizSinavlar = paket?.ucretsizSinavlar || [];

  // Öğrencinin zaten erişimi olan sınavlar; satın alma seçiminden hariç tutulur.
  const { data: sahipSinavData } = useQuery({
    queryKey: ['sinavlar'],
    queryFn: () => sinavApi.liste(),
    enabled: !!token,
    staleTime: 60_000,
  });
  const sahipSet = useMemo(() => {
    const list = (sahipSinavData?.data?.veri || []) as Array<{ id: string }>;
    return new Set(list.map((s) => s.id));
  }, [sahipSinavData]);
  const paketUcretsiz = paket
    ? (paket.indirimliFiyat != null && paket.indirimliFiyat > 0 ? paket.indirimliFiyat : paket.fiyat) <= 0
    : false;

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

  const geriDonusYolu = id ? `/paket/${id}` : pathname || '/paketler';

  useEffect(() => {
    if (usePaketSepetStore.persist.hasHydrated()) {
      setSepetHydrate(true);
      return;
    }
    return usePaketSepetStore.persist.onFinishHydration(() => setSepetHydrate(true));
  }, []);

  // Giriş/kayıt sonrası kayıtlı sepet bildirimi (bir kez)
  useEffect(() => {
    if (!sepetHydrate || sepetToastGosterildi.current || !id) return;
    if (sepetPaketId === id && sepetIds.length > 0) {
      sepetToastGosterildi.current = true;
      toast.basarili(
        'Sepetiniz yüklendi',
        `${sepetIds.length} deneme seçiminiz korundu. Satın almaya devam edebilirsiniz.`
      );
    }
  }, [sepetHydrate, id, sepetPaketId, sepetIds.length]);

  // Paket adı yüklendiğinde sepet meta güncelle
  useEffect(() => {
    if (!id || !paket?.ad) return;
    const state = usePaketSepetStore.getState();
    if (state.paketId !== id || state.seciliSinavIds.length === 0) return;
    if (state.paketAd !== paket.ad) {
      sepetKaydet(id, state.seciliSinavIds, paket.ad);
    }
  }, [id, paket?.ad, sepetKaydet]);

  const satinAlMutation = useMutation({
    mutationFn: (sinavIds: string[]) =>
      paketApi.seciliSinavlariSatinAl(id!, { sinavIds, odemeYontemi: 'KREDI_KARTI' }),
    onSuccess: (res) => {
      const data = res?.data?.veri;
      const adet = data?.adet ?? seciliIds.length;
      setCheckoutAltBaslik(
        adet > 1 ? `${paket?.ad} · ${adet} deneme` : `${paket?.ad} · 1 deneme`
      );
      const acildi = iyzicoOdemeBaslat(data, setCheckoutForm);
      if (acildi) {
        sepetTemizle();
        queryClient.invalidateQueries({ queryKey: ['paket-detay', id] });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['paket-detay', id] });
      sepetTemizle();
      // Ücretsiz denemeler backend'de otomatik tanımlandı (ödeme yok).
      if (data?.ucretsiz || data?.toplamTutar === 0) {
        erisimSonrasiYenile(queryClient);
        toast.basarili(
          adet > 1
            ? `${adet} ücretsiz deneme hesabınıza tanımlandı. Hemen çözebilirsiniz.`
            : 'Ücretsiz deneme hesabınıza tanımlandı. Hemen çözebilirsiniz.'
        );
        return;
      }
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
      const data = response.data.veri;
      setCheckoutAltBaslik(paket?.ad);
      const acildi = iyzicoOdemeBaslat(data, setCheckoutForm);
      if (!acildi) {
        if (data?.ucretsiz) {
          queryClient.invalidateQueries({ queryKey: ['paket-detay', id] });
          erisimSonrasiYenile(queryClient);
          sepetTemizle();
          toast.basarili('Ücretsiz paket hesabınıza tanımlandı. Denemelere hemen erişebilirsiniz.');
          return;
        }
        toast.basarili('Siparişiniz oluşturuldu.');
      } else {
        sepetTemizle();
      }
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Paket satın alma başarısız';
      toast.hata(String(mesaj));
    },
  });

  const seciliSinavlar = useMemo(
    () => sinavlar.filter((s) => satinAlIds.includes(s.id) && s.gosterilenFiyat != null),
    [sinavlar, satinAlIds]
  );

  const listeToplam = useMemo(
    () => seciliSinavlar.reduce((toplam, sinav) => toplam + (sinav.gosterilenFiyat || 0), 0),
    [seciliSinavlar]
  );
  const kademeSonuc = useMemo(
    () => kademeliSepetToplamHesapla(seciliSinavlar.length, listeToplam, paket?.kademeliFiyatlandirma),
    [seciliSinavlar.length, listeToplam, paket?.kademeliFiyatlandirma]
  );

  const secimGuncelle = (yeniIds: string[]) => {
    if (!id) return;
    sepetKaydet(id, yeniIds, paket?.ad);
  };

  const toggleSecim = (s: PaketSinav) => {
    if (s.gosterilenFiyat == null || s.satinAlinabilir === false) return;
    if (sahipSet.has(s.id)) return; // zaten erişim var
    const mevcut = sepetPaketId === id ? sepetIds : [];
    const yeni = mevcut.includes(s.id) ? mevcut.filter((x) => x !== s.id) : [...mevcut, s.id];
    secimGuncelle(yeni);
  };

  const tumunuSec = () => {
    const ids = aylikSinavlar
      .filter((s) => s.gosterilenFiyat != null && s.satinAlinabilir !== false && !sahipSet.has(s.id))
      .map((s) => s.id);
    secimGuncelle(ids);
  };

  // Sahip olunan sınavlar seçimden düşürülür; yalnızca alınabilir olanlar satın alınır.
  const satinAlIds = useMemo(
    () => seciliIds.filter((sid) => !sahipSet.has(sid)),
    [seciliIds, sahipSet]
  );

  const sepetiTemizle = () => {
    sepetTemizle();
  };

  const sinavSatiri = (s: PaketSinav) => {
    const sahip = sahipSet.has(s.id);
    const secili = seciliIds.includes(s.id) && !sahip;
    const fiyatYok = s.gosterilenFiyat == null;
    const satinAlinamaz = s.satinAlinabilir === false;
    const devreDisi = fiyatYok || satinAlinamaz || sahip;

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
              {sahip && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200">
                  Sahipsiniz
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
            {sahip ? (
              <span className="text-xs font-bold text-indigo-300">Erişiminiz var</span>
            ) : fiyatYok ? (
              <span className="text-xs text-slate-500">Fiyat yok</span>
            ) : satinAlinamaz ? (
              <span className="text-xs text-slate-500">Satış kapalı</span>
            ) : s.gosterilenFiyat === 0 ? (
              <p className="text-lg font-black text-emerald-400">Ücretsiz</p>
            ) : (
              <>
                <p className="text-lg font-black text-emerald-400">
                  {s.gosterilenFiyat!.toLocaleString('tr-TR')} ₺
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ucretsizSinavKart = (s: PaketSinav) => (
    <div
      key={s.id}
      className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-emerald-300">{s.tur}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200">
              Herkese Acik
            </span>
          </div>
          <p className="text-white font-bold mt-1">{s.baslik}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-emerald-100/75 mt-1.5">
            {s.grup?.ad && <span>{s.grup.ad}</span>}
            <span>{format(new Date(s.baslangicZamani), 'd MMM yyyy HH:mm', { locale: tr })}</span>
            <span>{s.sureDakika} dk</span>
            {s.soruSayisi != null && <span>{s.soruSayisi} soru</span>}
          </div>
          <p className="text-xs text-emerald-100/80 mt-2">
            Paket satin almadan gorulebilir. Cozmek icin giris yapmaniz yeterlidir.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black text-emerald-300">Ucretsiz</p>
        </div>
      </div>
    </div>
  );

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
                  {ucretsizSinavlar.length > 0 && (
                    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 md:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-white">Herkese acik tanitim sinavlari</h2>
                          <p className="text-sm text-emerald-100/80 mt-1">
                            Bu denemelere paket satin almadan ulasilabilir.
                          </p>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wide text-emerald-200">
                          {ucretsizSinavlar.length} ucretsiz deneme
                        </span>
                      </div>
                      <div className="space-y-2">
                        {ucretsizSinavlar.map((sinav) => ucretsizSinavKart(sinav))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      Paket icindeki denemeler
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
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-white font-bold text-lg">Satın alma</h3>
                      {satinAlIds.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 px-2.5 py-1 text-xs font-bold text-indigo-100">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Sepet · {satinAlIds.length}
                        </span>
                      )}
                    </div>

                    {satinAlIds.length > 0 ? (
                      <>
                        <ul className="space-y-2 max-h-40 overflow-y-auto text-sm">
                          {seciliSinavlar.map((u) => (
                            <li key={u.id} className="flex justify-between gap-2 text-slate-200">
                              <span className="line-clamp-1 flex-1">{u.baslik}</span>
                              <span className="font-bold shrink-0">
                                {u.gosterilenFiyat === 0
                                  ? 'Ücretsiz'
                                  : `${u.gosterilenFiyat?.toLocaleString('tr-TR')} ₺`}
                              </span>
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
                            {kademeSonuc.toplam === 0
                              ? 'Ücretsiz'
                              : `${kademeSonuc.toplam.toLocaleString('tr-TR')} ₺`}
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
                            {kademeSonuc.toplam === 0
                              ? satinAlIds.length > 1
                                ? `${satinAlIds.length} Ücretsiz Denemeyi Edin`
                                : 'Ücretsiz Denemeyi Edin'
                              : satinAlIds.length > 1
                                ? `${satinAlIds.length} Denemeyi Satın Al · Ödeme`
                                : 'Seçili Denemeyi Satın Al · Ödeme'}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <Link
                              href={girisUrlWithReturn(geriDonusYolu)}
                              className="w-full inline-flex items-center justify-center rounded-2xl py-3.5 font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                              Satın almak için giriş yap
                            </Link>
                            <Link
                              href={kayitUrlWithReturn(geriDonusYolu)}
                              className="w-full inline-flex items-center justify-center rounded-2xl py-3 font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 text-sm"
                            >
                              Hesabınız yok mu? Üye olun
                            </Link>
                            <p className="text-[11px] text-center text-slate-400">
                              Seçtiğiniz {satinAlIds.length} deneme sepetinizde saklanır; girişten sonra buraya dönersiniz.
                            </p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={sepetiTemizle}
                          className="w-full text-center text-xs font-bold text-slate-400 hover:text-red-300"
                        >
                          Seçimi temizle
                        </button>
                      </>
                    ) : (
                      <p className="text-indigo-100/80 text-sm">
                        Listeden deneme seçin. Ücretsiz denemeler seçildiğinde ödeme olmadan hesabınıza tanımlanır; ücretli seçimlerde varsa kademeli indirim uygulanır.
                      </p>
                    )}

                    {paket.kademeliFiyatlandirma?.aktif && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">
                          Paket ici fiyat kurallari
                        </p>
                        {paket.kademeliFiyatlandirma.tekDenemeFiyati > 0 && (
                          <p className="text-sm text-slate-200">
                            Tekil sinav fiyati: <strong>{paket.kademeliFiyatlandirma.tekDenemeFiyati.toLocaleString('tr-TR')} ₺</strong>
                          </p>
                        )}
                        {paket.kademeliFiyatlandirma.kademeler.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {paket.kademeliFiyatlandirma.kademeler.map((kademe) => (
                              <span
                                key={`${kademe.minAdet}-${kademe.indirimYuzde}`}
                                className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200"
                              >
                                {kademeEtiketi(kademe)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-300">Kademe yoksa secilen denemeler liste fiyatindan hesaplanir.</p>
                        )}
                      </div>
                    )}

                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">
                        veya tüm paket
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">
                          {paketUcretsiz
                            ? 'Ücretsiz'
                            : `${(paket.indirimliFiyat ?? paket.fiyat).toLocaleString('tr-TR')} ₺`}
                        </span>
                        {!paketUcretsiz && paket.indirimliFiyat != null && (
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
                          {paketUcretsiz ? 'Tüm Paketi Ücretsiz Al' : 'Tüm Paketi Satın Al'}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <Link
                            href={girisUrlWithReturn(geriDonusYolu)}
                            className="w-full inline-flex items-center justify-center rounded-2xl py-3 font-bold bg-white/10 text-white border border-white/15"
                          >
                            Paket için giriş yap
                          </Link>
                          <Link
                            href={kayitUrlWithReturn(geriDonusYolu)}
                            className="w-full inline-flex items-center justify-center rounded-2xl py-2.5 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
                          >
                            Üye ol
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <IyzicoCheckoutModal
        open={Boolean(checkoutForm)}
        checkoutForm={checkoutForm}
        subtitle={checkoutAltBaslik ?? paket?.ad}
        onClose={() => setCheckoutForm(null)}
      />
    </MarketingShell>
  );
}
