'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ShoppingBag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { kullaniciApi } from '@/lib/api';
import { IyzicoCheckoutModal } from '@/components/payment/IyzicoCheckoutModal';
import { iyzicoOdemeBaslat } from '@/lib/iyzicoCheckout';
import { toast } from '@/store/toast.store';

type Siparis = {
  id: string;
  miktar: number;
  indirimMiktari?: number;
  durum: string;
  referansNo: string | null;
  odemeMetodu: string | null;
  olusturuldu: string;
  odemeZamani: string | null;
  paket?: { id: string; ad: string; sinavSayisi?: number } | null;
  sinav?: { id: string; baslik: string; tur?: string } | null;
};

const DURUM_ETIKET: Record<string, string> = {
  BEKLEMEDE: 'Ödeme bekliyor',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL_EDILDI: 'İptal',
  IADE_EDILDI: 'İade edildi',
  HATA: 'Hata',
};

const DURUM_STIL: Record<string, string> = {
  BEKLEMEDE: 'bg-amber-50 text-amber-800 border-amber-100',
  TAMAMLANDI: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  IPTAL_EDILDI: 'bg-gray-100 text-gray-600 border-gray-200',
  IADE_EDILDI: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  HATA: 'bg-red-50 text-red-700 border-red-100',
};

const DURUM_IKON: Record<string, typeof Clock> = {
  BEKLEMEDE: Clock,
  TAMAMLANDI: CheckCircle2,
  IPTAL_EDILDI: XCircle,
  IADE_EDILDI: AlertTriangle,
  HATA: AlertTriangle,
};

const FILTRELER = [
  { value: '', etiket: 'Tümü' },
  { value: 'BEKLEMEDE', etiket: 'Bekleyen' },
  { value: 'TAMAMLANDI', etiket: 'Tamamlanan' },
  { value: 'IPTAL_EDILDI', etiket: 'İptal' },
] as const;

function urunBaslik(s: Siparis): string {
  if (s.sinav?.baslik) return s.sinav.baslik;
  if (s.paket?.ad) return s.paket.ad;
  return 'Sipariş';
}

function urunAlt(s: Siparis): string {
  if (s.sinav) return 'Tek deneme satın alımı';
  if (s.paket) return `Paket · ${s.paket.sinavSayisi ?? '—'} deneme`;
  return 'Satın alma';
}

