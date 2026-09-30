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
      <div className="flex-1 pb-16 md:pb-20">
        <section className="relative overflow-hidden border-b border-edu-line">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-28 right-0 h-[26rem] w-[26rem] rounded-full bg-wingo-400/20 blur-[110px]" />
            <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-orange-300/15 blur-[90px]" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-10 md:pb-14">
            <span className="inline-flex items-center rounded-full bg-white border border-edu-line px-4 py-1.5 text-xs font-black uppercase tracking-widest text-wingo-700 mb-4 shadow-sm">
              Paketler
            </span>
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-edu-ink tracking-tight leading-[1.1]">
                  Tüm deneme paketleri
                </h1>
                <p className="text-edu-muted mt-4 max-w-2xl text-sm md:text-base leading-relaxed">
                  Paketi aç, istediğin denemeleri seç veya tüm paketi al. Kademeli indirim ve anında erişim.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/kayit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-edu-cta hover:bg-edu-cta-hover text-white text-xs font-black transition-all shadow-lg shadow-orange-500/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ücretsiz dene
                  </Link>
                  <a
                    href="#paket-listesi"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-edu-line text-edu-ink text-xs font-bold hover:border-wingo-300 transition-all"
                  >
                    Paketleri incele
                  </a>
                </div>
              </div>
              <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-edu-line bg-white/90 px-4 py-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-edu-muted">Aktif paket</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-edu-ink tabular-nums">
                    {isLoading ? '—' : paketler.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-edu-line bg-white/90 px-4 py-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-edu-muted">Esnek seçim</p>
                  <p className="mt-1 font-display text-sm font-bold text-wingo-700 leading-snug">
                    Tek deneme veya tüm paket
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10" id="paket-listesi">
          {kategoriler.filter((k) => (kategoriSayilari[k.slug] || 0) > 0).length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <button
                type="button"
                onClick={() => setKategoriFiltre('TUMU')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  kategoriFiltre === 'TUMU'
                    ? 'bg-wingo-600 text-white border-wingo-600'
                    : 'bg-white text-slate-600 border-edu-line hover:border-slate-200'
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
                        ? 'bg-wingo-600 text-white border-wingo-600'
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
              <Loader2 className="w-10 h-10 animate-spin text-wingo-700" />
            </div>
          ) : paketler.length === 0 ? (
            <div className="rounded-2xl border border-edu-line bg-white p-14 text-center">
              <Star className="w-10 h-10 text-wingo-700 mx-auto mb-4 opacity-50" />
              <p className="text-edu-ink font-bold text-lg">Şu an aktif bir paket yok.</p>
              <p className="text-edu-muted text-sm mt-2">Yakında yeni paketler eklenecek.</p>
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
