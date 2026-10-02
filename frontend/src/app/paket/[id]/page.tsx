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
  ExternalLink,
  Users,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { IyzicoCheckoutModal } from '@/components/payment/IyzicoCheckoutModal';
import { HavaleSonucModal } from '@/components/payment/HavaleSonucModal';
import { OdemeYontemiSecici, type OdemeYontemi } from '@/components/payment/OdemeYontemiSecici';
import { iyzicoOdemeBaslat } from '@/lib/iyzicoCheckout';
import { paketKategoriEtiket, paketKategoriRenk } from '@/lib/paketKategori';
import { toast } from '@/store/toast.store';
import { IndirimKoduKutusu, type UygulananKod } from '@/components/odeme/IndirimKoduKutusu';
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
  katilimciSayisi?: number;
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
  disUrl?: string | null;
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
  /** Varsayılan: tüm paket. Müşteri isterse tek tek deneme seçer. */
  const [alisModu, setAlisModu] = useState<'paket' | 'secim'>('paket');
  const [checkoutForm, setCheckoutForm] = useState<string | null>(null);
  const [checkoutAltBaslik, setCheckoutAltBaslik] = useState<string | undefined>();
  const [odemeYontemi, setOdemeYontemi] = useState<OdemeYontemi>('KREDI_KARTI');
  const [indirimKodu, setIndirimKodu] = useState<UygulananKod | null>(null);
  const [havaleModal, setHavaleModal] = useState<{
    tutar?: number;
    referansNo?: string | null;
    siparisId?: string;
  } | null>(null);

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

  const ayHizalandi = useRef(false);
  useEffect(() => {
    if (ayHizalandi.current || sinavlar.length === 0) return;
    ayHizalandi.current = true;
    const simdi = new Date();
    const sirali = [...sinavlar].sort(
      (a, b) => new Date(a.baslangicZamani).getTime() - new Date(b.baslangicZamani).getTime()
    );
    const hedef =
      sirali.find((s) => new Date(s.baslangicZamani) >= simdi) ?? sirali[sirali.length - 1];
    if (!hedef) return;
    setTakvimAy(startOfMonth(new Date(hedef.baslangicZamani)));
  }, [sinavlar]);

  useEffect(() => {
    const anahtar = format(takvimAy, 'yyyy-MM');
    document.getElementById(`paket-ay-${anahtar}`)?.scrollIntoView({
      inline: 'nearest',
      block: 'nearest',
    });
  }, [takvimAy, aylarOzeti.length]);

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
      setAlisModu('secim');
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
      paketApi.seciliSinavlariSatinAl(id!, { sinavIds, odemeYontemi }),
    onSuccess: (res) => {
      const data = res?.data?.veri;
      const adet = data?.adet ?? seciliIds.length;
      setCheckoutAltBaslik(
        adet > 1 ? `${paket?.ad} · ${adet} deneme` : `${paket?.ad} · 1 deneme`
      );
      if (data?.odemeYontemi === 'HAVALE' || data?.havale) {
        sepetTemizle();
        queryClient.invalidateQueries({ queryKey: ['paket-detay', id] });
        const ana = data?.olusturulan?.[0];
        setHavaleModal({
          tutar: data.havale?.tutar ?? data?.toplamTutar,
          referansNo: ana?.referansNo,
          siparisId: ana?.id,
        });
        toast.basarili(
          adet > 1
            ? `${adet} deneme için havale siparişi oluşturuldu.`
            : 'Havale siparişiniz oluşturuldu.'
        );
        return;
      }
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
    mutationFn: () =>
      paketApi.satinAl({ paketId: id!, odemeYontemi, indirimKodu: indirimKodu?.kod }),
    onSuccess: (response) => {
      const data = response.data.veri;
      setCheckoutAltBaslik(paket?.ad);
      if (data?.odemeYontemi === 'HAVALE' || data?.havale) {
        sepetTemizle();
        queryClient.invalidateQueries({ queryKey: ['paket-detay', id] });
        setHavaleModal({
          tutar: data.havale?.tutar ?? data?.miktar,
          referansNo: data.referansNo,
          siparisId: data.id,
        });
        toast.basarili('Havale siparişiniz oluşturuldu.');
        return;
      }
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
    () =>
      sinavlar.filter(
        (s) => seciliIds.includes(s.id) && !sahipSet.has(s.id) && s.gosterilenFiyat != null
      ),
    [sinavlar, seciliIds, sahipSet]
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
    if (alisModu !== 'secim') setAlisModu('secim');
    if (s.gosterilenFiyat == null || s.satinAlinabilir === false) return;
    if (sahipSet.has(s.id)) return;
    const mevcut = sepetPaketId === id ? sepetIds : [];
    const yeni = mevcut.includes(s.id) ? mevcut.filter((x) => x !== s.id) : [...mevcut, s.id];
    secimGuncelle(yeni);
  };

  const tumunuSec = () => {
    setAlisModu('secim');
    const ids = aylikSinavlar
      .filter((s) => s.gosterilenFiyat != null && s.satinAlinabilir !== false && !sahipSet.has(s.id))
      .map((s) => s.id);
    secimGuncelle(ids);
  };

  const gunuTumunuSec = (day: Date) => {
    setAlisModu('secim');
    const eklenecek = aylikSinavlar
      .filter(
        (s) =>
          isSameDay(new Date(s.baslangicZamani), day) &&
          s.gosterilenFiyat != null &&
          s.satinAlinabilir !== false &&
          !sahipSet.has(s.id)
      )
      .map((s) => s.id);
    if (eklenecek.length === 0) return;
    const mevcut = sepetPaketId === id ? sepetIds : [];
    secimGuncelle(Array.from(new Set([...mevcut, ...eklenecek])));
  };

  const secimModunaGec = () => {
    setAlisModu('secim');
    document.getElementById('deneme-listesi')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const paketModunaDon = () => {
    sepetTemizle();
    setAlisModu('paket');
  };

  const paketFiyatNet = paket
    ? indirimKodu
      ? indirimKodu.netTutar
      : paket.indirimliFiyat ?? paket.fiyat
    : 0;
  const paketFiyatListe = paket?.fiyat ?? 0;

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
    const secimAktif = alisModu === 'secim';
    const tiklanabilir = secimAktif && !fiyatYok && !satinAlinamaz && !sahip;

    const fiyatMetin = sahip
      ? 'Var'
      : fiyatYok
        ? '—'
        : satinAlinamaz
          ? 'Kapalı'
          : s.gosterilenFiyat === 0
            ? 'Ücretsiz'
            : `${s.gosterilenFiyat!.toLocaleString('tr-TR')} ₺`;

    return (
      <button
        key={s.id}
        type="button"
        disabled={!tiklanabilir && secimAktif}
        onClick={() => {
          if (tiklanabilir) toggleSecim(s);
        }}
        className={`w-full text-left flex items-center gap-2.5 sm:gap-3 rounded-xl border px-3 py-2.5 transition-all ${
          secili
            ? 'border-wingo-400 bg-wingo-50 ring-1 ring-wingo-200'
            : 'border-edu-line bg-white hover:border-wingo-300 hover:bg-edu-mint/40'
        } ${secimAktif && !tiklanabilir ? 'opacity-55 cursor-default' : ''} ${tiklanabilir ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {secimAktif ? (
          <span
            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
              secili ? 'bg-wingo-600 border-wingo-600' : 'border-slate-300 bg-white'
            }`}
          >
            {secili && <Check className="w-3 h-3 text-white" />}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wide text-wingo-700 shrink-0">
              {s.tur}
            </span>
            <span className="font-bold text-sm text-edu-ink truncate">{s.baslik}</span>
            {s.durum === 'YAKINDA' && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Yakında
              </span>
            )}
            {sahip && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-wingo-100 text-wingo-700">
                Sahipsiniz
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[11px] text-edu-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(s.baslangicZamani), 'HH:mm', { locale: tr })}
            </span>
            <span>{s.sureDakika} dk</span>
            {s.katilimciSayisi != null && s.katilimciSayisi > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {s.katilimciSayisi.toLocaleString('tr-TR')}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 text-sm font-extrabold tabular-nums ${
            s.gosterilenFiyat === 0 && !sahip ? 'text-emerald-600' : 'text-edu-ink'
          }`}
        >
          {fiyatMetin}
        </span>
      </button>
    );
  };

  const ucretsizSinavKart = (s: PaketSinav) => (
    <div
      key={s.id}
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-emerald-700">{s.tur}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Herkese Acik
            </span>
          </div>
          <p className="text-edu-ink font-bold mt-1">{s.baslik}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-emerald-700/80 mt-1.5">
            {s.grup?.ad && <span>{s.grup.ad}</span>}
            <span>{format(new Date(s.baslangicZamani), 'd MMM yyyy HH:mm', { locale: tr })}</span>
            <span>{s.sureDakika} dk</span>
            {s.katilimciSayisi != null && s.katilimciSayisi > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {s.katilimciSayisi.toLocaleString('tr-TR')} kişi
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-700/80 mt-2">
            Paket satin almadan gorulebilir. Cozmek icin giris yapmaniz yeterlidir.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black text-emerald-700">Ucretsiz</p>
        </div>
      </div>
    </div>
  );

  const paketFiyatGoster = paketUcretsiz
    ? 'Ücretsiz'
    : `${paketFiyatNet.toLocaleString('tr-TR')} ₺`;

  const paketSatinAlButonu = token ? (
    <button
      type="button"
      onClick={() => paketSatinAlMutation.mutate()}
      disabled={paketSatinAlMutation.isPending}
      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold bg-edu-cta hover:bg-edu-cta-hover text-white shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
    >
      {paketSatinAlMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShoppingBag className="w-4 h-4" />
      )}
      {paketUcretsiz
        ? 'Ücretsiz paketi al'
        : odemeYontemi === 'HAVALE'
          ? 'Havale ile paketi al'
          : 'Tüm paketi satın al'}
    </button>
  ) : (
    <div className="space-y-2">
      <Link
        href={girisUrlWithReturn(geriDonusYolu)}
        className="w-full inline-flex items-center justify-center rounded-2xl py-3.5 font-extrabold bg-edu-cta hover:bg-edu-cta-hover text-white shadow-lg shadow-orange-500/25"
      >
        Giriş yap ve paketi al
      </Link>
      <Link
        href={kayitUrlWithReturn(geriDonusYolu)}
        className="w-full inline-flex items-center justify-center rounded-2xl py-2.5 text-sm font-semibold text-wingo-700 hover:text-wingo-800"
      >
        Hesabın yok mu? Ücretsiz üye ol
      </Link>
    </div>
  );

  return (
    <MarketingShell>
      <div className="flex-1 pb-28 lg:pb-20">
        {!isLoading && paket && !isError && !paket.disUrl && (
          <section className="relative overflow-hidden border-b border-edu-line">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -top-32 right-0 h-[28rem] w-[28rem] rounded-full bg-wingo-400/20 blur-[110px]" />
              <div className="absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-orange-300/15 blur-[100px]" />
            </div>
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-8 md:pb-10">
              <Link
                href="/paketler"
                className="inline-flex items-center gap-2 text-edu-muted hover:text-wingo-700 transition-colors text-sm font-semibold mb-5"
              >
                <ArrowLeft className="w-4 h-4" /> Tüm paketlere dön
              </Link>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${paketKategoriRenk(paket.kategori)}`}
                >
                  {paketKategoriEtiket(paket.kategori)}
                </span>
                {paket.populer && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-wingo-600 text-white text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" /> Popüler
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-white border border-edu-line px-3 py-1 text-xs font-bold text-edu-muted">
                  <Calendar className="w-3.5 h-3.5 text-wingo-600" />
                  {sinavlar.length || paket.sinavSayisi || 0} deneme
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold text-edu-ink tracking-tight leading-[1.1] max-w-3xl">
                {paket.ad}
              </h1>
              {paket.aciklama && (
                <p className="mt-3 max-w-2xl text-edu-muted text-sm md:text-base leading-relaxed line-clamp-3">
                  {paket.aciklama}
                </p>
              )}
            </div>
          </section>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {(isLoading || isError || !paket || paket.disUrl) && (
            <div className="pt-6 md:pt-8 mb-8">
              <Link
                href="/paketler"
                className="inline-flex items-center gap-2 text-edu-muted hover:text-edu-ink transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Tüm paketlere dön
              </Link>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-wingo-600" />
            </div>
          ) : isError || !paket ? (
            <div className="rounded-2xl border border-edu-line bg-white p-10 text-center max-w-lg mx-auto">
              <p className="text-edu-ink font-semibold">Paket bulunamadı</p>
              <p className="text-edu-muted text-sm mt-1">
                Paket pasif olabilir veya kaldırılmış olabilir.
              </p>
              <Link
                href="/paketler"
                className="inline-block mt-6 px-5 py-3 rounded-xl bg-wingo-600 hover:bg-wingo-700 text-white font-semibold"
              >
                Tüm paketler
              </Link>
            </div>
          ) : paket.disUrl ? (
            <div className="mx-auto max-w-lg rounded-3xl border border-orange-200 bg-orange-50 p-8 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-orange-700">Wingolink paketi</p>
              <h1 className="mt-3 text-2xl font-black text-edu-ink">{paket.ad}</h1>
              {paket.aciklama && <p className="mt-2 text-sm text-edu-muted">{paket.aciklama}</p>}
              <a
                href={paket.disUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white hover:bg-orange-600"
              >
                Wingolink&apos;te Satın Al
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-8 pt-8 md:pt-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4" id="deneme-listesi">
                  {ucretsizSinavlar.length > 0 && (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-edu-ink">Ücretsiz tanıtım denemeleri</h2>
                          <p className="text-sm text-emerald-700/80 mt-1">
                            Paket almadan giriş yaparak çözebilirsin.
                          </p>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                          {ucretsizSinavlar.length} ücretsiz
                        </span>
                      </div>
                      <div className="space-y-2">
                        {ucretsizSinavlar.map((sinav) => ucretsizSinavKart(sinav))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-edu-line bg-white overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-edu-line">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-edu-ink flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-wingo-600" />
                            {alisModu === 'secim' ? 'Deneme seç' : 'Paketteki denemeler'}
                          </h2>
                          <p className="text-sm text-edu-muted mt-1">
                            {alisModu === 'secim'
                              ? 'Satıra tıkla · ay veya günü toplu seç'
                              : `${sinavlar.length || paket.sinavSayisi || 0} deneme · tüm paketle hepsine eriş`}
                          </p>
                        </div>
                        {alisModu === 'paket' ? (
                          <button
                            type="button"
                            onClick={secimModunaGec}
                            className="text-xs font-bold text-wingo-700 hover:text-wingo-800 underline underline-offset-2"
                          >
                            Tek tek seçmek istiyorum
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={paketModunaDon}
                            className="text-xs font-bold text-edu-muted hover:text-edu-ink"
                          >
                            ← Tüm pakete dön
                          </button>
                        )}
                      </div>

                      {sinavlar.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                          {aylarOzeti.length > 0
                            ? aylarOzeti.map(({ date, count }) => {
                                const aktif = isSameMonth(date, takvimAy);
                                return (
                                  <button
                                    key={format(date, 'yyyy-MM')}
                                    type="button"
                                    id={`paket-ay-${format(date, 'yyyy-MM')}`}
                                    onClick={() => setTakvimAy(startOfMonth(date))}
                                    className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                      aktif
                                        ? 'bg-wingo-600 text-white border-wingo-600 shadow-sm'
                                        : 'bg-slate-50 text-slate-600 border-edu-line hover:border-wingo-300 hover:text-wingo-700'
                                    }`}
                                  >
                                    <span className="capitalize">
                                      {format(date, 'MMM yyyy', { locale: tr })}
                                    </span>
                                    <span className={`ml-1.5 ${aktif ? 'text-white/80' : 'text-edu-muted'}`}>
                                      {count}
                                    </span>
                                  </button>
                                );
                              })
                            : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setTakvimAy((d) => subMonths(d, 1))}
                                  className="p-2 rounded-lg border border-edu-line"
                                  aria-label="Önceki ay"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-bold capitalize px-2">
                                  {format(takvimAy, 'MMMM yyyy', { locale: tr })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setTakvimAy((d) => addMonths(d, 1))}
                                  className="p-2 rounded-lg border border-edu-line"
                                  aria-label="Sonraki ay"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {alisModu === 'secim' && aylikSinavlar.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-wingo-50/80 border-b border-wingo-100 text-xs">
                        <span className="font-semibold text-wingo-800">
                          {satinAlIds.length > 0
                            ? `${satinAlIds.length} deneme seçili`
                            : `${aylikSinavlar.length} deneme bu ayda`}
                          {buAySeciliSayisi > 0 && satinAlIds.length !== buAySeciliSayisi && (
                            <span className="text-edu-muted font-medium"> · bu ay {buAySeciliSayisi}</span>
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={tumunuSec}
                            className="font-bold text-wingo-700 hover:text-wingo-900"
                          >
                            Bu ayı seç
                          </button>
                          {satinAlIds.length > 0 && (
                            <button
                              type="button"
                              onClick={sepetiTemizle}
                              className="font-bold text-edu-muted hover:text-red-600"
                            >
                              Temizle
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-3 sm:p-4">
                      {sinavlar.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                          <p className="text-amber-900 font-semibold">Henüz satışa açık deneme yok</p>
                        </div>
                      ) : aylikSinavlar.length === 0 ? (
                        <div className="rounded-xl border border-edu-line bg-slate-50 p-8 text-center">
                          <p className="text-slate-600 font-medium">
                            {format(takvimAy, 'MMMM yyyy', { locale: tr })} ayında deneme yok
                          </p>
                        </div>
                      ) : (
                        <div
                          className={
                            alisModu === 'secim' || sinavListesiGenis
                              ? 'max-h-[min(60vh,640px)] overflow-y-auto space-y-3 pr-0.5'
                              : 'space-y-3'
                          }
                        >
                          {(alisModu === 'secim' || sinavListesiGenis
                            ? gunlereGore
                            : gorunenGunGruplari
                          ).map((grup) => {
                            const gunSeciliSayisi = grup.sinavlar.filter(
                              (s) => seciliIds.includes(s.id) && !sahipSet.has(s.id)
                            ).length;
                            return (
                              <div key={grup.tarih.toISOString()}>
                                <div className="flex items-center gap-2 mb-1.5 px-0.5 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-[1]">
                                  <span className="text-[11px] font-bold text-edu-ink">
                                    {format(grup.tarih, 'd MMMM EEEE', { locale: tr })}
                                  </span>
                                  <span className="text-[10px] font-semibold text-edu-muted">
                                    {grup.sinavlar.length}
                                  </span>
                                  <div className="flex-1 h-px bg-edu-line" />
                                  {alisModu === 'secim' && (
                                    <button
                                      type="button"
                                      onClick={() => gunuTumunuSec(grup.tarih)}
                                      className="text-[10px] font-bold text-wingo-700 hover:text-wingo-900 shrink-0"
                                    >
                                      {gunSeciliSayisi ===
                                      grup.sinavlar.filter(
                                        (s) =>
                                          s.gosterilenFiyat != null &&
                                          s.satinAlinabilir !== false &&
                                          !sahipSet.has(s.id)
                                      ).length
                                        ? 'Seçili'
                                        : 'Günü seç'}
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  {grup.sinavlar.map((s) => sinavSatiri(s))}
                                </div>
                              </div>
                            );
                          })}

                          {alisModu === 'paket' &&
                            !sinavListesiGenis &&
                            aylikSinavlar.length > SINAV_LISTE_LIMIT && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSinavListesiGenis(true);
                                  setAlisModu('secim');
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-edu-line bg-slate-50 px-4 py-2.5 text-sm font-bold text-edu-ink hover:bg-edu-mint"
                              >
                                Tümünü göster ve seç
                                <span className="rounded-full bg-wingo-100 px-2 py-0.5 text-xs text-wingo-700">
                                  +{aylikSinavlar.length - SINAV_LISTE_LIMIT}
                                </span>
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {Array.isArray(paket.ozellikler) && paket.ozellikler.length > 0 && (
                    <div className="rounded-2xl border border-edu-line bg-white p-5 md:p-6">
                      <h2 className="text-lg font-bold text-edu-ink mb-4">Paket özellikleri</h2>
                      <div className="relative">
                        <ul
                          className={`space-y-3 ${
                            ozelliklerKatlanabilir && !ozelliklerAcik ? 'max-h-40 overflow-hidden' : ''
                          }`}
                        >
                          {paket.ozellikler.map((oz, idx) => (
                            <li key={idx} className="grid grid-cols-[1rem_1fr] gap-x-3 items-start text-sm text-slate-600">
                              <CheckCircle2 className="w-4 h-4 text-wingo-600 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{oz}</span>
                            </li>
                          ))}
                        </ul>
                        {!ozelliklerAcik && ozelliklerKatlanabilir && (
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent"
                            aria-hidden
                          />
                        )}
                      </div>
                      {ozelliklerKatlanabilir && (
                        <button
                          type="button"
                          onClick={() => setOzelliklerAcik((v) => !v)}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-wingo-700"
                        >
                          {ozelliklerAcik ? 'Daha az göster' : 'Devamını göster'}
                          <ChevronDown className={`w-4 h-4 ${ozelliklerAcik ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <div className="rounded-3xl border border-edu-line bg-white p-6 lg:sticky lg:top-28 lg:self-start shadow-lg shadow-slate-200/50 space-y-5">
                    {alisModu === 'secim' && satinAlIds.length > 0 ? (
                      <>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-wingo-700 mb-1">Seçimin</p>
                          <h3 className="text-edu-ink font-bold text-lg">{satinAlIds.length} deneme</h3>
                        </div>
                        <ul className="space-y-2 max-h-36 overflow-y-auto text-sm border-b border-edu-line pb-4">
                          {seciliSinavlar.map((u) => (
                            <li key={u.id} className="flex justify-between gap-2 text-slate-700">
                              <span className="line-clamp-1 flex-1">{u.baslik}</span>
                              <span className="font-bold shrink-0">
                                {u.gosterilenFiyat === 0
                                  ? 'Ücretsiz'
                                  : `${u.gosterilenFiyat?.toLocaleString('tr-TR')} ₺`}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div>
                          {kademeSonuc.indirim > 0 && (
                            <p className="text-sm text-edu-muted line-through">
                              {kademeSonuc.listeToplam.toLocaleString('tr-TR')} ₺
                            </p>
                          )}
                          <p className="text-3xl font-black text-edu-ink tabular-nums">
                            {kademeSonuc.toplam === 0
                              ? 'Ücretsiz'
                              : `${kademeSonuc.toplam.toLocaleString('tr-TR')} ₺`}
                          </p>
                          {kademeSonuc.indirim > 0 && (
                            <p className="text-xs text-emerald-700 font-semibold mt-1">
                              {kademeSonuc.indirim.toLocaleString('tr-TR')} ₺ indirim
                            </p>
                          )}
                        </div>
                        {token && kademeSonuc.toplam > 0 ? (
                          <OdemeYontemiSecici deger={odemeYontemi} onChange={setOdemeYontemi} />
                        ) : null}
                        {token ? (
                          <button
                            type="button"
                            disabled={satinAlMutation.isPending}
                            onClick={() => satinAlMutation.mutate(satinAlIds)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold bg-edu-cta hover:bg-edu-cta-hover text-white shadow-lg shadow-orange-500/25 disabled:opacity-50"
                          >
                            {satinAlMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-4 h-4" />
                            )}
                            {kademeSonuc.toplam === 0
                              ? 'Ücretsiz al'
                              : odemeYontemi === 'HAVALE'
                                ? 'Havale ile öde'
                                : 'Satın al'}
                          </button>
                        ) : (
                          <Link
                            href={girisUrlWithReturn(geriDonusYolu)}
                            className="w-full inline-flex items-center justify-center rounded-2xl py-3.5 font-extrabold bg-edu-cta hover:bg-edu-cta-hover text-white shadow-lg shadow-orange-500/25"
                          >
                            Giriş yap ve öde
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={paketModunaDon}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 border-edu-ink/15 bg-white py-3 text-sm font-extrabold text-edu-ink shadow-sm hover:border-edu-cta hover:bg-orange-50 hover:text-edu-cta transition-colors"
                        >
                          Vazgeç · tüm paketi al
                        </button>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-wingo-700 mb-1">Önerilen</p>
                          <h3 className="text-edu-ink font-bold text-xl">Tüm paket</h3>
                          <p className="text-sm text-edu-muted mt-1">
                            {sinavlar.length || paket.sinavSayisi || 0} denemeye anında erişim
                          </p>
                        </div>

                        <div className="rounded-2xl bg-edu-mint/60 border border-wingo-100 px-4 py-4">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-black text-edu-ink tabular-nums">{paketFiyatGoster}</span>
                            {!paketUcretsiz &&
                              (indirimKodu ||
                                (paket.indirimliFiyat != null && paket.indirimliFiyat < paketFiyatListe)) && (
                                <span className="text-edu-muted line-through text-sm">
                                  {paketFiyatListe.toLocaleString('tr-TR')} ₺
                                </span>
                              )}
                          </div>
                          {!paketUcretsiz &&
                            paket.indirimliFiyat != null &&
                            paket.indirimliFiyat < paket.fiyat &&
                            !indirimKodu && (
                              <p className="text-xs font-semibold text-emerald-700 mt-1">
                                {(paket.fiyat - paket.indirimliFiyat).toLocaleString('tr-TR')} ₺ tasarruf
                              </p>
                            )}
                        </div>

                        {token && !paketUcretsiz && (
                          <>
                            <IndirimKoduKutusu
                              tutar={paket.indirimliFiyat ?? paket.fiyat}
                              uygulanan={indirimKodu}
                              onDegisim={setIndirimKodu}
                            />
                            <OdemeYontemiSecici deger={odemeYontemi} onChange={setOdemeYontemi} />
                          </>
                        )}

                        {paketSatinAlButonu}

                        <div className="border-t border-edu-line pt-4 space-y-2">
                          <p className="text-xs text-edu-muted text-center leading-relaxed">
                            Sadece bazı denemelere mi ihtiyacın var?
                          </p>
                          <button
                            type="button"
                            onClick={secimModunaGec}
                            className="w-full rounded-xl border border-edu-line py-2.5 text-sm font-bold text-edu-ink hover:bg-edu-mint transition-colors"
                          >
                            Deneme seçerek al
                          </button>
                          {paket.kademeliFiyatlandirma?.aktif &&
                            paket.kademeliFiyatlandirma.kademeler.length > 0 && (
                              <p className="text-[11px] text-center text-edu-muted">
                                Çok seçince indirim:{' '}
                                {paket.kademeliFiyatlandirma.kademeler
                                  .slice(0, 2)
                                  .map((k) => kademeEtiketi(k))
                                  .join(' · ')}
                                {paket.kademeliFiyatlandirma.kademeler.length > 2 ? '…' : ''}
                              </p>
                            )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {alisModu === 'paket' && (
                <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-edu-line bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-8px_30px_rgba(15,47,43,0.08)]">
                  <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-edu-muted">Tüm paket</p>
                      <p className="font-extrabold text-edu-ink tabular-nums truncate">{paketFiyatGoster}</p>
                    </div>
                    {token ? (
                      <button
                        type="button"
                        onClick={() => paketSatinAlMutation.mutate()}
                        disabled={paketSatinAlMutation.isPending}
                        className="flex-1 rounded-xl bg-edu-cta hover:bg-edu-cta-hover text-white font-extrabold py-3 text-sm disabled:opacity-50"
                      >
                        {paketSatinAlMutation.isPending ? '…' : 'Satın al'}
                      </button>
                    ) : (
                      <Link
                        href={girisUrlWithReturn(geriDonusYolu)}
                        className="flex-1 rounded-xl bg-edu-cta hover:bg-edu-cta-hover text-white font-extrabold py-3 text-sm text-center"
                      >
                        Giriş yap · Al
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <HavaleSonucModal
        open={Boolean(havaleModal)}
        onClose={() => setHavaleModal(null)}
        tutar={havaleModal?.tutar}
        referansNo={havaleModal?.referansNo}
        siparisId={havaleModal?.siparisId}
      />
      <IyzicoCheckoutModal
        open={Boolean(checkoutForm)}
        checkoutForm={checkoutForm}
        subtitle={checkoutAltBaslik ?? paket?.ad}
        onClose={() => setCheckoutForm(null)}
      />
    </MarketingShell>
  );
}
