'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { soruYazariApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';

type Durum = 'YENI' | 'INCELENIYOR' | 'GORUSULDU' | 'KABUL' | 'RED';

type Basvuru = {
  id: string;
  ad: string;
  soyad: string;
  dogumTarihi: string | null;
  email: string;
  telefon: string;
  universite: string;
  fakulte: string | null;
  bolum: string | null;
  mezuniyetYili: number | null;
  deneyimYili: number | null;
  branslar: Array<{ kademe: string; etiket: string; branslar: string[] }>;
  bransSayisi: number;
  soruBasinaUcret: number;
  aylikSoruKapasitesi: number | null;
  aylikTahminiTutar: number | null;
  ornekCalismaUrl: string | null;
  aciklama: string | null;
  durum: Durum;
  adminNotu: string | null;
  kararTarihi: string | null;
  olusturuldu: string;
  hesap: {
    kullaniciId: string;
    rol: 'TEACHER' | 'KOC';
    rolEtiket: string;
    email: string;
    referansKod: string | null;
    indirimKodlari: Array<{
      id: string;
      kod: string;
      indirimTipi: 'YUZDE' | 'TUTAR';
      indirimDegeri: number;
      komisyonTipi: 'YUZDE' | 'TUTAR';
      komisyonDegeri: number;
      aktif: boolean;
    }>;
  } | null;
};

const SEKMELER: Array<{ deger: Durum | ''; etiket: string; ikon: typeof Clock }> = [
  { deger: 'YENI', etiket: 'Yeni', ikon: Clock },
  { deger: 'INCELENIYOR', etiket: 'İnceleniyor', ikon: Search },
  { deger: 'GORUSULDU', etiket: 'Görüşüldü', ikon: MessageSquare },
  { deger: 'KABUL', etiket: 'Kabul', ikon: UserCheck },
  { deger: 'RED', etiket: 'Red', ikon: XCircle },
  { deger: '', etiket: 'Tümü', ikon: Users },
];

