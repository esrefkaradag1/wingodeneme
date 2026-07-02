'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OdemePage({ params }: { params: { paketId: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [paket, setPaket] = useState<any>(null);
  const [checkoutForm, setCheckoutForm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      toast({ title: 'Hata', description: 'Ödeme yapmak için giriş yapmalısınız.', variant: 'destructive' });
      router.push('/giris');
      return;
    }
    
    // Paketi getir
    const fetchPaket = async () => {
      try {
        const res = await apiRequest(`/paketler/${params.paketId}`);
        if (res.basarili && res.veri) {
          setPaket(res.veri);
        } else {
          toast({ title: 'Hata', description: 'Paket bulunamadı', variant: 'destructive' });
          router.push('/paketler');
        }
      } catch (error) {
        toast({ title: 'Hata', description: 'Paket bilgileri alınamadı', variant: 'destructive' });
        router.push('/paketler');
      }
    };
    fetchPaket();
  }, [user, params.paketId, router]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/odeme/checkout', {
        method: 'POST',
        body: JSON.stringify({ paketId: params.paketId }),
      });
      
      if (res.basarili && res.checkoutFormContent) {
        setCheckoutForm(res.checkoutFormContent);
        // Iyzico scriptini çalıştırmak için script tag'ini document'a eklemek gerekebilir.
        // dangerouslySetInnerHTML bunu her zaman yapmayabilir. 
        // Birazdan div içeriği dolduğunda appendChild ile scripti çalıştıracağız.
      } else {
        toast({ title: 'Hata', description: res.mesaj || 'Ödeme başlatılamadı', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Ödeme başlatılırken bir sorun oluştu', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkoutForm) {
      const scriptTag = document.getElementById('iyzipay-checkout-form');
      if (scriptTag) {
        const scriptContent = checkoutForm.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);
        if (scriptContent && scriptContent[1]) {
           const script = document.createElement('script');
           script.text = scriptContent[1];
           document.body.appendChild(script);
        }
      }
    }
  }, [checkoutForm]);

  if (!paket) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const fiyat = paket.indirimliFiyat && paket.indirimliFiyat > 0 ? paket.indirimliFiyat : paket.fiyat;

  return (
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
            {paket.aciklama && (
               <div className="flex justify-between items-center mb-4 border-t pt-4">
                 <span className="font-medium text-slate-700">Açıklama</span>
                 <span className="text-right text-sm text-slate-600">{paket.aciklama}</span>
               </div>
            )}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="font-medium text-slate-700">Ödenecek Tutar</span>
              <span className="text-2xl font-bold text-indigo-600">{fiyat} ₺</span>
            </div>
          </div>

          {!checkoutForm ? (
            <Button 
              onClick={handlePayment} 
              disabled={loading}
              className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Güvenli Ödeme Yap
            </Button>
          ) : (
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-bold mb-4 text-center">Ödeme Bilgilerinizi Girin</h2>
              {/* Iyzico'nun ekleyeceği div */}
              <div id="iyzi-payment-container">
                <div dangerouslySetInnerHTML={{ __html: checkoutForm }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
