'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { XCircle, RefreshCcw, LifeBuoy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OdemeHataSayfasi() {
  const searchParams = useSearchParams();
  const mesaj = searchParams.get('mesaj') || 'Ödemenizi şu an kaydedemiyoruz.';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-8 text-center space-y-8 border-2 border-rose-50"
      >
        <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-lg shadow-rose-100">
           <XCircle className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Ödeme Hatası!</h1>
          <p className="text-gray-500 font-medium">{mesaj}</p>
        </div>

        <div className="bg-rose-50/50 rounded-2xl p-4 flex flex-col gap-2">
           <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Önerilerimiz</p>
           <ul className="text-xs font-bold text-rose-700/60 space-y-2">
              <li className="flex items-center gap-2 justify-center">• Bakiyenizi kontrol edin</li>
              <li className="flex items-center gap-2 justify-center">• Kartın internet alışverişine açık olduğunu doğrulayın</li>
           </ul>
        </div>

        <div className="flex flex-col gap-3">
           <Link 
            href="/market"
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
           >
            Tekrar Dene <RefreshCcw className="w-4 h-4" />
           </Link>
           <Link 
            href="/yardim"
            className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95"
           >
            Destek Al <LifeBuoy className="w-4 h-4" />
           </Link>
        </div>
      </motion.div>
    </div>
  );
}
