'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Star } from 'lucide-react';
import { api, paketApi } from '@/lib/api';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { PaketSatisKarti, type PaketSatisVeri } from '@/components/landing/PaketSatisKarti';
import { kpssOrtami } from '@/lib/platform';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { erisimSonrasiYenile } from '@/lib/erisimYenile';
import {
  kategoriHaritasi,
  paketKategoriFromPaket,
  paketKategoriRenk,
  type PaketKategoriKayit,
} from '@/lib/paketKategori';

interface Paket extends PaketSatisVeri {}

const paketEfektifFiyat = (p: Paket) =>
  p.indirimliFiyat != null && p.indirimliFiyat > 0 ? p.indirimliFiyat : p.fiyat;

export default function PaketlerSayfasi() {
  const [kategoriFiltre, setKategoriFiltre] = useState<string | 'TUMU'>('TUMU');
  const [alinanPaketId, setAlinanPaketId] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const kullanici = useAuthStore((s) => s.kullanici);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['landing-aktif-paketler'],
    queryFn: () => api.get('/paketler/aktif'),
    staleTime: 5 * 60 * 1000,
  });

  const ucretsizAlMutation = useMutation({
    mutationFn: (paketId: string) => paketApi.satinAl({ paketId, odemeYontemi: 'KREDI_KARTI' }),
    onSuccess: (response) => {
      const veri = response.data?.veri;
      if (veri?.ucretsiz) {
        queryClient.invalidateQueries({ queryKey: ['landing-aktif-paketler'] });
        erisimSonrasiYenile(queryClient);
        toast.basarili('Ücretsiz paket hesabınıza tanımlandı. Denemelere hemen erişebilirsiniz.');
        router.push('/sinavlar');
        return;
      }
      toast.basarili('Siparişiniz oluşturuldu.');
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Paket alınamadı';
      toast.hata(String(mesaj));
    },
    onSettled: () => setAlinanPaketId(null),
  });

  const ucretsizAl = (paketId: string) => {
    if (!token) {
      router.push('/giris');
      return;
    }
    setAlinanPaketId(paketId);
    ucretsizAlMutation.mutate(paketId);
  };

  const { data: kategorilerData } = useQuery({
    queryKey: ['landing-paket-kategorileri'],
    queryFn: () => paketApi.kategoriler(),
    staleTime: 5 * 60 * 1000,
  });

  const hamPaketler: Paket[] = data?.data?.veri || [];
  
  const paketler = useMemo(() => {
    const isKpss = kpssOrtami(kullanici?.ogretimTuru);
    return hamPaketler.filter((p) => {
      const pKpss = (p.kategori && p.kategori.toUpperCase().includes('KPSS')) || p.ad.toUpperCase().includes('KPSS');
      return isKpss ? pKpss : !pKpss;
    });
  }, [hamPaketler, kullanici?.ogretimTuru]);

  const kategoriler: PaketKategoriKayit[] = kategorilerData?.data?.veri || [];
  const kategoriHarita = useMemo(() => kategoriHaritasi(kategoriler), [kategoriler]);

  const filtreliPaketler = useMemo(() => {
    if (kategoriFiltre === 'TUMU') return paketler;
    return paketler.filter((p) => (p.kategori || 'GENEL') === kategoriFiltre);
  }, [paketler, kategoriFiltre]);

  const siraliPaketler = useMemo(() => {
    const sira = new Map(kategoriler.map((k, i) => [k.slug, i]));
    return [...filtreliPaketler].sort((a, b) => {
      const ka = sira.get(a.kategori || 'GENEL') ?? 999;
      const kb = sira.get(b.kategori || 'GENEL') ?? 999;
      if (ka !== kb) return ka - kb;
      return a.ad.localeCompare(b.ad, 'tr');
    });
  }, [filtreliPaketler, kategoriler]);

  const kategoriSayilari = useMemo(() => {
    const say: Record<string, number> = {};
    for (const p of paketler) {
      const k = p.kategori || 'GENEL';
      say[k] = (say[k] || 0) + 1;
    }
    return say;
  }, [paketler]);

  return (
    <MarketingShell>
      <div className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-20 flex-1">
        <div className="max-w-7xl mx-auto pt-6 md:pt-10">
          <div className="mb-10 md:mb-14">
            <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#8FE4D8] mb-4">
              Paketler
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Tüm deneme paketleri
            </h1>
            <p className="text-slate-400 mt-4 max-w-2xl text-sm md:text-base leading-relaxed">
              Paketleri inceleyin, sınav takviminden istediğiniz denemeleri seçerek satın alın veya
              toplu paket fiyatından yararlanın.
            </p>
            <Link
              href="/kayit"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C6BFF] to-[#2ABBA7] text-white text-xs font-black hover:brightness-110 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ücretsiz dene
            </Link>
          </div>

          {kategoriler.filter((k) => (kategoriSayilari[k.slug] || 0) > 0).length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <button
                type="button"
                onClick={() => setKategoriFiltre('TUMU')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  kategoriFiltre === 'TUMU'
                    ? 'bg-[#2ABBA7] text-white border-[#2ABBA7]'
                    : 'bg-white/[0.04] text-slate-300 border-white/10 hover:border-white/20'
                }`}
              >
                Tümü ({paketler.length})
              </button>
              {kategoriler
                .filter((k) => (kategoriSayilari[k.slug] || 0) > 0)
                .map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategoriFiltre(k.slug)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                      kategoriFiltre === k.slug
                        ? 'bg-[#2ABBA7] text-white border-[#2ABBA7]'
                        : `${paketKategoriRenk(k.slug, kategoriHarita)} hover:opacity-90`
                    }`}
                  >
                    {k.ad} ({kategoriSayilari[k.slug]})
                  </button>
                ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-[#2ABBA7]" />
            </div>
          ) : paketler.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-14 text-center">
              <Star className="w-10 h-10 text-[#2ABBA7] mx-auto mb-4 opacity-50" />
              <p className="text-white font-bold text-lg">Şu an aktif bir paket yok.</p>
              <p className="text-slate-400 text-sm mt-2">Yakında yeni paketler eklenecek.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-7 items-stretch pt-2">
              {siraliPaketler.map((paket, i) => {
                const katInfo = paketKategoriFromPaket(paket, kategoriHarita);
                const ucretsiz = paketEfektifFiyat(paket) <= 0;
                return (
                  <PaketSatisKarti
                    key={paket.id}
                    paket={paket}
                    kategoriAd={katInfo.ad}
                    kategoriSlug={katInfo.slug}
                    index={i}
                    ucretsizYukleniyor={alinanPaketId === paket.id}
                    onUcretsizAl={ucretsiz ? () => ucretsizAl(paket.id) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MarketingShell>
  );
}
