'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Trophy, Target, CheckCircle2, XCircle, MinusCircle,
} from 'lucide-react';
import { veliApi } from '@/lib/api';
import { veliOgrenciYolu } from '@/components/veli/VeliOgrenciShell';
import { SoruHtmlMath } from '@/components/admin/SoruHtmlMath';
import {
  VeliSayfa, VeliStatKart, VeliPanel, VeliBadge, VeliButon, VeliYukleniyor, VeliHero,
} from '@/components/veli/VeliUI';

export default function VeliOgrenciSonucPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;
  const katilimId = params?.katilimId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['veli-ogrenci-sonuc', ogrenciId, katilimId],
    queryFn: async () => (await veliApi.ogrenciSonuc(ogrenciId, katilimId)).data.veri,
    enabled: !!ogrenciId && !!katilimId,
  });

  if (isLoading) return <VeliYukleniyor mesaj="Sonuç analizi hazırlanıyor…" />;

  if (error || !data) {
    return (
      <VeliSayfa>
        <VeliPanel className="max-w-md mx-auto text-center border-rose-100 bg-rose-50/30">
          <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="font-bold text-gray-900">Sonuç yüklenemedi</p>
          <VeliButon href={veliOgrenciYolu(ogrenciId, '/sinavlar')} variant="ghost" className="mt-4">
            Sınavlara dön
          </VeliButon>
        </VeliPanel>
      </VeliSayfa>
    );
  }

  const k = data as {
    sinav: { baslik: string; tur: string };
    dogruSayisi: number; yanlisSayisi: number; bosSayisi: number;
    netPuan: number; hamPuan: number; ulusalSiralama: number | null;
    kazanimAnalizi?: Array<{ kazanim: string; ders: string; konu: string; basariYuzdesi: number; dogru: number; yanlis: number; bos: number }>;
    cevaplar: Array<{ soruId: string; secilen: string | null; dogru: boolean | null; soru: { siraNo: number; metinHtml: string; dogruCevap: string; konu: { ad: string; ders: string } } }>;
  };

  const cevaplarSirali = [...(k.cevaplar || [])].sort((a, b) => a.soru.siraNo - b.soru.siraNo);

  return (
    <VeliSayfa>
      <VeliButon href={veliOgrenciYolu(ogrenciId, '/sinavlar')} variant="ghost" className="!px-0 -mt-2">
        <ArrowLeft className="w-4 h-4" /> Sınavlara dön
      </VeliButon>

      <VeliHero
        baslik={k.sinav.baslik}
        rozet={k.sinav.tur}
        aciklama={`Net: ${k.netPuan.toFixed(2)} · Başarı: %${k.hamPuan.toFixed(1)}${k.ulusalSiralama ? ` · Sıra: #${k.ulusalSiralama.toLocaleString('tr-TR')}` : ''}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <VeliStatKart ikon={CheckCircle2} etiket="Doğru" deger={k.dogruSayisi} ton="emerald" />
        <VeliStatKart ikon={XCircle} etiket="Yanlış" deger={k.yanlisSayisi} ton="rose" />
        <VeliStatKart ikon={MinusCircle} etiket="Boş" deger={k.bosSayisi} ton="slate" />
        <VeliStatKart ikon={Trophy} etiket="Sıralama" deger={k.ulusalSiralama ? `#${k.ulusalSiralama.toLocaleString('tr-TR')}` : '—'} ton="amber" />
      </div>

      {(k.kazanimAnalizi ?? []).length > 0 && (
        <VeliPanel>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-violet-600" /> Kazanım analizi
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {k.kazanimAnalizi!.slice(0, 10).map((ka) => {
              const renk = ka.basariYuzdesi >= 70 ? 'border-emerald-100 bg-emerald-50/40' : ka.basariYuzdesi >= 50 ? 'border-amber-100 bg-amber-50/40' : 'border-rose-100 bg-rose-50/40';
              return (
                <div key={`${ka.ders}-${ka.konu}-${ka.kazanim}`} className={`rounded-xl border p-4 ${renk}`}>
                  <p className="text-[10px] font-bold text-violet-600 uppercase">{ka.ders} · {ka.konu}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1 leading-snug">{ka.kazanim}</p>
                  <p className="text-xs text-gray-600 mt-2">Başarı %{ka.basariYuzdesi.toFixed(0)} · D:{ka.dogru} Y:{ka.yanlis} B:{ka.bos}</p>
                </div>
              );
            })}
          </div>
        </VeliPanel>
      )}

      <VeliPanel padding={false}>
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Soru listesi ({cevaplarSirali.length})</h2>
        </div>
        <div className="divide-y divide-gray-50 max-h-[640px] overflow-y-auto">
          {cevaplarSirali.map((c) => (
            <div
              key={c.soruId}
              className={`p-4 sm:p-5 ${
                c.dogru === true ? 'bg-emerald-50/20' : c.dogru === false ? 'bg-rose-50/20' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-bold text-gray-900">Soru {c.soru.siraNo}</span>
                <VeliBadge ton={c.dogru === true ? 'emerald' : c.dogru === false ? 'rose' : 'gray'}>
                  {c.dogru === true ? 'Doğru' : c.dogru === false ? 'Yanlış' : 'Boş'}
                </VeliBadge>
              </div>
              <SoruHtmlMath html={c.soru.metinHtml} className="text-sm prose prose-sm max-w-none" />
              {c.dogru === false && (
                <p className="text-xs text-rose-700 mt-2 font-medium">
                  Seçim: {c.secilen || '—'} · Doğru: {c.soru.dogruCevap}
                </p>
              )}
            </div>
          ))}
        </div>
      </VeliPanel>
    </VeliSayfa>
  );
}