export default function SiparislerimSayfasi() {
  const [sayfa, setSayfa] = useState(1);
  const [durum, setDurum] = useState('');
  const [checkoutForm, setCheckoutForm] = useState<string | null>(null);
  const [checkoutAltBaslik, setCheckoutAltBaslik] = useState<string | undefined>();
  const [odemeSiparisId, setOdemeSiparisId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ogrenci-siparisler', sayfa, durum],
    queryFn: () =>
      kullaniciApi.siparisler({
        sayfa,
        boyut: 15,
        ...(durum ? { durum } : {}),
      }),
  });

  const siparisler: Siparis[] = data?.data?.veri || [];
  const meta = data?.data?.meta;

  const odemeBaslatMutation = useMutation({
    mutationFn: (siparisId: string) => kullaniciApi.siparisOdemeBaslat(siparisId),
    onSuccess: (res, siparisId) => {
      const veri = res?.data?.veri;
      const siparis = siparisler.find((s) => s.id === siparisId);
      const adet = veri?.adet ?? 1;
      setCheckoutAltBaslik(
        adet > 1
          ? `${adet} deneme · ödeme`
          : siparis
            ? urunBaslik(siparis)
            : 'Sipariş ödemesi'
      );
      const acildi = iyzicoOdemeBaslat(veri, setCheckoutForm);
      if (!acildi) {
        toast.hata('Ödeme formu açılamadı. Lütfen tekrar deneyin.');
      }
    },
    onError: (err: { response?: { data?: { mesaj?: string } } }) => {
      toast.hata(err?.response?.data?.mesaj || 'Ödeme başlatılamadı');
    },
    onSettled: () => setOdemeSiparisId(null),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            href="/market"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Paket Al
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Siparişlerim</h1>
          <p className="text-sm text-gray-500 mt-1">
            Paket ve deneme satın alımlarınızın durumunu buradan takip edebilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-gray-100 flex-wrap">
          {FILTRELER.map((f) => (
            <button
              key={f.value || 'tumu'}
              type="button"
              onClick={() => {
                setDurum(f.value);
                setSayfa(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                durum === f.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {f.etiket}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-700 text-sm font-medium">
          Siparişler yüklenemedi. Lütfen sayfayı yenileyin.
        </div>
      ) : siparisler.length === 0 ? (
        <div className="rounded-[28px] border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-2">Henüz siparişiniz yok</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Paket veya tek deneme satın aldığınızda siparişleriniz burada listelenir.
          </p>
          <Link
            href="/market"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            Paketlere Git
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {siparisler.map((siparis) => {
            const DurumIkon = DURUM_IKON[siparis.durum] || Clock;
            const tamamlandi = siparis.durum === 'TAMAMLANDI';
            return (
              <article
                key={siparis.id}
                className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      siparis.sinav ? 'bg-sky-50 text-sky-600' : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {siparis.sinav ? <BookOpen className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900 truncate">{urunBaslik(siparis)}</h3>
                        <p className="text-xs text-gray-500 font-medium">{urunAlt(siparis)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${DURUM_STIL[siparis.durum] || DURUM_STIL.BEKLEMEDE}`}
                      >
                        <DurumIkon className="w-3.5 h-3.5" />
                        {DURUM_ETIKET[siparis.durum] || siparis.durum}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Sipariş:{' '}
                        <strong className="text-gray-700">
                          #{ (siparis.referansNo || siparis.id).slice(-8).toUpperCase()}
                        </strong>
                      </span>
                      <span>
                        Tarih:{' '}
                        <strong className="text-gray-700">
                          {format(new Date(siparis.olusturuldu), 'd MMM yyyy HH:mm', { locale: tr })}
                        </strong>
                      </span>
                      {siparis.odemeZamani ? (
                        <span>
                          Ödeme:{' '}
                          <strong className="text-gray-700">
                            {format(new Date(siparis.odemeZamani), 'd MMM yyyy HH:mm', { locale: tr })}
                          </strong>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-lg font-black text-gray-900">
                        {siparis.miktar.toLocaleString('tr-TR')} ₺
                        {(siparis.indirimMiktari ?? 0) > 0 ? (
                          <span className="ml-2 text-xs font-bold text-emerald-600">
                            ({siparis.indirimMiktari!.toLocaleString('tr-TR')} ₺ indirim uygulandı)
                          </span>
                        ) : null}
                      </p>

                      {tamamlandi && siparis.sinav ? (
                        <Link
                          href="/sinavlar"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          Sınavlarıma git →
                        </Link>
                      ) : null}
                      {tamamlandi && siparis.paket && !siparis.sinav ? (
                        <Link
                          href={`/paket/${siparis.paket.id}`}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          Pakete git →
                        </Link>
                      ) : null}
                      {siparis.durum === 'BEKLEMEDE' ? (
                        <button
                          type="button"
                          disabled={odemeBaslatMutation.isPending && odemeSiparisId === siparis.id}
                          onClick={() => {
                            setOdemeSiparisId(siparis.id);
                            odemeBaslatMutation.mutate(siparis.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 disabled:opacity-50"
                        >
                          {odemeBaslatMutation.isPending && odemeSiparisId === siparis.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                          Ödemeyi tamamla →
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {meta && meta.toplamSayfa > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={sayfa <= 1}
            onClick={() => setSayfa((p) => Math.max(1, p - 1))}
            className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Önceki sayfa"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-600">
            {sayfa} / {meta.toplamSayfa}
          </span>
          <button
            type="button"
            disabled={sayfa >= meta.toplamSayfa}
            onClick={() => setSayfa((p) => p + 1)}
            className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Sonraki sayfa"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      ) : null}

      <IyzicoCheckoutModal
        open={Boolean(checkoutForm)}
        checkoutForm={checkoutForm}
        subtitle={checkoutAltBaslik}
        onClose={() => {
          setCheckoutForm(null);
          queryClient.invalidateQueries({ queryKey: ['ogrenci-siparisler'] });
        }}
      />
    </div>
  );
}
