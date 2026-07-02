'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, analizApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { ArrowRight, BookOpen, ExternalLink, Loader2, Sparkles, Target, TrendingDown, Timer } from 'lucide-react';
import { OgrenciSureAnaliziPanel, type SureAnaliziOgesi } from '@/components/ogrenci/OgrenciSureAnaliziPanel';

type Analiz = {
  toplamSinav: number;
  ortalamaNe: number;
  enIyiSiralama: number | null;
  zayifKonular: Array<{ konu: string; ders: string; basari: number }>;
  dersPerformanslari: Array<{ ders: string; ortalama: number; toplamSoru: number }>;
  sureAnalizleri?: SureAnaliziOgesi[];
};

type Oneri = {
  id: string;
  neden: string;
  oncelik: number;
  paket?: { id: string; ad: string; aciklama?: string | null; disUrl?: string | null; fiyat?: number | null; indirimliFiyat?: number | null } | null;
  kurs?: { id: string; baslik: string; aciklama?: string | null; url?: string | null; platform?: string | null; ders: string } | null;
};

function yuzdeRenk(y: number): string {
  if (y < 35) return 'bg-rose-500';
  if (y < 50) return 'bg-amber-500';
  if (y < 70) return 'bg-emerald-500';
  return 'bg-indigo-500';
}

function disLink(hedef?: string | null, fallbackQuery?: string) {
  if (hedef && hedef.trim().length > 3) return hedef;
  const q = encodeURIComponent((fallbackQuery || '').slice(0, 120));
  return `https://wingolink.com.tr/?q=${q}`;
}

export default function SinavAnalizOzet() {
  const qc = useQueryClient();
  const planOlustur = useMutation({
    mutationFn: () => aiApi.studyPlan(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-plan'] });
      toast.basarili('Çalışma planınız oluşturuldu!');
    },
    onError: () => toast.hata('Plan oluşturulamadı. Lütfen tekrar deneyin.'),
  });

  const { data: analizData, isLoading: analizYukleniyor } = useQuery({
    queryKey: ['analiz', 'benim'],
    queryFn: () => analizApi.benim(),
  });
  const { data: oneriData, isLoading: oneriYukleniyor } = useQuery({
    queryKey: ['analiz', 'oneriler'],
    queryFn: () => analizApi.oneriler(),
  });

  const analiz = (analizData?.data?.veri || null) as Analiz | null;
  const oneriler: Oneri[] = (oneriData?.data?.veri || []) as Oneri[];

  const zayifTop = useMemo(() => (analiz?.zayifKonular || []).slice(0, 6), [analiz]);
  const paketOnerileri = useMemo(() => oneriler.filter((o) => o.paket).slice(0, 3), [oneriler]);
  const kursOnerileri = useMemo(() => oneriler.filter((o) => o.kurs).slice(0, 3), [oneriler]);

  if (analizYukleniyor) {
    return (
      <div className="card !p-6 flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Analiz hazırlanıyor…
      </div>
    );
  }

  if (!analiz) {
    return (
      <div className="card !p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 grid place-items-center">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900">Henüz analiz oluşturulamadı</p>
            <p className="text-xs text-gray-500 mt-1">
              En az 1 sınavı <b>tamamladıktan</b> sonra zayıf konular ve öneriler burada görünür.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card !p-5">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Sınav</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{analiz.toplamSinav}</div>
        </div>
        <div className="card !p-5">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ort. Net</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{Number(analiz.ortalamaNe || 0).toFixed(1)}</div>
        </div>
        <div className="card !p-5">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">En iyi sıra</div>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {analiz.enIyiSiralama ? `#${analiz.enIyiSiralama.toLocaleString('tr-TR')}` : '—'}
          </div>
        </div>
        <div className="card !p-5">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Zayıf konu</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{analiz.zayifKonular?.length || 0}</div>
        </div>
      </div>

      {(analiz.sureAnalizleri?.length ?? 0) > 0 && (
        <div className="card !p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Timer className="w-4 h-4 text-violet-600" /> Soru süre analizi
            </h3>
            <Link href="/analiz" className="text-xs font-black text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
              Tümü <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <OgrenciSureAnaliziPanel analizler={analiz.sureAnalizleri!} compact />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card !p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-600" /> Eksik konular (öncelik)
            </h3>
            <Link href="/analiz" className="text-xs font-black text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
              Detay rapor <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {zayifTop.length === 0 ? (
            <p className="text-sm text-gray-500">Şimdilik zayıf konu tespit edilmedi. Harika gidiyorsun.</p>
          ) : (
            <div className="space-y-3">
              {zayifTop.map((z) => (
                <div key={`${z.ders}-${z.konu}`} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{z.ders}</div>
                      <div className="text-sm font-bold text-gray-900 truncate">{z.konu}</div>
                    </div>
                    <div className="text-xs font-black text-gray-500">%{Number(z.basari || 0).toFixed(0)}</div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full ${yuzdeRenk(z.basari)}`} style={{ width: `${Math.max(2, Math.min(100, z.basari))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => planOlustur.mutate()}
              disabled={planOlustur.isPending}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2 disabled:opacity-60"
            >
              {planOlustur.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Çalışma planı oluştur
            </button>
            <Link href="/study-plan" className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-black hover:bg-gray-50 inline-flex items-center gap-2">
              Planı görüntüle
            </Link>
            <Link href="/analiz" className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-black hover:bg-gray-50 inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Tüm analiz
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card !p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black text-gray-900">Paket önerileri</h3>
              {oneriYukleniyor ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : null}
            </div>
            {paketOnerileri.length === 0 ? (
              <p className="text-xs text-gray-500">Zayıf konularına göre uygun paket bulunamadı.</p>
            ) : (
              <div className="space-y-3">
                {paketOnerileri.map((o) => {
                  const p = o.paket!;
                  const link = disLink(p.disUrl, `${p.ad} ${o.neden}`);
                  return (
                    <a
                      key={o.id}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:bg-indigo-50/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-900 truncate">{p.ad}</div>
                          <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{o.neden}</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card !p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black text-gray-900">Video önerileri</h3>
              {oneriYukleniyor ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : null}
            </div>
            {kursOnerileri.length === 0 ? (
              <p className="text-xs text-gray-500">Zayıf konularına göre uygun video bulunamadı.</p>
            ) : (
              <div className="space-y-3">
                {kursOnerileri.map((o) => {
                  const k = o.kurs!;
                  const link = disLink(k.url, `${k.baslik} ${o.neden}`);
                  return (
                    <a
                      key={o.id}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-gray-100 p-4 hover:border-emerald-200 hover:bg-emerald-50/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">{k.ders}</div>
                          <div className="text-sm font-black text-gray-900 truncate">{k.baslik}</div>
                          <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{o.neden}</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

