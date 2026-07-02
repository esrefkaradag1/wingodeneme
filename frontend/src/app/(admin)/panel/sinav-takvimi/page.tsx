'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { datetimeLocalEkleDakika, isoToDatetimeLocal } from '@/lib/tarih';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Loader2,
  ExternalLink,
  Clock,
  Tag,
  Wallet,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from '@/store/toast.store';
import {
  altGrupListesi,
  gruptanSinavTuru,
  grupIdIcinEtiket,
  grupIddenSecim,
  grupSecimindenId,
  ustGrupListesi,
  type GrupSecim,
} from '@/lib/grupSinavSecim';
import { sinavTurEtiketi } from '@/lib/sinav-tur';

/** Sınav türüne göre varsayılan süre (dk) */
const SINAV_VARSAYILAN_SURE: Record<string, number> = {
  TYT: 165,
  AYT: 180,
  AYT_TYT: 180,
  LGS: 155,
  KPSS: 130,
};

const SURE_HIZLI_SECIM = [90, 120, 135, 155, 165, 180] as const;

type TakvimSinav = {
  id: string;
  baslik: string;
  aciklama?: string | null;
  tur: string;
  grupId: string;
  grup?: { id: string; ad: string; tur: string };
  baslangicZamani: string;
  bitisZamani: string;
  sureDakika: number;
  ucret?: number | null;
  indirimliUcret?: number | null;
  gosterilenFiyat?: number | null;
  takvimdeGoster: boolean;
  satinAlinabilir: boolean;
  yayinlandi: boolean;
  soruSayisi?: number;
};

type FormState = ReturnType<typeof bosForm>;

function bitisHesapla(baslangicZamani: string, sureDakika: number) {
  return datetimeLocalEkleDakika(baslangicZamani, sureDakika);
}

function formZamanSenkron(f: FormState, patch: Partial<FormState>): FormState {
  const next = { ...f, ...patch };
  const sure = Math.max(1, Number(next.sureDakika) || 120);
  next.sureDakika = sure;
  if (next.baslangicZamani) {
    next.bitisZamani = bitisHesapla(next.baslangicZamani, sure);
  }
  return next;
}

function gunBaslangicBitis(gun: Date, saat = '10:00', sureDakika = 120) {
  const [h, m] = saat.split(':').map(Number);
  const baslangic = new Date(gun);
  baslangic.setHours(h, m, 0, 0);
  const bitis = new Date(baslangic.getTime() + sureDakika * 60 * 1000);
  return { baslangic, bitis };
}

const bosForm = (gun?: Date, tur = 'LGS') => {
  const sureDakika = SINAV_VARSAYILAN_SURE[tur] ?? 120;
  const { baslangic, bitis } = gun ? gunBaslangicBitis(gun, '10:00', sureDakika) : gunBaslangicBitis(new Date(), '10:00', sureDakika);
  return {
    baslik: '',
    aciklama: '',
    tur,
    grupId: '',
    baslangicZamani: isoToDatetimeLocal(baslangic.toISOString()),
    bitisZamani: isoToDatetimeLocal(bitis.toISOString()),
    sureDakika,
    ucret: '',
    indirimliUcret: '',
    takvimdeGoster: true,
    satinAlinabilir: true,
    yayinlandi: true,
  };
};

