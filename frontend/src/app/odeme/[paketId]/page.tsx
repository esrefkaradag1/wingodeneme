'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { IyzicoCheckoutModal } from '@/components/payment/IyzicoCheckoutModal';
import { iyzicoOdemeBaslat } from '@/lib/iyzicoCheckout';

export default function OdemePage({ params }: { params: { paketId: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [paket, setPaket] = useState<any>(null);
  const [checkoutForm, setCheckoutForm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      toast.hata('Ödeme yapmak için giriş yapmalısınız.', 'Hata');
      router.push('/giris');
      return;
    }

    const fetchPaket = async () => {
      try {
        const res = await api.get(`/paketler/aktif/${params.paketId}`);
        if (res.data?.basarili && res.data?.veri) {
          setPaket(res.data.veri);
        } else {
          toast.hata('Paket bulunamadı', 'Hata');
          router.push('/paketler');
        }
      } catch {
        toast.hata('Paket bilgileri alınamadı', 'Hata');
        router.push('/paketler');
      }
    };
    fetchPaket();
  }, [user, params.paketId, router]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await api.post('/odeme/checkout', { paketId: params.paketId });

      if (res.data?.basarili) {
        const acildi = iyzicoOdemeBaslat(res.data, setCheckoutForm);
        if (!acildi) {
          toast.hata(res.data?.mesaj || 'Ödeme başlatılamadı', 'Hata');
        }
      } else {
        toast.hata(res.data?.mesaj || 'Ödeme başlatılamadı', 'Hata');
      }
    } catch {
      toast.hata('Ödeme başlatılırken bir sorun oluştu', 'Hata');
    } finally {
      setLoading(false);
    }
  };

  if (!paket) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const fiyat = paket.indirimliFiyat && paket.indirimliFiyat > 0 ? paket.indirimliFiyat : paket.fiyat;

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <Link href="/paketler" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Paketlere Dön
          </Link>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-8">
            <h1 className="text-3xl font-bold mb-2">Satın Alma Özeti</h1>
            <p className="text-slate-500 mb-6">Seçtiğiniz paketin detaylarını aşağıda görebilirsiniz.</p>

            <div className="bg-slate-50 p-6 rounded-xl mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-slate-700">Paket Adı</span>
                <span className="font-bold">{paket.ad}</span>
              </div>
              {paket.aciklama ? (
                <div className="flex justify-between items-center mb-4 border-t pt-4">
                  <span className="font-medium text-slate-700">Açıklama</span>
                  <span className="text-right text-sm text-slate-600">{paket.aciklama}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center border-t pt-4">
                <span className="font-medium text-slate-700">Ödenecek Tutar</span>
                <span className="text-2xl font-bold text-indigo-600">{fiyat} ₺</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayment}
              disabled={loading || Boolean(checkoutForm)}
              className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-60"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin inline" /> : null}
              Güvenli Ödeme Yap
            </button>
          </div>
        </div>
      </div>

      <IyzicoCheckoutModal
        open={Boolean(checkoutForm)}
        checkoutForm={checkoutForm}
        subtitle={paket.ad}
        onClose={() => setCheckoutForm(null)}
      />
    </>
  );
}
