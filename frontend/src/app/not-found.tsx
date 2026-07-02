import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 text-white p-6">
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="text-slate-400 text-sm text-center max-w-md">
        Aradığınız adres yok veya taşınmış olabilir.
      </p>
      <Link href="/" className="text-indigo-400 hover:text-indigo-300 underline text-sm">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