const DURUM_STIL: Record<Durum, string> = {
  YENI: 'bg-amber-50 text-amber-700 border-amber-200',
  INCELENIYOR: 'bg-sky-50 text-sky-700 border-sky-200',
  GORUSULDU: 'bg-violet-50 text-violet-700 border-violet-200',
  KABUL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const DURUM_ETIKET: Record<Durum, string> = {
  YENI: 'Yeni',
  INCELENIYOR: 'İnceleniyor',
  GORUSULDU: 'Görüşüldü',
  KABUL: 'Kabul edildi',
  RED: 'Reddedildi',
};

function tl(d: number) {
  return `${(d ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

function hataMesaji(err: unknown, varsayilan: string) {
  return (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || varsayilan;
}

function yasHesapla(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function oranMetni(tip: 'YUZDE' | 'TUTAR', deger: number) {
  return tip === 'TUTAR' ? tl(deger) : `%${deger}`;
}

function kodOner(ad: string, soyad: string) {
  const tr: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  const ham = `${soyad}${ad}`
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (c) => tr[c] || c)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
  return ham.length >= 3 ? ham : 'WINGO';
}

export default function SoruYazariBasvurulariSayfasi() {
  const qc = useQueryClient();
  const [sekme, setSekme] = useState<Durum | ''>('YENI');
  const [q, setQ] = useState('');
  const [notModal, setNotModal] = useState<{ basvuru: Basvuru; durum: Durum } | null>(null);
  const [kabulModal, setKabulModal] = useState<Basvuru | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['soru-yazari-basvurulari', sekme, q],
    queryFn: () => soruYazariApi.adminListe({ durum: sekme || undefined, q: q.trim() || undefined }),
  });

  const basvurular: Basvuru[] = data?.data?.veri?.basvurular || [];
  const sayilar = (data?.data?.veri?.sayilar || {}) as Record<string, number>;
  const ozet = data?.data?.veri?.ozet as
    | { toplam: number; ortalamaUcret: number; enDusukUcret: number; enYuksekUcret: number }
    | undefined;

  const tazele = () => qc.invalidateQueries({ queryKey: ['soru-yazari-basvurulari'] });

  const durumMut = useMutation({
    mutationFn: ({ id, durum, not }: { id: string; durum: Durum; not?: string }) =>
      soruYazariApi.adminDurum(id, durum, not),
    onSuccess: (_v, d) => {
      toast.basarili(`Başvuru «${DURUM_ETIKET[d.durum]}» olarak işaretlendi`);
      setNotModal(null);
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Güncellenemedi')),
  });

  const silMut = useMutation({
    mutationFn: (id: string) => soruYazariApi.adminSil(id),
    onSuccess: () => {
      toast.basarili('Başvuru silindi');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Silinemedi')),
  });

  const toplam = Object.values(sayilar).reduce((s, x) => s + (x || 0), 0);

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-300">
            <BadgeCheck className="h-4 w-4" /> İş birliği
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Soru Yazarı Başvuruları</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Başvuruyu öğretmen veya koç hesabı olarak kabul edin. Kabul sırasında öğrenci indirim kodu ve
            komisyon oranı da tanımlanır.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">Toplam {toplam} başvuru</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { etiket: 'Bu filtrede', deger: String(ozet?.toplam ?? 0), ikon: Users, kutu: 'bg-indigo-50 text-indigo-600' },
          { etiket: 'Ortalama talep', deger: tl(ozet?.ortalamaUcret ?? 0), ikon: Wallet, kutu: 'bg-emerald-50 text-emerald-600' },
          { etiket: 'En düşük', deger: tl(ozet?.enDusukUcret ?? 0), ikon: TrendingUp, kutu: 'bg-sky-50 text-sky-600' },
          { etiket: 'En yüksek', deger: tl(ozet?.enYuksekUcret ?? 0), ikon: TrendingUp, kutu: 'bg-amber-50 text-amber-600' },
        ].map((k) => (
          <div key={k.etiket} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.kutu}`}>
                <k.ikon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.etiket}</p>
                <p className="truncate text-xl font-black text-gray-900">{k.deger}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ad, e-posta, üniversite veya bölüm ara…"
            className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-12 pr-4 text-sm font-bold shadow-sm"
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
        {SEKMELER.map((t) => {
          const aktif = sekme === t.deger;
          const adet = t.deger ? sayilar[t.deger] ?? 0 : toplam;
          return (
            <button
              key={t.etiket}
              onClick={() => setSekme(t.deger)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                aktif ? 'bg-slate-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <t.ikon className="h-4 w-4" />
              {t.etiket}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${aktif ? 'bg-white/15' : 'bg-gray-100 text-gray-500'}`}>
                {adet}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : basvurular.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-black text-gray-900">Başvuru yok</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bu filtrede başvuru bulunmuyor. Yeni başvurular /bizimle-calisin sayfasından gelir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {basvurular.map((b) => {
            const yas = yasHesapla(b.dogumTarihi);
            return (
              <div key={b.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900">
                        {b.ad} {b.soyad}
                      </h3>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DURUM_STIL[b.durum]}`}>
                        {DURUM_ETIKET[b.durum]}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {b.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {b.telefon}
                      </span>
                      {yas != null && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> {yas} yaşında
                        </span>
                      )}
                      <span>{format(new Date(b.olusturuldu), 'd MMM yyyy', { locale: tr })}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Soru başına</p>
                    <p className="text-2xl font-black text-indigo-700">{tl(b.soruBasinaUcret)}</p>
                    {b.aylikSoruKapasitesi && (
                      <p className="text-[11px] font-bold text-indigo-500">
                        ayda {b.aylikSoruKapasitesi} soru → {tl(b.aylikTahminiTutar ?? 0)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <Building2 className="h-3 w-3" /> Üniversite
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-gray-800">{b.universite}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fakülte / bölüm</p>
                    <p className="mt-0.5 text-xs font-bold text-gray-800">
                      {[b.fakulte, b.bolum].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mezuniyet / deneyim</p>
                    <p className="mt-0.5 text-xs font-bold text-gray-800">
                      {b.mezuniyetYili ?? '—'}
                      {b.deneyimYili != null ? ` · ${b.deneyimYili} yıl` : ''}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Branş sayısı</p>
                    <p className="mt-0.5 text-xs font-bold text-gray-800">{b.bransSayisi}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Soru hazırlayabileceği branşlar
                  </p>
                  <div className="space-y-1.5">
                    {b.branslar.map((g) => (
                      <div key={g.kademe} className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                          {g.etiket}
                        </span>
                        {g.branslar.map((brans) => (
                          <span key={brans} className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                            {brans}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {b.aciklama && (
                  <p className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
                    {b.aciklama}
                  </p>
                )}
                {b.hesap && (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      {b.hesap.rolEtiket} hesabı · {b.hesap.email}
                      {b.hesap.referansKod ? ` · referans ${b.hesap.referansKod}` : ''}
                    </p>
                    {b.hesap.indirimKodlari.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {b.hesap.indirimKodlari.map((k) => (
                          <li key={k.id} className="text-xs font-bold text-emerald-900">
                            {k.kod}
                            <span className="ml-2 font-semibold text-emerald-700">
                              indirim {oranMetni(k.indirimTipi, k.indirimDegeri)} · komisyon{' '}
                              {oranMetni(k.komisyonTipi, k.komisyonDegeri)}
                              {k.aktif ? '' : ' · pasif'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-800">Henüz indirim kodu yok.</p>
                    )}
                  </div>
                )}
                {b.adminNotu && (
                  <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                    <span className="font-bold">Yönetici notu: </span>
                    {b.adminNotu}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                  {b.ornekCalismaUrl && (
                    <a
                      href={b.ornekCalismaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Örnek çalışma
                    </a>
                  )}
                  <a
                    href={`mailto:${b.email}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Mail className="h-3.5 w-3.5" /> E-posta gönder
                  </a>

                  <div className="ml-auto flex flex-wrap gap-2">
                    {b.durum !== 'INCELENIYOR' && b.durum !== 'KABUL' && (
                      <button
                        onClick={() => durumMut.mutate({ id: b.id, durum: 'INCELENIYOR' })}
                        className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100"
                      >
                        İncelemeye al
                      </button>
                    )}
                    {b.durum !== 'GORUSULDU' && (
                      <button
                        onClick={() => durumMut.mutate({ id: b.id, durum: 'GORUSULDU' })}
                        className="rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
                      >
                        Görüşüldü
                      </button>
                    )}
                    {b.durum !== 'RED' && (
                      <button
                        onClick={() => setKabulModal(b)}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        {b.hesap ? 'İndirim kodu ekle' : 'Öğretmen / koç olarak kabul et'}
                      </button>
                    )}
                    {b.durum !== 'RED' && (
                      <button
                        onClick={() => setNotModal({ basvuru: b, durum: 'RED' })}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        Reddet
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`${b.ad} ${b.soyad} başvurusu silinsin mi?`)) silMut.mutate(b.id);
                      }}
                      className="rounded-xl border border-gray-200 p-2 text-gray-400 hover:border-rose-200 hover:text-rose-600"
                      title="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {notModal && (
        <NotModal
          baslik="Başvuruyu reddet"
          isim={`${notModal.basvuru.ad} ${notModal.basvuru.soyad}`}
          bekliyor={durumMut.isPending}
          kapat={() => setNotModal(null)}
          kaydet={(not) => durumMut.mutate({ id: notModal.basvuru.id, durum: notModal.durum, not })}
        />
      )}

      {kabulModal && (
        <KabulModal
          basvuru={kabulModal}
          kapat={() => setKabulModal(null)}
          bitti={() => {
            setKabulModal(null);
            tazele();
          }}
        />
      )}
    </div>
  );
}

type KabulSonuc = {
  yeniHesap: boolean;
  geciciSifre: string | null;
  epostaGonderildi: boolean;
  referansKod: string | null;
  indirimKodu: { kod: string; indirimTipi: 'YUZDE' | 'TUTAR'; indirimDegeri: number; komisyonTipi: 'YUZDE' | 'TUTAR'; komisyonDegeri: number };
};

function KabulModal({
  basvuru,
  kapat,
  bitti,
}: {
  basvuru: Basvuru;
  kapat: () => void;
  bitti: () => void;
}) {
  const hesapVar = Boolean(basvuru.hesap);
  const [rol, setRol] = useState<'TEACHER' | 'KOC'>(basvuru.hesap?.rol === 'KOC' ? 'KOC' : 'TEACHER');
  const [kod, setKod] = useState(kodOner(basvuru.ad, basvuru.soyad));
  const [indirimTipi, setIndirimTipi] = useState<'YUZDE' | 'TUTAR'>('YUZDE');
  const [indirimDegeri, setIndirimDegeri] = useState('10');
  const [komisyonTipi, setKomisyonTipi] = useState<'YUZDE' | 'TUTAR'>('YUZDE');
  const [komisyonDegeri, setKomisyonDegeri] = useState('10');
  const [not, setNot] = useState(basvuru.adminNotu || '');
  const [sonuc, setSonuc] = useState<KabulSonuc | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      soruYazariApi.adminKabul(basvuru.id, {
        rol,
        kod: kod.trim(),
        indirimTipi,
        indirimDegeri: Number(indirimDegeri),
        komisyonTipi,
        komisyonDegeri: Number(komisyonDegeri),
        adminNotu: not.trim(),
      }),
    onSuccess: (res) => {
      const veri = res.data.veri as KabulSonuc;
      setSonuc(veri);
      toast.basarili(veri.yeniHesap ? 'Hesap açıldı, kod ve komisyon tanımlandı' : 'İndirim kodu ve komisyon tanımlandı');
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Kabul tamamlanamadı')),
  });

  const kopyala = async (metin: string) => {
    try {
      await navigator.clipboard.writeText(metin);
      toast.basarili('Kopyalandı');
    } catch {
      toast.hata('Kopyalanamadı');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-black text-gray-900">
          {hesapVar ? 'İndirim kodu ve komisyon' : 'Öğretmen veya koç olarak kabul et'}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {basvuru.ad} {basvuru.soyad} · {basvuru.email}
        </p>

        {sonuc ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-black">Kod: {sonuc.indirimKodu.kod}</p>
              <p className="mt-1 text-xs font-semibold">
                Öğrenci indirimi {oranMetni(sonuc.indirimKodu.indirimTipi, sonuc.indirimKodu.indirimDegeri)} · komisyon{' '}
                {oranMetni(sonuc.indirimKodu.komisyonTipi, sonuc.indirimKodu.komisyonDegeri)}
              </p>
              {sonuc.referansKod && <p className="mt-1 text-xs font-semibold">Referans kodu: {sonuc.referansKod}</p>}
              {sonuc.epostaGonderildi ? (
                <p className="mt-2 text-xs">Bilgiler e-posta ile de gönderildi.</p>
              ) : (
                <p className="mt-2 text-xs">E-posta gönderilemedi. Giriş bilgisini buradan iletin.</p>
              )}
            </div>
            {sonuc.yeniHesap && sonuc.geciciSifre && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Geçici şifre</p>
                  <p className="font-mono text-lg font-black text-gray-900">{sonuc.geciciSifre}</p>
                </div>
                <button
                  type="button"
                  onClick={() => kopyala(sonuc.geciciSifre || '')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700"
                >
                  <Copy className="h-3.5 w-3.5" /> Kopyala
                </button>
              </div>
            )}
            <button
              onClick={bitti}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
            >
              Tamam
            </button>
          </div>
        ) : (
          <>
            {!hesapVar && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(
                  [
                    ['TEACHER', 'Öğretmen'],
                    ['KOC', 'Koç'],
                  ] as const
                ).map(([deger, etiket]) => (
                  <button
                    key={deger}
                    type="button"
                    onClick={() => setRol(deger)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                      rol === deger ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {etiket}
                  </button>
                ))}
              </div>
            )}
            {hesapVar && (
              <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">
                Mevcut hesap: {basvuru.hesap?.rolEtiket}. Yeni kod bu hesaba yazılır.
              </p>
            )}

            <label className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              İndirim kodu
              <input
                value={kod}
                onChange={(e) => setKod(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-black tracking-wide text-gray-900"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Öğrenci indirimi
                <div className="mt-1 flex gap-1">
                  <input
                    type="number"
                    min={1}
                    value={indirimDegeri}
                    onChange={(e) => setIndirimDegeri(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold"
                  />
                  <select
                    value={indirimTipi}
                    onChange={(e) => setIndirimTipi(e.target.value as 'YUZDE' | 'TUTAR')}
                    className="rounded-xl border border-gray-200 px-2 text-xs font-bold"
                  >
                    <option value="YUZDE">%</option>
                    <option value="TUTAR">₺</option>
                  </select>
                </div>
              </label>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Komisyon
                <div className="mt-1 flex gap-1">
                  <input
                    type="number"
                    min={0}
                    value={komisyonDegeri}
                    onChange={(e) => setKomisyonDegeri(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold"
                  />
                  <select
                    value={komisyonTipi}
                    onChange={(e) => setKomisyonTipi(e.target.value as 'YUZDE' | 'TUTAR')}
                    className="rounded-xl border border-gray-200 px-2 text-xs font-bold"
                  >
                    <option value="YUZDE">%</option>
                    <option value="TUTAR">₺</option>
                  </select>
                </div>
              </label>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
              Öğrenci bu kodu ödemede girer. İndirim fiyattan düşer, komisyon {rol === 'KOC' ? 'koça' : 'öğretmene'} yazılır.
            </p>

            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value)}
              rows={2}
              placeholder="Karar notu (opsiyonel)"
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />

            <div className="mt-4 flex gap-2">
              <button onClick={kapat} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600">
                Vazgeç
              </button>
              <button
                onClick={() => mut.mutate()}
                disabled={mut.isPending || !kod.trim() || Number(indirimDegeri) <= 0}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {hesapVar ? 'Kodu tanımla' : 'Kabul et ve tanımla'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NotModal({
  baslik,
  isim,
  bekliyor,
  kapat,
  kaydet,
}: {
  baslik: string;
  isim: string;
  bekliyor: boolean;
  kapat: () => void;
  kaydet: (not: string) => void;
}) {
  const [not, setNot] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-black text-gray-900">{baslik}</h2>
        <p className="mt-1 text-xs text-gray-500">{isim} · not yalnızca panelde görünür</p>
        <textarea
          value={not}
          onChange={(e) => setNot(e.target.value)}
          rows={3}
          placeholder="Karar notu (opsiyonel): anlaşılan ücret, görüşme özeti…"
          className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={kapat} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600">
            Vazgeç
          </button>
          <button
            onClick={() => kaydet(not.trim())}
            disabled={bekliyor}
            className="flex-[2] inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {bekliyor && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
