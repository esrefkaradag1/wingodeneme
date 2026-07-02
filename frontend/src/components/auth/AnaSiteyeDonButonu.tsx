import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AnaSiteyeDonButonu() {
  return (
    <Link
      href="/"
      className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/90 text-sm font-medium backdrop-blur-sm hover:bg-white/20 hover:text-white transition-all shadow-lg"
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      Ana Siteye Dön
    </Link>
  );
}
