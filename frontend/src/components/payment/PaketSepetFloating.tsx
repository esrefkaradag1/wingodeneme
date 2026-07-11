'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, X, Trash2, ArrowRight, Loader2, Minus } from 'lucide-react';
import { paketApi } from '@/lib/api';
import { usePaketSepetStore } from '@/store/paket-sepet.store';
import { kademeliSepetToplamHesapla, kademeEtiketi } from '@/lib/sinavFiyatKademe';
import { fiyatGoster } from '@/lib/para';

export function PaketSepetFloating() {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { paketId, paketAd, seciliSinavIds, cikar, temizle } = usePaketSepetStore();

  useEffect(() => {
    if (usePaketSepetStore.persist.hasHydrated()) setHydrated(true);
    return usePaketSepetStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!acik) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAcik(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [acik]);

  const { data, isLoading } = useQuery({
    queryKey: ['paket-sepet-detay', paketId],
    enabled: acik && !!paketId,
    queryFn: () => paketApi.detay(paketId!),
    staleTime: 60_000,
  });

  const paket = data?.data?.veri;
  const seciliSinavlar = useMemo(() => {
    if (!paket?.sinavlar) return [];
    return paket.sinavlar.filter((s: { id: string }) => seciliSinavIds.includes(s.id));
  }, [paket, seciliSinavIds]);

  const listeToplam = useMemo(
    () =>
      seciliSinavlar.reduce(
        (toplam: number, s: { gosterilenFiyat?: number | null }) => toplam + (s.gosterilenFiyat || 0),
        0
      ),
    [seciliSinavlar]
  );

  const kademeSonuc = useMemo(
    () => kademeliSepetToplamHesapla(seciliSinavlar.length, listeToplam, paket?.kademeliFiyatlandirma),
    [seciliSinavlar.length, listeToplam, paket?.kademeliFiyatlandirma]
  );

  if (pathname?.startsWith('/panel')) return null;
  if (!hydrated || seciliSinavIds.length === 0 || !paketId) return null;

  const paketSayfaYolu = `/paket/${paketId}`;
  const baslik = paket?.ad || paketAd || 'Paket sepeti';

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C6BFF] to-[#2ABBA7] text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-indigo-500/45 active:scale-95"
        aria-label={`Sepet, ${seciliSinavIds.length} deneme seçili`}
      >
        <ShoppingCart className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-indigo-700 shadow-md">
          {seciliSinavIds.length}
        </span>
      </button>

      <AnimatePresence>
        {acik ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
              onClick={() => setAcik(false)}
              aria-label="Sepeti kapat"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed right-0 top-0 z-[100] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0A1024] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sepet</p>
                  <h2 className="truncate text-lg font-bold text-white">{baslik}</h2>
                  <p className="text-sm text-slate-400">{seciliSinavIds.length} deneme seçili</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAcik(false)}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Yükleniyor…</span>
                  </div>
                ) : seciliSinavlar.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Seçili denemeler yüklenemedi. Paket sayfasına giderek kontrol edin.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {seciliSinavlar.map((sinav: { id: string; baslik: string; gosterilenFiyat?: number | null }) => (
                      <li
                        key={sinav.id}
                        className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-200">{sinav.baslik}</span>
                          <span className="mt-1 block text-sm font-semibold text-[#2ABBA7]">
                            {(sinav.gosterilenFiyat ?? 0) <= 0
                              ? 'Ücretsiz'
                              : `${fiyatGoster(sinav.gosterilenFiyat)} ₺`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => cikar(sinav.id)}
                          className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`${sinav.baslik} denemesini sepetten çıkar`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-white/10 px-5 py-4">
                {kademeSonuc.indirim > 0 && kademeSonuc.kademe ? (
                  <div className="mb-3 space-y-1 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Ara toplam</span>
                      <span>{fiyatGoster(listeToplam)} ₺</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>{kademeEtiketi(kademeSonuc.kademe)}</span>
                      <span>-{fiyatGoster(kademeSonuc.indirim)} ₺</span>
                    </div>
                  </div>
                ) : null}
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-semibold text-white">Toplam</span>
                  <span className="text-xl font-bold text-white">
                    {kademeSonuc.toplam <= 0 ? 'Ücretsiz' : `${fiyatGoster(kademeSonuc.toplam)} ₺`}
                  </span>
                </div>

                <Link
                  href={paketSayfaYolu}
                  onClick={() => setAcik(false)}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C6BFF] to-[#2ABBA7] py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40"
                >
                  {pathname === paketSayfaYolu ? 'Sepete dön' : 'Pakete git ve satın al'}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    temizle();
                    setAcik(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Sepeti temizle
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
