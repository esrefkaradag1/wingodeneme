'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 text-white p-6">
      <h1 className="text-2xl font-semibold">Bir şeyler ters gitti</h1>
      <p className="text-slate-400 text-sm text-center max-w-md">
        Sayfa yüklenirken hata oluştu. Geliştirme ortamında `.next` klasörünü silip sunucuyu yeniden
        başlatmayı deneyin.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Tekrar dene
        </button>
        <Link href="/" className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">
          Ana sayfa
        </Link>
      </div>
    </div>
  );
}
