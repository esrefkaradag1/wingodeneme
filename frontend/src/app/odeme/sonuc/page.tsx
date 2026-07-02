'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function OdemeSonucPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const status = searchParams.get('status');
  const mesaj = searchParams.get('mesaj');

  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-slate-50 py-20 flex flex-col items-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center">
        {isSuccess ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-slate-800">Ödeme Başarılı!</h1>
            <p className="text-slate-600 mb-8">
              Paketiniz başarıyla hesabınıza tanımlandı. Artık içeriklere erişebilirsiniz.
            </p>
            <Button asChild className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700">
              <Link href="/panel">Panele Git</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-slate-800">Ödeme Başarısız</h1>
            <p className="text-slate-600 mb-8">
              Ödeme işleminiz sırasında bir sorun oluştu. <br />
              {mesaj === 'TokenBulunamadi' && 'Eksik parametre.'}
              {mesaj === 'OdemeDogrulanamadi' && 'Ödeme doğrulanamadı.'}
              {mesaj === 'GecersizIslem' && 'Geçersiz işlem.'}
              {mesaj === 'OdemeBasarisiz' && 'Banka işlemi reddetti veya bakiyeniz yetersiz.'}
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.back()} className="flex-1 h-12">
                Geri Dön
              </Button>
              <Button asChild className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700">
                <Link href="/paketler">Paketleri İncele</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
