'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, kullaniciApi } from '@/lib/api';
import {
  Brain,
  CheckCircle,
  Map,
  Loader2,
  Sparkles,
  Clock,
  CalendarDays,
  Zap,
  Target,
  TrendingUp,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { motion } from 'framer-motion';
import {
  CALISMA_PLANI_ACIKLAMA,
  GUNLUK_OTURUM_SAYISI,
  gorevBaslikTemizle,
  gorevBlokNoParse,
  oturumEtiketi,
  oturumSaatAraligi,
} from '@/lib/studyPlanGosterim';

interface StudyGorev {
  id: string;
  baslik: string;
  ders: string;
  konu: string;
  sureDakika: number;
  tamamlandi: boolean;
  gun: number;
  olusturuldu?: string;
}

interface StudyPlan {
  id: string;
  baslik: string;
  hedefler: { kisa: string; orta: string; uzun: string };
  gorevler: StudyGorev[];
}

const GUN_ADLARI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function dersRenk(ders: string): string {
  const d = ders.toLocaleLowerCase('tr-TR');
  if (d.includes('mat') || d.includes('geo')) return 'bg-sky-50 border-sky-100 text-sky-900';
  if (d.includes('türk') || d.includes('edeb')) return 'bg-violet-50 border-violet-100 text-violet-900';
  if (d.includes('tarih')) return 'bg-amber-50 border-amber-100 text-amber-900';
  if (d.includes('coğ')) return 'bg-emerald-50 border-emerald-100 text-emerald-900';
  if (d.includes('vatandaş') || d.includes('hukuk')) return 'bg-rose-50 border-rose-100 text-rose-900';
  if (d.includes('fizik') || d.includes('kimya') || d.includes('biyoloji') || d.includes('fen'))
    return 'bg-teal-50 border-teal-100 text-teal-900';
  return 'bg-indigo-50 border-indigo-100 text-indigo-900';
}

export default function StudyPlanSayfasi() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const otomatikOlusturuldu = useRef(false);
  const [seciliHafta, setSeciliHafta] = useState(1);

  const { data: planData, isLoading } = useQuery({
    queryKey: ['study-plan'],
    queryFn: () => kullaniciApi.studyPlanlar(),
  });

  const plan: StudyPlan = planData?.data?.veri?.[0];

  const yeniPlan = useMutation({
    mutationFn: () => aiApi.studyPlan(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-plan'] });
      toast.basarili('Çalışma planınız oluşturuldu!');
    },
    onError: () => toast.hata('Plan oluşturulamadı'),
  });

  useEffect(() => {
    if (searchParams.get('olustur') !== '1' || otomatikOlusturuldu.current || isLoading) return;
    if (!plan && !yeniPlan.isPending) {
      otomatikOlusturuldu.current = true;
      yeniPlan.mutate();
    }
  }, [searchParams, isLoading, plan, yeniPlan.isPending, yeniPlan.mutate]);

  const gorevDurumMutation = useMutation({
    mutationFn: ({ gorevId, tamamlandi }: { gorevId: string; tamamlandi: boolean }) =>
      kullaniciApi.studyGorevDurumGuncelle(gorevId, tamamlandi),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-plan'] });
    },
    onError: () => toast.hata('Görev durumu güncellenemedi'),
  });

  const gorevler = plan?.gorevler || [];
  const gunlukGorevler = useMemo(() => {
    const acc: Record<number, StudyGorev[]> = {};
    for (const gorev of gorevler) {
      if (!acc[gorev.gun]) acc[gorev.gun] = [];
      acc[gorev.gun].push(gorev);
    }
    for (const gun of Object.keys(acc)) {
      acc[Number(gun)].sort((a, b) => {
        const na = gorevBlokNoParse(a.baslik);
        const nb = gorevBlokNoParse(b.baslik);
        if (na != null && nb != null && na !== nb) return na - nb;
        if (na != null && nb == null) return -1;
        if (na == null && nb != null) return 1;
        const ta = a.olusturuldu ? new Date(a.olusturuldu).getTime() : 0;
        const tb = b.olusturuldu ? new Date(b.olusturuldu).getTime() : 0;
        if (ta !== tb) return ta - tb;
        return a.id.localeCompare(b.id);
      });
    }
    return acc;
  }, [gorevler]);

  const gunler = Object.keys(gunlukGorevler).map(Number).sort((a, b) => a - b);
  const haftalikGorevler = gunler.reduce<Record<number, number[]>>((acc, gun) => {
    const hafta = Math.ceil(gun / 7);
    if (!acc[hafta]) acc[hafta] = [];
    acc[hafta].push(gun);
    return acc;
  }, {});
  const haftalar = Object.keys(haftalikGorevler).map(Number).sort((a, b) => a - b);

  useEffect(() => {
    if (haftalar.length > 0 && !haftalar.includes(seciliHafta)) {
      setSeciliHafta(haftalar[0]);
    }
  }, [haftalar, seciliHafta]);

  const toplamGorev = gorevler.length;
  const tamamlananGorev = gorevler.filter((g) => g.tamamlandi).length;
  const kalanGorev = toplamGorev - tamamlananGorev;
  const toplamDakika = gorevler.reduce((t, g) => t + g.sureDakika, 0);
  const tamamlanmaYuzdesi = toplamGorev > 0 ? Math.round((tamamlananGorev / toplamGorev) * 100) : 0;

  const aktifHaftaGunleri = useMemo(() => {
    const baslangic = (seciliHafta - 1) * 7 + 1;
    return Array.from({ length: 7 }, (_, i) => baslangic + i);
  }, [seciliHafta]);

  const haftaGorevleri = (haftalikGorevler[seciliHafta] || []).flatMap(
    (gun) => gunlukGorevler[gun] || [],
  );
  const haftaToplam = haftaGorevleri.length;
  const haftaTamamlanan = haftaGorevleri.filter((g) => g.tamamlandi).length;
  const haftaYuzde = haftaToplam > 0 ? Math.round((haftaTamamlanan / haftaToplam) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-gray-400 text-[10px] font-bold animate-pulse uppercase tracking-wider">
          Plan Hazırlanıyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-2xl bg-indigo-900 p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase tracking-wider mb-3 border border-indigo-500/30">
              <Sparkles className="w-3 h-3" /> AI Planı
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Çalışma Planım</h1>
            <p className="text-indigo-100 mt-1.5 text-sm font-medium opacity-80 max-w-lg leading-relaxed">
              Kişiye özel 30 günlük plan · Her gün 4 oturum (45’er dk)
            </p>
          </div>

          <button
            onClick={() => yeniPlan.mutate()}
            disabled={yeniPlan.isPending}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 text-xs"
          >
            {yeniPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Plan Üret
          </button>
        </div>
      </section>

      {!plan ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm border-dashed"
        >
          <Map className="w-12 h-12 mx-auto mb-4 text-gray-100" />
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Henüz Bir Planın Yok</h2>
          <p className="text-gray-400 mt-2 max-w-sm mx-auto font-medium text-xs leading-relaxed">
            Sana özel bir yol haritası çıkarmamız için AI&apos;yı çalıştır.
          </p>
          <button
            onClick={() => yeniPlan.mutate()}
            disabled={yeniPlan.isPending}
            className="mt-6 px-8 py-3 rounded-xl bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-700 hover:text-white transition-all text-xs active:scale-95 flex items-center gap-2 mx-auto"
          >
            <Zap className="w-4 h-4" /> İlk Planını Hazırla
          </button>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Yapılan', val: tamamlananGorev, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'Kalan', val: kalanGorev, icon: Target, color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Süre', val: `${toplamDakika}dk`, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Başarı', val: `%${tamamlanmaYuzdesi}`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map((stat, i) => (
              <div key={i} className="card !p-4">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2 shadow-sm`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-xl font-bold text-gray-900 tracking-tight">{stat.val}</div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-900">Günlük çalışma düzeni</p>
                  <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed">{CALISMA_PLANI_ACIKLAMA}</p>
                </div>
              </div>

              {/* Hafta seçici */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-500" /> Haftalık takvim
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSeciliHafta((h) => Math.max(1, h - 1))}
                    disabled={seciliHafta <= 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    aria-label="Önceki hafta"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {haftalar.map((hafta) => (
                      <button
                        key={hafta}
                        type="button"
                        onClick={() => setSeciliHafta(hafta)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          seciliHafta === hafta
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        Hafta {hafta}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeciliHafta((h) => Math.min(haftalar[haftalar.length - 1] || 1, h + 1))}
                    disabled={seciliHafta >= (haftalar[haftalar.length - 1] || 1)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    aria-label="Sonraki hafta"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Hafta {seciliHafta}</p>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Gün {(seciliHafta - 1) * 7 + 1}–{Math.min(seciliHafta * 7, Math.max(...gunler, 30))} · %{haftaYuzde} tamamlandı
                    </p>
                  </div>
                  <div className="w-28 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${haftaYuzde}%` }}
                    />
                  </div>
                </div>

                {/* Masaüstü: haftalık tablo */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-r border-gray-100 w-28">
                          Oturum
                        </th>
                        {aktifHaftaGunleri.map((gun, idx) => {
                          const bugunGorev = gunlukGorevler[gun] || [];
                          const biten = bugunGorev.filter((g) => g.tamamlandi).length;
                          const varMi = bugunGorev.length > 0;
                          return (
                            <th
                              key={gun}
                              className="px-2 py-3 text-center border-b border-gray-100 min-w-[110px]"
                            >
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                {GUN_ADLARI[idx]}
                              </span>
                              <span className="block text-sm font-bold text-gray-900 mt-0.5">Gün {gun}</span>
                              {varMi && (
                                <span className="block text-[9px] font-semibold text-gray-400 mt-0.5">
                                  {biten}/{bugunGorev.length}
                                </span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: GUNLUK_OTURUM_SAYISI }, (_, oturumIdx) => {
                        const oturumNo = oturumIdx + 1;
                        return (
                          <tr key={oturumNo} className="align-top">
                            <td className="sticky left-0 z-10 bg-white px-3 py-2.5 border-b border-r border-gray-50">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                {oturumEtiketi(oturumNo)}
                              </p>
                              <p className="text-[10px] font-semibold text-gray-400 tabular-nums mt-0.5">
                                {oturumSaatAraligi(oturumNo)}
                              </p>
                            </td>
                            {aktifHaftaGunleri.map((gun) => {
                              const bugunGorev = gunlukGorevler[gun] || [];
                              const gorev = bugunGorev[oturumIdx];
                              if (!gorev) {
                                return (
                                  <td
                                    key={`${gun}-${oturumNo}`}
                                    className="px-1.5 py-1.5 border-b border-gray-50 bg-slate-50/30"
                                  >
                                    <div className="h-full min-h-[72px] rounded-lg border border-dashed border-gray-100" />
                                  </td>
                                );
                              }
                              const konuBaslik = gorevBaslikTemizle(gorev.baslik);
                              return (
                                <td
                                  key={`${gun}-${oturumNo}`}
                                  className="px-1.5 py-1.5 border-b border-gray-50"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      gorevDurumMutation.mutate({
                                        gorevId: gorev.id,
                                        tamamlandi: !gorev.tamamlandi,
                                      })
                                    }
                                    className={`w-full text-left rounded-xl border p-2.5 min-h-[72px] transition-all cursor-pointer ${
                                      gorev.tamamlandi
                                        ? 'bg-emerald-50/80 border-emerald-200 opacity-80'
                                        : `${dersRenk(gorev.ders)} hover:shadow-md hover:scale-[1.01]`
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-70 truncate">
                                        {gorev.ders}
                                      </span>
                                      {gorev.tamamlandi ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      ) : (
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-30 shrink-0" />
                                      )}
                                    </div>
                                    <p
                                      className={`text-[11px] font-bold leading-snug line-clamp-3 ${
                                        gorev.tamamlandi ? 'line-through text-emerald-800' : ''
                                      }`}
                                    >
                                      {konuBaslik}
                                    </p>
                                    <p className="text-[9px] font-semibold opacity-60 mt-1.5">
                                      {gorev.sureDakika} dk
                                    </p>
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobil: gün kartları */}
                <div className="md:hidden divide-y divide-gray-50">
                  {aktifHaftaGunleri.map((gun, idx) => {
                    const bugunGorev = gunlukGorevler[gun] || [];
                    if (bugunGorev.length === 0) return null;
                    return (
                      <div key={gun} className="p-4">
                        <div className="flex items-baseline justify-between mb-3">
                          <p className="text-sm font-bold text-gray-900">
                            {GUN_ADLARI[idx]} · Gün {gun}
                          </p>
                          <p className="text-[10px] font-semibold text-gray-400">
                            {bugunGorev.filter((g) => g.tamamlandi).length}/{bugunGorev.length}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {bugunGorev.map((gorev, oturumIdx) => {
                            const oturumNo = gorevBlokNoParse(gorev.baslik) ?? oturumIdx + 1;
                            return (
                              <button
                                key={gorev.id}
                                type="button"
                                onClick={() =>
                                  gorevDurumMutation.mutate({
                                    gorevId: gorev.id,
                                    tamamlandi: !gorev.tamamlandi,
                                  })
                                }
                                className={`w-full text-left rounded-xl border p-3 flex gap-3 transition-all ${
                                  gorev.tamamlandi
                                    ? 'bg-emerald-50/80 border-emerald-200'
                                    : `${dersRenk(gorev.ders)}`
                                }`}
                              >
                                <div className="shrink-0 pt-0.5">
                                  {gorev.tamamlandi ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <span className="block w-5 h-5 rounded-full border-2 border-current opacity-30" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                                    {oturumEtiketi(oturumNo)} · {oturumSaatAraligi(oturumNo, gorev.sureDakika)}
                                  </p>
                                  <p
                                    className={`text-sm font-bold mt-0.5 ${
                                      gorev.tamamlandi ? 'line-through text-emerald-800' : 'text-gray-900'
                                    }`}
                                  >
                                    {gorevBaslikTemizle(gorev.baslik)}
                                  </p>
                                  <p className="text-[10px] font-semibold opacity-60 mt-1">
                                    {gorev.ders} · {gorev.sureDakika} dk
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="xl:col-span-4 space-y-6">
              <div className="card !p-6 shadow-xl border-white bg-white/80">
                <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Stratejik Hedefler
                </h3>
                <div className="space-y-5">
                  {[
                    { label: 'Kısa Vade', text: plan.hedefler?.kisa, color: 'indigo' },
                    { label: 'Orta Vade', text: plan.hedefler?.orta, color: 'violet' },
                    { label: 'Sınav', text: plan.hedefler?.uzun, color: 'emerald' },
                  ].map((h, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-gray-50 group">
                      <div
                        className={`absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-white border-2 border-${h.color}-500 transition-all`}
                      />
                      <span className={`text-[8px] font-bold text-${h.color}-600 uppercase tracking-widest`}>
                        {h.label}
                      </span>
                      <p className="text-[11px] font-bold text-gray-800 mt-0.5 line-clamp-2">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card bg-indigo-600 text-white border-0 !p-6 shadow-xl">
                <h3 className="text-sm font-bold mb-4">İlerleme</h3>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tamamlanmaYuzdesi}%` }}
                    className="h-full bg-white rounded-full shadow-[0_0_10px_white]"
                  />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-2xl font-bold tracking-tight">%{tamamlanmaYuzdesi}</span>
                    <p className="text-[9px] font-bold uppercase text-indigo-200 tracking-wider">Biten</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
