import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AnaSiteyeDonButonu() {
  return (
    <Link
      href="/"
      className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50 inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/90 border border-edu-line text-edu-ink text-sm font-semibold backdrop-blur-md hover:bg-white hover:border-wingo-300 transition-all shadow-md shadow-slate-200/60"
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      Ana Siteye Dön
    </Link>
  );
}