export default function AdminSinavTakvimiSayfasi() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<TakvimSinav | null>(null);
  const [form, setForm] = useState(bosForm());
  const [seciliUstGrupId, setSeciliUstGrupId] = useState('');
  const [seciliAltGrupId, setSeciliAltGrupId] = useState('');

  const yil = currentDate.getFullYear();
  const ay = currentDate.getMonth() + 1;

  const { data: gruplarRes } = useQuery({
    queryKey: ['admin-gruplar'],
    queryFn: () => adminApi.gruplar(),
  });
  const gruplar = (gruplarRes?.data?.veri || []) as GrupSecim[];
  const ustGruplar = useMemo(() => ustGrupListesi(gruplar), [gruplar]);
  const altGruplar = useMemo(() => altGrupListesi(gruplar, seciliUstGrupId), [gruplar, seciliUstGrupId]);
  const effectiveGrupId = grupSecimindenId(seciliUstGrupId, seciliAltGrupId);

  useEffect(() => {
    if (!modalAcik || !duzenlenen || gruplar.length === 0) return;
    const { ustGrupId, altGrupId } = grupIddenSecim(duzenlenen.grupId, gruplar);
    setSeciliUstGrupId(ustGrupId);
    setSeciliAltGrupId(altGrupId);
  }, [modalAcik, duzenlenen, gruplar]);

  useEffect(() => {
    if (!modalAcik || duzenlenen || seciliUstGrupId || ustGruplar.length === 0) return;
    setSeciliUstGrupId(ustGruplar[0].id);
  }, [modalAcik, duzenlenen, seciliUstGrupId, ustGruplar]);

  useEffect(() => {
    if (!modalAcik || !effectiveGrupId) return;
    const grup = gruplar.find((g) => g.id === effectiveGrupId);
    if (!grup) return;
    const tur = gruptanSinavTuru(grup, gruplar);
    const varsayilanSure = SINAV_VARSAYILAN_SURE[tur] ?? 120;
    setForm((f) => {
      if (f.grupId === effectiveGrupId && f.tur === tur) return f;
      return formZamanSenkron(f, { grupId: effectiveGrupId, tur, sureDakika: varsayilanSure });
    });
  }, [modalAcik, effectiveGrupId, gruplar]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sinav-takvim', yil, ay],
    queryFn: () => adminApi.sinavTakvim({ yil, ay }),
  });

  const sinavlar = (data?.data?.veri || []) as TakvimSinav[];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const kaydetMutation = useMutation({
    mutationFn: async () => {
      if (!seciliUstGrupId?.trim()) {
        throw new Error('Lütfen üst grup seçin');
      }
      if (!form.baslangicZamani || !form.bitisZamani) {
        throw new Error('Başlangıç ve bitiş zamanı gerekli');
      }

      const govde = {
        baslik: form.baslik.trim(),
        aciklama: form.aciklama.trim() || null,
        tur: form.tur,
        grupId: form.grupId.trim(),
        baslangicZamani: new Date(form.baslangicZamani).toISOString(),
        bitisZamani: new Date(form.bitisZamani).toISOString(),
        sureDakika: Number(form.sureDakika) || 120,
        ucret: form.ucret === '' ? null : Number(form.ucret),
        indirimliUcret: form.indirimliUcret === '' ? null : Number(form.indirimliUcret),
        takvimdeGoster: form.takvimdeGoster,
        satinAlinabilir: form.satinAlinabilir,
        yayinlandi: form.yayinlandi,
      };

      if (duzenlenen) {
        return adminApi.sinavTakvimGuncelle(duzenlenen.id, govde);
      }
      return adminApi.sinavTakvimOlustur(govde);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sinav-takvim'] });
      toast.basarili(duzenlenen ? 'Sınav güncellendi' : 'Sınav takvime eklendi');
      modalKapat();
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        (err instanceof Error ? err.message : 'Kayıt başarısız');
      toast.hata(String(mesaj));
    },
  });

  const silMutation = useMutation({
    mutationFn: (id: string) => adminApi.sinavTakvimSil(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sinav-takvim'] });
      toast.basarili('Sınav silindi');
      modalKapat();
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || 'Silme başarısız';
      toast.hata(String(mesaj));
    },
  });

  const getDayEvents = (day: Date) =>
    sinavlar.filter((s) => isSameDay(new Date(s.baslangicZamani), day));

  const modalAc = (gun?: Date, sinav?: TakvimSinav) => {
    if (sinav) {
      setDuzenlenen(sinav);
      const { ustGrupId, altGrupId } = grupIddenSecim(sinav.grupId, gruplar);
      setSeciliUstGrupId(ustGrupId);
      setSeciliAltGrupId(altGrupId);
      setForm(
        formZamanSenkron(bosForm(undefined, sinav.tur), {
          baslik: sinav.baslik,
          aciklama: sinav.aciklama || '',
          tur: sinav.tur,
          grupId: sinav.grupId,
          baslangicZamani: isoToDatetimeLocal(sinav.baslangicZamani),
          bitisZamani: isoToDatetimeLocal(sinav.bitisZamani),
          sureDakika: sinav.sureDakika,
          ucret: sinav.ucret != null ? String(sinav.ucret) : '',
          indirimliUcret: sinav.indirimliUcret != null ? String(sinav.indirimliUcret) : '',
          takvimdeGoster: sinav.takvimdeGoster,
          satinAlinabilir: sinav.satinAlinabilir,
          yayinlandi: sinav.yayinlandi,
        })
      );
    } else {
      setDuzenlenen(null);
      const f = bosForm(gun);
      const ilkUst = ustGruplar[0];
      if (ilkUst) {
        setSeciliUstGrupId(ilkUst.id);
        setSeciliAltGrupId('');
        f.grupId = ilkUst.id;
        f.tur = gruptanSinavTuru(ilkUst, gruplar);
        f.sureDakika = SINAV_VARSAYILAN_SURE[f.tur] ?? f.sureDakika;
        if (f.baslangicZamani) {
          f.bitisZamani = bitisHesapla(f.baslangicZamani, f.sureDakika);
        }
      } else {
        setSeciliUstGrupId('');
        setSeciliAltGrupId('');
      }
      setForm(f);
    }
    setModalAcik(true);
  };

  const modalKapat = () => {
    setModalAcik(false);
    setDuzenlenen(null);
    setSeciliUstGrupId('');
    setSeciliAltGrupId('');
  };

  const bitisOnizleme = useMemo(() => {
    if (!form.bitisZamani) return '';
    const d = new Date(form.bitisZamani);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, 'd MMMM yyyy HH:mm', { locale: tr });
  }, [form.bitisZamani]);

  const yaklasanlar = useMemo(
    () =>
      [...sinavlar]
        .filter((s) => new Date(s.baslangicZamani) >= new Date())
        .sort((a, b) => new Date(a.baslangicZamani).getTime() - new Date(b.baslangicZamani).getTime())
        .slice(0, 6),
    [sinavlar]
  );

  return (
    <div className="space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold uppercase tracking-wider mb-3 border border-violet-500/30">
              <CalendarIcon className="w-3 h-3" /> Admin Takvim
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Sınav Takvimi Yönetimi</h1>
            <p className="text-slate-400 mt-2 text-sm font-medium opacity-80 max-w-lg">
              Deneme oturumlarını takvime ekleyin; ücret, tarih ve yayın ayarlarını buradan yönetin. Öğrenciler takvimde görür ve satın alabilir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => modalAc()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Yeni Sınav
            </button>
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
              <button type="button" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 text-sm font-bold min-w-[120px] text-center uppercase tracking-widest">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
              </span>
              <button type="button" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8">
          <div className="card !p-0 overflow-hidden shadow-xl border-white ring-1 ring-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
                    <div key={d} className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    const events = getDayEvents(day);
                    const isTdy = isToday(day);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => modalAc(day)}
                        className={`min-h-[110px] p-2 border-r border-b border-gray-50 text-left transition-colors hover:bg-violet-50/40 ${!isSameMonth(day, monthStart) ? 'opacity-20' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-lg ${isTdy ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-900'}`}>
                            {format(day, 'd')}
                          </span>
                          {events.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                        </div>
                        <div className="space-y-1">
                          {events.slice(0, 2).map((e) => (
                            <div
                              key={e.id}
                              role="button"
                              tabIndex={0}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                modalAc(undefined, e);
                              }}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') {
                                  ev.stopPropagation();
                                  modalAc(undefined, e);
                                }
                              }}
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-50 text-violet-700 border border-violet-100 truncate"
                            >
                              {e.baslik}
                              {e.gosterilenFiyat != null ? ` · ${e.gosterilenFiyat}₺` : ''}
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="xl:col-span-4 space-y-6">
          <div className="card !p-6 shadow-xl border-white bg-white/80">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Bu Ay ({sinavlar.length})</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {sinavlar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => modalAc(undefined, s)}
                  className="w-full text-left p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-violet-200 transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-bold text-violet-600 uppercase">
                      {grupIdIcinEtiket(s.grupId, gruplar) || sinavTurEtiketi(s.tur)}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">{format(new Date(s.baslangicZamani), 'd MMM HH:mm', { locale: tr })}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-900 mt-1 line-clamp-1">{s.baslik}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {s.gosterilenFiyat != null ? `${s.gosterilenFiyat.toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                    {s.yayinlandi ? ' · Yayında' : ' · Taslak'}
                  </p>
                </button>
              ))}
              {sinavlar.length === 0 && !isLoading && (
                <p className="text-center py-8 text-[10px] font-bold text-gray-400 uppercase">Bu ay sınav yok</p>
              )}
            </div>
          </div>

          {yaklasanlar.length > 0 && (
            <div className="card p-6 border-white bg-violet-50/50">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Yaklaşan</h3>
              <ul className="space-y-2 text-xs text-gray-700">
                {yaklasanlar.map((s) => (
                  <li key={s.id}>{format(new Date(s.baslangicZamani), 'd MMM', { locale: tr })} — {s.baslik}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shrink-0">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_55%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3 h-3" />
                    {duzenlenen ? 'Düzenleme' : 'Yeni Oturum'}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {duzenlenen ? 'Sınav Düzenle' : 'Takvime Sınav Ekle'}
                  </h2>
                  <p className="text-violet-100 text-sm mt-1 opacity-90">
                    Başlangıç saatini girin; bitiş süreye göre otomatik hesaplanır.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={modalKapat}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form
              className="overflow-y-auto flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                kaydetMutation.mutate();
              }}
            >
              <div className="p-6 space-y-5">
                {/* Genel */}
                <section className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Tag className="w-3.5 h-3.5 text-violet-500" /> Genel Bilgiler
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Sınav Başlığı</label>
                    <input
                      required
                      value={form.baslik}
                      onChange={(e) => setForm((f) => ({ ...f, baslik: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                      placeholder="LGS Örnek Deneme"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">Üst Grup</label>
                      <select
                        required
                        value={seciliUstGrupId}
                        onChange={(e) => {
                          setSeciliUstGrupId(e.target.value);
                          setSeciliAltGrupId('');
                        }}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                      >
                        <option value="">Üst grup seçin</option>
                        {ustGruplar.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.ad}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600">Alt Grup</label>
                      <select
                        value={seciliAltGrupId}
                        onChange={(e) => setSeciliAltGrupId(e.target.value)}
                        disabled={!seciliUstGrupId || altGruplar.length === 0}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="">
                          {altGruplar.length === 0 ? 'Alt grup yok' : 'Alt grup seçin'}
                        </option>
                        {altGruplar.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.ad}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {effectiveGrupId && (
                    <p className="text-xs text-gray-500">
                      Sınav türü: <strong className="text-violet-700">{sinavTurEtiketi(form.tur)}</strong>
                      {' '}— seçilen gruba göre otomatik belirlenir.
                    </p>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Açıklama</label>
                    <textarea
                      rows={2}
                      value={form.aciklama}
                      onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                      placeholder="Öğrencilere görünecek kısa açıklama…"
                    />
                  </div>
                </section>

                {/* Zamanlama */}
                <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" /> Zamanlama
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">Başlangıç</label>
                      <input
                        type="datetime-local"
                        required
                        value={form.baslangicZamani}
                        onChange={(e) =>
                          setForm((f) => formZamanSenkron(f, { baslangicZamani: e.target.value }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                        Bitiş
                        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                          Otomatik
                        </span>
                      </label>
                      <input
                        type="datetime-local"
                        readOnly
                        tabIndex={-1}
                        value={form.bitisZamani}
                        className="mt-1.5 w-full rounded-xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-sm font-semibold text-violet-800 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600">Süre (dakika)</label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {SURE_HIZLI_SECIM.map((dk) => (
                        <button
                          key={dk}
                          type="button"
                          onClick={() => setForm((f) => formZamanSenkron(f, { sureDakika: dk }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            form.sureDakika === dk
                              ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                              : 'bg-white border border-violet-100 text-violet-700 hover:border-violet-300'
                          }`}
                        >
                          {dk} dk
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={form.sureDakika}
                      onChange={(e) =>
                        setForm((f) =>
                          formZamanSenkron(f, { sureDakika: Math.max(1, Number(e.target.value) || 1) })
                        )
                      }
                      className="mt-2 w-full sm:w-32 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>

                  {bitisOnizleme && (
                    <div className="flex items-center gap-2 rounded-xl bg-white border border-violet-100 px-4 py-3 text-sm">
                      <Clock className="w-4 h-4 text-violet-500 shrink-0" />
                      <span className="text-gray-600">
                        Oturum <strong className="text-gray-900">{form.sureDakika} dk</strong> sürer, bitiş:{' '}
                        <strong className="text-violet-700">{bitisOnizleme}</strong>
                      </span>
                    </div>
                  )}
                </section>

                {/* Fiyat */}
                <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-widest">
                    <Wallet className="w-3.5 h-3.5" /> Fiyatlandırma
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">Liste Fiyatı (₺)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.ucret}
                        onChange={(e) => setForm((f) => ({ ...f, ucret: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        placeholder="199"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600">İndirimli Fiyat (₺)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.indirimliUcret}
                        onChange={(e) => setForm((f) => ({ ...f, indirimliUcret: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        placeholder="149"
                      />
                    </div>
                  </div>
                </section>

                {/* Yayın */}
                <section className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Settings2 className="w-3.5 h-3.5 text-gray-400" /> Yayın Ayarları
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'yayinlandi', label: 'Yayınla', desc: 'Öğrencilere görünür' },
                        { key: 'takvimdeGoster', label: 'Takvimde göster', desc: 'Ajandada listelenir' },
                        { key: 'satinAlinabilir', label: 'Satın alınabilir', desc: 'Tek sınav satışı açık' },
                      ] as const
                    ).map(({ key, label, desc }) => {
                      const checked = form[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                          className={`text-left rounded-xl border px-3 py-3 transition-all ${
                            checked
                              ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                                checked ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            >
                              {checked ? '✓' : ''}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{label}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 pl-6">{desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Footer actions */}
              <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 backdrop-blur px-6 py-4 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={kaydetMutation.isPending}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3 px-5 shadow-lg shadow-violet-500/25 transition-all disabled:opacity-60"
                >
                  {kaydetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {duzenlenen ? 'Değişiklikleri Kaydet' : 'Takvime Ekle'}
                </button>
                {duzenlenen && (
                  <>
                    <Link
                      href={`/panel/sinavlar/${duzenlenen.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="w-4 h-4" /> Sorular
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Bu sınavı silmek istediğinize emin misiniz?')) {
                          silMutation.mutate(duzenlenen.id);
                        }
                      }}
                      disabled={silMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" /> Sil
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
