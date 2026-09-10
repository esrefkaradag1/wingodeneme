import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AnaSiteyeDonButonu() {
  return (
    <Link
      href="/"
      className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50 inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-black/40 border border-white/12 text-white/85 text-sm font-medium backdrop-blur-md hover:bg-black/55 hover:text-white hover:border-white/20 transition-all shadow-lg"
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      Ana Siteye Dön
    </Link>
  );
}
