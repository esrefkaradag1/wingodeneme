'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { sinavApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { confirmAsk } from '@/store/confirm-dialog.store';
import { SinavSayac } from '@/components/exam/SinavSayac';
import { SoruSureGostergesi } from '@/components/exam/SoruSureGostergesi';
import { useSoruSureTakip } from '@/hooks/useSoruSureTakip';
import { KitapcikGorumu } from '@/components/exam/KitapcikGorumu';
import { TekSayfaGorumu } from '@/components/exam/TekSayfaGorumu';
import { SoruSoruGorumu } from '@/components/exam/SoruSoruGorumu';
import { CevapAnahtari } from '@/components/exam/CevapAnahtari';
import { OptikFormYukle } from '@/components/exam/OptikFormYukle';
import { BookOpen, Layout, AlignLeft, Key, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import type { SinavKitapcikMeta } from '@/components/exam/KitapcikGorumu';

type GorunumModu = 'kitapcik' | 'tek-sayfa' | 'soru-soru';

interface SinavKatilSoru {
  id: string;
  siraNo: number;
  metinHtml: string;
  gorselUrl?: string;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string };
  konuId?: string;
  zorluk?: string;
}

interface SinavKatilVerisi {
  katilim: {
    id: string;
    durum: string;
    baslangicZamani?: string | null;
  };
  sorular: SinavKatilSoru[];
  sureDakika: number;
  sinav: SinavKitapcikMeta;
  incelemeModu?: boolean;
  kayitliCevaplar?: Array<{ soruId: string; secilen: string | null }>;
}

