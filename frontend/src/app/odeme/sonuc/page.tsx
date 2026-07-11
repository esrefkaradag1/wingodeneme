'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

function OdemeSonucIcerik() {
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
            <Link
              href="/panel"
              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-lg font-medium text-white transition hover:bg-indigo-700"
            >
              Panele Git
            </Link>
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
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Geri Dön
              </button>
              <Link
                href="/paketler"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Paketleri İncele
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OdemeSonucPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <OdemeSonucIcerik />
    </Suspense>
  );
}