export default function SinavSayfasi({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [katilimId, setKatilimId] = useState<string | null>(null);
  const [gorununModu, setGorunumModu] = useState<GorunumModu>('kitapcik');
  const [cevaplar, setCevaplar] = useState<Record<string, string | null>>({});
  const [aktifSoruIndex, setAktifSoruIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [cevapAnahtariAcik, setCevapAnahtariAcik] = useState(true);
  const [optikFormAcik, setOptikFormAcik] = useState(false);
  const teslimEdiliyorRef = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sinav-katil', params.id],
    queryFn: async () => {
      const yanit = await sinavApi.katil(params.id);
      return yanit.data.veri as SinavKatilVerisi;
    },
    retry: false,
  });

  const aktifSoruId = data?.sorular?.[aktifSoruIndex]?.id ?? null;
  const incelemeModuAktif = !!data?.incelemeModu;

  const { aktifAnlikSaniye, getSureMsMap, soruAktiflestir } = useSoruSureTakip({
    aktifSoruId,
    devreDisi: incelemeModuAktif || !data || !katilimId,
  });

  const soruDegistir = useCallback(
    (index: number) => {
      const soru = data?.sorular?.[index];
      if (soru && !incelemeModuAktif) soruAktiflestir(soru.id);
      setAktifSoruIndex(index);
    },
    [data?.sorular, incelemeModuAktif, soruAktiflestir]
  );

  useEffect(() => {
    if (data?.katilim?.id) {
      setKatilimId(data.katilim.id);
    }
  }, [data]);

  useEffect(() => {
    if (!data?.incelemeModu || !data.kayitliCevaplar?.length) return;
    const kayit: Record<string, string | null> = {};
    for (const cevap of data.kayitliCevaplar) {
      kayit[cevap.soruId] = cevap.secilen;
    }
    setCevaplar(kayit);
  }, [data?.incelemeModu, data?.kayitliCevaplar]);

  const cevapGonderMutation = useMutation({
    mutationFn: async () => {
      if (!katilimId) throw new Error('Katılım ID bulunamadı');
      const sureMap = getSureMsMap();
      const cevapDizisi = (data?.sorular || []).map((s) => ({
        soruId: s.id,
        secilen: soruIdToSecilen(cevaplar, s.id),
        sureMs: sureMap[s.id] ?? null,
      }));
      const yanit = await sinavApi.cevapGonder(katilimId, cevapDizisi);
      return yanit.data.veri;
    },
    onSuccess: (sonuc) => {
      teslimEdiliyorRef.current = false;
      toast.basarili(
        'Sınav tamamlandı!',
        `Doğru: ${sonuc.dogru} | Yanlış: ${sonuc.yanlis} | Net: ${sonuc.net.toFixed(2)}`
      );
      if (katilimId) {
        router.push(`/sinavlar/${katilimId}/sonuc`);
      } else {
        router.push('/sinavlar');
      }
    },
    onError: (err) => {
      teslimEdiliyorRef.current = false;
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 400 &&
        typeof (err.response.data as { mesaj?: string })?.mesaj === 'string' &&
        (err.response.data as { mesaj?: string }).mesaj?.includes('zaten tamamlandı')
      ) {
        toast.bilgi('Sınav zaten tamamlanmış, sonuçlara yönlendiriliyorsunuz.');
        if (katilimId) {
          router.push(`/sinavlar/${katilimId}/sonuc`);
        } else {
          router.push('/sinavlar');
        }
        return;
      }
      toast.hata('Cevaplar gönderilemedi');
    },
  });

  const cevapSec = useCallback((soruId: string, secilen: string | null) => {
    if (data?.incelemeModu) return;
    setCevaplar((onceki) => ({ ...onceki, [soruId]: secilen }));
  }, [data?.incelemeModu]);

  const sinaviTamamla = useCallback(async () => {
    if (data?.incelemeModu || teslimEdiliyorRef.current || cevapGonderMutation.isPending) return;
    const cevaplanmayan = (data?.sorular || []).filter((s) => !(s.id in cevaplar)).length;

    if (cevaplanmayan > 0) {
      const devam = await confirmAsk({
        title: 'Eksik cevaplar',
        message: `${cevaplanmayan} soru boş bırakıldı. Yine de sınavı tamamlamak istiyor musunuz?`,
        variant: 'default',
        onayMetni: 'Tamamla',
        iptalMetni: 'Geri dön',
      });
      if (!devam) return;
    }

    teslimEdiliyorRef.current = true;
    cevapGonderMutation.mutate();
  }, [data?.incelemeModu, data?.sorular, cevaplar, cevapGonderMutation.isPending]);

  function soruIdToSecilen(kayit: Record<string, string | null>, soruId: string): string | null {
    return Object.prototype.hasOwnProperty.call(kayit, soruId) ? kayit[soruId] : null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Sınav yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const apiMesaji =
      axios.isAxiosError(error) &&
      error.response?.data &&
      typeof (error.response.data as { mesaj?: string }).mesaj === 'string'
        ? (error.response.data as { mesaj: string }).mesaj
        : null;

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 px-4">
        <div className="text-center max-w-md">
          <p className="text-lg font-semibold text-slate-900">Sınav açılamadı</p>
          <p className="text-sm mt-2 text-slate-600">
            {apiMesaji ??
              'Bağlantı sorunu veya oturum süresi dolmuş olabilir. Sorun sürerse yöneticiye bildirin.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button type="button" onClick={() => router.push('/sinavlar')} className="btn-primary">
              Sınavlarım
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">
              Geri
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sorular: SinavKatilSoru[] = data.sorular || [];
  const cevaplanmisSayisi = sorular.filter((s) => !!cevaplar[s.id]).length;
  const incelemeModu = !!data.incelemeModu;
  const oneriSaniye =
    sorular.length > 0 ? Math.max(1, Math.floor((data.sureDakika * 60) / sorular.length)) : null;
  const aktifSoruNo = sorular[aktifSoruIndex]?.siraNo;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 overflow-hidden">
      {incelemeModu && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-semibold text-amber-900">
          İnceleme modu: soruları tekrar görebilirsiniz. Sıralama ve analiz ilk denemenize göre kalır.
        </div>
      )}
      {/* Üst araç çubuğu */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/90 shadow-sm z-20 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 px-3 py-2.5 md:px-5 min-h-[3.25rem]">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 md:flex-none">
            <div className="inline-flex rounded-xl bg-slate-100/90 p-1 gap-0.5 border border-slate-200/60 shadow-inner">
              <button
                type="button"
                onClick={() => setGorunumModu('kitapcik')}
                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 font-medium transition-all
                  ${gorununModu === 'kitapcik' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                title="Kitapçık görünümü"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Kitapçık</span>
              </button>
              <button
                type="button"
                onClick={() => setGorunumModu('tek-sayfa')}
                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 font-medium transition-all
                  ${gorununModu === 'tek-sayfa' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                title="Tüm sorular tek sayfada"
              >
                <Layout className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Tek sayfa</span>
              </button>
              <button
                type="button"
                onClick={() => setGorunumModu('soru-soru')}
                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 font-medium transition-all
                  ${gorununModu === 'soru-soru' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                title="Tek soru"
              >
                <AlignLeft className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Soru soru</span>
              </button>
            </div>

            <div className="flex items-center rounded-lg bg-slate-100/80 border border-slate-200/60 px-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(60, z - 10))}
                className="p-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                title="Uzaklaştır"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-semibold text-slate-500 w-9 text-center tabular-nums">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className="p-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                title="Yakınlaştır"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 md:absolute md:left-1/2 md:-translate-x-1/2 md:max-w-[min(52vw,26rem)]">
            <p className="hidden sm:block text-xs md:text-sm font-semibold text-slate-800 truncate text-center leading-tight max-w-[85vw] md:max-w-none">
              {data.sinav.baslik || 'Sınav'}
            </p>
            {katilimId && !incelemeModu && (
              <>
                <SoruSureGostergesi
                  buSoruSaniye={aktifAnlikSaniye}
                  oneriSaniye={oneriSaniye}
                  soruNo={aktifSoruNo}
                />
                <SinavSayac
                  sureDakika={data.sureDakika}
                  baslangicZamani={
                    data.katilim.baslangicZamani ?? data.sinav.baslangicZamani
                  }
                  onSureDoldu={sinaviTamamla}
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {incelemeModu ? (
              <button
                type="button"
                onClick={() => katilimId && router.push(`/sinavlar/${katilimId}/sonuc`)}
                className="rounded-xl border border-indigo-200 bg-white text-indigo-700 text-sm font-semibold px-3.5 py-2 hover:bg-indigo-50 transition-colors"
              >
                Sonuçlara dön
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setOptikFormAcik(true)}
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Optik form yükle"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCevapAnahtariAcik(!cevapAnahtariAcik)}
                  className={`p-2 rounded-xl transition-colors ${
                    cevapAnahtariAcik ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/80' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={cevapAnahtariAcik ? 'Cevap kartını gizle' : 'Cevap kartını göster'}
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={sinaviTamamla}
                  disabled={cevapGonderMutation.isPending}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3.5 py-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors"
                >
                  {cevapGonderMutation.isPending ? 'Gönderiliyor…' : 'Bitir'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Ana içerik alanı */}
      <div className="flex flex-1 min-h-0 p-2 md:p-3 gap-2 md:gap-3">
        {/* Soru alanı */}
        <div className="flex-1 min-w-0 overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${100 / (zoom / 100)}%` }}>
            {gorununModu === 'kitapcik' && (
              <KitapcikGorumu
                sorular={sorular}
                cevaplar={cevaplar}
                onCevapSec={cevapSec}
                aktifSoruIndex={aktifSoruIndex}
                onSoruDegistir={soruDegistir}
                sinav={data.sinav}
              />
            )}
            {gorununModu === 'tek-sayfa' && (
              <TekSayfaGorumu
                sorular={sorular}
                cevaplar={cevaplar}
                onCevapSec={cevapSec}
              />
            )}
            {gorununModu === 'soru-soru' && (
              <SoruSoruGorumu
                sorular={sorular}
                cevaplar={cevaplar}
                onCevapSec={cevapSec}
                aktifIndex={aktifSoruIndex}
                onIndexDegistir={soruDegistir}
              />
            )}
          </div>
        </div>

        {/* Cevap anahtarı paneli */}
        {cevapAnahtariAcik && (
          <CevapAnahtari
            sorular={sorular}
            cevaplar={cevaplar}
            aktifIndex={aktifSoruIndex}
            onSoruSec={soruDegistir}
            cevaplanmisSayisi={cevaplanmisSayisi}
            sinav={data.sinav}
          />
        )}
      </div>

      {/* Optik form yükleme modalı */}
      {optikFormAcik && katilimId && (
        <OptikFormYukle
          katilimId={katilimId}
          onKapat={() => setOptikFormAcik(false)}
          onBasarili={() => {
            setOptikFormAcik(false);
            toast.basarili('Optik form yüklendi!', 'Cevaplarınız işleme alındı');
            router.push('/sinavlar');
          }}
        />
      )}
    </div>
  );
}
