'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { GeciciSifreKarti } from '@/components/koc/GeciciSifreKarti';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  KeyRound,
  Search,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

type Durum = 'BEKLEMEDE' | 'AKTIF' | 'REDDEDILDI' | 'PASIF';

type KocSatiri = {
  id: string;
  kullaniciId: string;
  email: string;
  rol: string;
  hesapAktif: boolean;
  ad: string;
  soyad: string;
  telefon: string | null;
  tip: 'BIREYSEL' | 'KURUMSAL' | 'KURUM_OGRETMENI';
  kurumAdi: string | null;
  referansKod: string;
  aktif: boolean;
  basvuruDurum: Durum;
  demoBitis: string | null;
  kararTarihi: string | null;
  kararNotu: string | null;
  sehir: string | null;
  beklenenOgrenci: number | null;
  basvuruNotu: string | null;
  ustKurumId: string | null;
  ustKurumAdi: string | null;
  kurumOgretmenSayisi: number;
  ogrenciSayisi: number;
  tamamlananSatis: number;
  olusturuldu: string;
};

type KurumDetay = {
  kurum: {
    id: string;
    ad: string;
    soyad: string;
    email: string;
    telefon: string | null;
    kurumAdi: string | null;
    sehir: string | null;
    beklenenOgrenci: number | null;
    basvuruNotu: string | null;
    basvuruDurum: Durum;
    demoBitis: string | null;
    kararNotu: string | null;
    referansKod: string;
    basvuruTarihi: string;
    ogrenciSayisi: number;
  };
  siniflar: Array<{ id: string; ad: string; seviye: string | null; ogrenciSayisi: number; ogretmenSayisi: number }>;
  ogretmenler: Array<{ id: string; ad: string; soyad: string; email: string; aktif: boolean }>;
};

const DURUM_SEKMELERI: Array<{ deger: Durum | ''; etiket: string; ikon: typeof Clock; renk: string }> = [
  { deger: 'BEKLEMEDE', etiket: 'Beklemede', ikon: Clock, renk: 'amber' },
  { deger: 'AKTIF', etiket: 'Aktif Kurum', ikon: Zap, renk: 'indigo' },
  { deger: 'PASIF', etiket: 'Pasif', ikon: Lock, renk: 'slate' },
  { deger: 'REDDEDILDI', etiket: 'Reddedilen', ikon: XCircle, renk: 'rose' },
  { deger: '', etiket: 'Tümü', ikon: Building2, renk: 'slate' },
];

function hataMesaji(err: unknown, varsayilan: string): string {
  return (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || varsayilan;
}

function tarih(iso?: string | null) {
  if (!iso) return '—';
  return format(new Date(iso), 'd MMM yyyy', { locale: tr });
}

function kalanGun(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function DurumRozeti({ durum }: { durum: Durum }) {
  const stil: Record<Durum, string> = {
    BEKLEMEDE: 'bg-amber-50 text-amber-700 border-amber-200',
    AKTIF: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REDDEDILDI: 'bg-rose-50 text-rose-700 border-rose-200',
    PASIF: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const etiket: Record<Durum, string> = {
    BEKLEMEDE: 'Onay bekliyor',
    AKTIF: 'Aktif',
    REDDEDILDI: 'Reddedildi',
    PASIF: 'Pasif',
  };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${stil[durum]}`}>
      {etiket[durum]}
    </span>
  );
}

function TipRozeti({ tip }: { tip: KocSatiri['tip'] }) {
  if (tip === 'KURUMSAL') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
        <Building2 className="h-3 w-3" /> Kurumsal
      </span>
    );
  }
  if (tip === 'KURUM_OGRETMENI') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
        <GraduationCap className="h-3 w-3" /> Kurum öğretmeni
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700">
      <GraduationCap className="h-3 w-3" /> Bireysel koç
    </span>
  );
}

export default function KurumlarSayfasi() {
  const qc = useQueryClient();
  const [sekme, setSekme] = useState<Durum | ''>('BEKLEMEDE');
  const [q, setQ] = useState('');
  const [onayModal, setOnayModal] = useState<KocSatiri | null>(null);
  const [redModal, setRedModal] = useState<KocSatiri | null>(null);
  const [detayId, setDetayId] = useState<string | null>(null);
  const [kurumEkleModal, setKurumEkleModal] = useState(false);
  const [girisBilgisi, setGirisBilgisi] = useState<{ email: string; sifre: string } | null>(null);
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-kurumlar', q, sekme],
    queryFn: () => adminApi.koclar({ q: q.trim() || undefined, durum: sekme || undefined, kapsam: 'KURUM' }),
  });

  const koclar: KocSatiri[] = data?.data?.veri?.koclar || [];
  const sayilar = (data?.data?.veri?.sayilar || {}) as Record<string, number>;
  const toplam = useMemo(
    () => Object.values(sayilar).reduce((s, x) => s + (x || 0), 0),
    [sayilar],
  );

  const tazele = () => {
    qc.invalidateQueries({ queryKey: ['admin-kurumlar'] });
    qc.invalidateQueries({ queryKey: ['admin-kurum-detay'] });
  };

  const onayMut = useMutation({
    mutationFn: ({ id, demoGun }: { id: string; demoGun: number | null }) => adminApi.kocOnayla(id, demoGun),
    onSuccess: () => {
      toast.basarili('Kurum onaylandı, paneli açıldı');
      setOnayModal(null);
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Onaylanamadı')),
  });

  const redMut = useMutation({
    mutationFn: ({ id, neden }: { id: string; neden: string }) => adminApi.kocReddet(id, neden),
    onSuccess: () => {
      toast.basarili('Başvuru reddedildi');
      setRedModal(null);
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Reddedilemedi')),
  });

  const durumMut = useMutation({
    mutationFn: ({ id, durum }: { id: string; durum: Durum }) => adminApi.kocDurumDegistir(id, durum),
    onSuccess: (_v, d) => {
      toast.basarili(d.durum === 'AKTIF' ? 'Kurum yeniden aktifleştirildi' : 'Kurum pasife alındı');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Güncellenemedi')),
  });

  const demoMut = useMutation({
    mutationFn: ({ id, gun }: { id: string; gun: number }) => adminApi.kocDemoUzat(id, gun),
    onSuccess: (_v, d) => {
      toast.basarili(d.gun > 0 ? `Demo ${d.gun} gün uzatıldı` : 'Demo sınırı kaldırıldı');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Uzatılamadı')),
  });

  const sifreMut = useMutation({
    mutationFn: (id: string) => adminApi.kocSifreSifirla(id),
    onSuccess: (res) => {
      const veri = res.data?.veri as { email: string; geciciSifre: string };
      setDetayId(null);
      setGirisBilgisi({ email: veri.email, sifre: veri.geciciSifre });
      toast.basarili('Yeni geçici şifre oluşturuldu');
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Şifre sıfırlanamadı')),
  });

  const silMut = useMutation({
    mutationFn: (id: string) => adminApi.kocYetkiKaldir(id),
    onSuccess: (res) => {
      const cozulen = res.data?.veri?.cozulenOgrenci ?? 0;
      toast.basarili(`Kayıt silindi${cozulen ? ` · ${cozulen} öğrenci bağlantısı çözüldü` : ''}`);
      setDetayId(null);
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Silinemedi')),
  });

  const kodKopyala = async (kod: string) => {
    try {
      await navigator.clipboard.writeText(kod);
      setKopyalanan(kod);
      toast.basarili('Referans kodu kopyalandı');
      setTimeout(() => setKopyalanan(null), 2000);
    } catch {
      toast.hata('Kopyalanamadı');
    }
  };

  const kartlar = [
    { etiket: 'Beklemede', deger: sayilar.BEKLEMEDE ?? 0, ikon: Clock, kutu: 'bg-amber-50 text-amber-600' },
    { etiket: 'Aktif kurum', deger: sayilar.AKTIF ?? 0, ikon: Zap, kutu: 'bg-indigo-50 text-indigo-600' },
    { etiket: 'Reddedilen', deger: sayilar.REDDEDILDI ?? 0, ikon: XCircle, kutu: 'bg-rose-50 text-rose-600' },
    { etiket: 'Pasif', deger: sayilar.PASIF ?? 0, ikon: Lock, kutu: 'bg-slate-100 text-slate-500' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-300">
            <ShieldCheck className="h-4 w-4" /> Yönetici onayı
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Kurum Başvuruları</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Okul, dershane ve kurs başvurularını onaylayın. Onaylanan kurum kendi öğretmenlerini, sınıflarını ve
            öğrencilerini yönetir. Demo süresi vererek erişimi zamanla sınırlayabilirsiniz.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">Toplam {toplam} kayıt</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kartlar.map((k) => (
          <div key={k.etiket} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.kutu}`}>
                <k.ikon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.etiket}</p>
                <p className="text-2xl font-black text-gray-900">{k.deger}</p>
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
            placeholder="Kurum adı, başvuran, e-posta veya referans kodu ara…"
            className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-12 pr-4 text-sm font-bold shadow-sm"
          />
        </div>
        <button
          onClick={() => setKurumEkleModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Kurum ekle
        </button>
      </section>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
        {DURUM_SEKMELERI.map((t) => {
          const aktif = sekme === t.deger;
          const adet = t.deger ? sayilar[t.deger] ?? 0 : toplam;
          return (
            <button
              key={t.etiket}
              onClick={() => setSekme(t.deger)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                aktif ? 'bg-slate-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <t.ikon className="h-4 w-4" />
              {t.etiket}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                  aktif ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {adet}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : koclar.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-black text-gray-900">Kayıt bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {sekme === 'BEKLEMEDE'
              ? 'Bekleyen başvuru yok. Yeni kurum başvuruları burada görünecek.'
              : 'Bu filtrede kayıt yok.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {koclar.map((k) => {
            const gun = kalanGun(k.demoBitis);
            return (
              <div key={k.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900">
                        {k.kurumAdi || `${k.ad} ${k.soyad}`.trim()}
                      </h3>
                      <TipRozeti tip={k.tip} />
                      <DurumRozeti durum={k.basvuruDurum} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {k.ad} {k.soyad}
                      {k.ustKurumAdi ? ` · ↳ ${k.ustKurumAdi}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {k.basvuruDurum === 'BEKLEMEDE' && (
                      <>
                        <button
                          onClick={() => setOnayModal(k)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Onayla
                        </button>
                        <button
                          onClick={() => setRedModal(k)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reddet
                        </button>
                      </>
                    )}
                    {k.basvuruDurum === 'AKTIF' && (
                      <>
                        <button
                          onClick={() => demoMut.mutate({ id: k.id, gun: 30 })}
                          disabled={demoMut.isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        >
                          <CalendarClock className="h-3.5 w-3.5" /> +30 gün
                        </button>
                        <button
                          onClick={() => durumMut.mutate({ id: k.id, durum: 'PASIF' })}
                          disabled={durumMut.isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
                        >
                          <Lock className="h-3.5 w-3.5" /> Pasife al
                        </button>
                      </>
                    )}
                    {(k.basvuruDurum === 'PASIF' || k.basvuruDurum === 'REDDEDILDI') && (
                      <button
                        onClick={() => durumMut.mutate({ id: k.id, durum: 'AKTIF' })}
                        disabled={durumMut.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <Zap className="h-3.5 w-3.5" /> Aktifleştir
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `${k.kurumAdi || `${k.ad} ${k.soyad}`} için yeni geçici şifre oluşturulsun mu? Mevcut oturumlar düşer.`,
                          )
                        ) {
                          sifreMut.mutate(k.id);
                        }
                      }}
                      disabled={sifreMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Şifre
                    </button>
                    <button
                      onClick={() => setDetayId(k.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Detay
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Bilgi ikon={Mail} etiket="E-posta" deger={k.email} />
                  {k.telefon && <Bilgi ikon={Phone} etiket="Telefon" deger={k.telefon} />}
                  {k.sehir && <Bilgi ikon={MapPin} etiket="Şehir" deger={k.sehir} />}
                  {k.beklenenOgrenci != null && (
                    <Bilgi ikon={Users} etiket="Beklenen öğrenci" deger={String(k.beklenenOgrenci)} />
                  )}
                  <Bilgi ikon={CalendarClock} etiket="Başvuru tarihi" deger={tarih(k.olusturuldu)} />
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Referans kodu</p>
                    <button
                      onClick={() => kodKopyala(k.referansKod)}
                      className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-gray-800"
                    >
                      {kopyalanan === k.referansKod ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                      {k.referansKod}
                    </button>
                  </div>
                  <Bilgi
                    ikon={Users}
                    etiket="Öğrenci / öğretmen"
                    deger={`${k.ogrenciSayisi} / ${k.kurumOgretmenSayisi}`}
                  />
                </div>

                {k.basvuruNotu && (
                  <p className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
                    <span className="font-bold text-gray-500">Başvuru notu: </span>
                    {k.basvuruNotu}
                  </p>
                )}

                {k.kararNotu && k.basvuruDurum !== 'AKTIF' && (
                  <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                    <span className="font-bold">Yönetici notu: </span>
                    {k.kararNotu}
                  </p>
                )}

                {k.basvuruDurum === 'AKTIF' && k.demoBitis && (
                  <p
                    className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${
                      (gun ?? 0) <= 7
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-gray-100 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Demo sona eriyor: {tarih(k.demoBitis)}
                    {gun != null && ` (${gun > 0 ? `${gun} gün kaldı` : 'süresi doldu'})`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {onayModal && (
        <OnayModal
          koc={onayModal}
          bekliyor={onayMut.isPending}
          kapat={() => setOnayModal(null)}
          onayla={(demoGun) => onayMut.mutate({ id: onayModal.id, demoGun })}
        />
      )}

      {redModal && (
        <RedModal
          koc={redModal}
          bekliyor={redMut.isPending}
          kapat={() => setRedModal(null)}
          reddet={(neden) => redMut.mutate({ id: redModal.id, neden })}
        />
      )}

      {kurumEkleModal && (
        <KurumEkleModal
          kapat={() => setKurumEkleModal(false)}
          tamamlandi={(bilgi) => {
            setKurumEkleModal(false);
            setGirisBilgisi(bilgi);
            tazele();
          }}
        />
      )}

      {girisBilgisi && (
        <GeciciSifreKarti
          baslik="Kurum giriş bilgileri"
          email={girisBilgisi.email}
          sifre={girisBilgisi.sifre}
          kapat={() => setGirisBilgisi(null)}
        />
      )}

      {detayId && (
        <DetayModal
          kocId={detayId}
          kapat={() => setDetayId(null)}
          sil={() => {
            const kayit = koclar.find((x) => x.id === detayId);
            if (
              window.confirm(
                `${kayit?.kurumAdi || kayit?.ad} kaydı tamamen silinsin mi? Bağlı öğrencilerin bağlantısı çözülür.`,
              )
            ) {
              silMut.mutate(detayId);
            }
          }}
          demoUzat={(gun) => demoMut.mutate({ id: detayId, gun })}
          sifreSifirla={() => {
            const kayit = koclar.find((x) => x.id === detayId);
            if (
              window.confirm(
                `${kayit?.kurumAdi || kayit?.ad || 'Kurum'} için yeni geçici şifre oluşturulsun mu? Mevcut oturumlar düşer.`,
              )
            ) {
              sifreMut.mutate(detayId);
            }
          }}
          sifreBekliyor={sifreMut.isPending}
        />
      )}

    </div>
  );
}

function Bilgi({
  ikon: Ikon,
  etiket,
  deger,
}: {
  ikon: typeof Mail;
  etiket: string;
  deger: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <Ikon className="h-3 w-3" /> {etiket}
      </p>
      <p className="mt-0.5 truncate text-xs font-bold text-gray-800">{deger}</p>
    </div>
  );
}

function OnayModal({
  koc,
  bekliyor,
  kapat,
  onayla,
}: {
  koc: KocSatiri;
  bekliyor: boolean;
  kapat: () => void;
  onayla: (demoGun: number | null) => void;
}) {
  const [secim, setSecim] = useState<number | null>(14);
  const secenekler: Array<{ deger: number | null; etiket: string }> = [
    { deger: 14, etiket: '14 gün demo' },
    { deger: 30, etiket: '30 gün demo' },
    { deger: 90, etiket: '90 gün' },
    { deger: null, etiket: 'Süresiz' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">Kurumu onayla</h2>
            <p className="mt-1 text-xs text-gray-500">
              {koc.kurumAdi || `${koc.ad} ${koc.soyad}`} paneli açılacak ve bilgilendirme bildirimi gönderilecek.
            </p>
          </div>
          <button onClick={kapat} className="rounded-lg p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Erişim süresi</p>
        <div className="grid grid-cols-2 gap-2">
          {secenekler.map((s) => (
            <button
              key={s.etiket}
              onClick={() => setSecim(s.deger)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                secim === s.deger
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.etiket}
            </button>
          ))}
        </div>

        <button
          onClick={() => onayla(secim)}
          disabled={bekliyor}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {bekliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Onayla ve paneli aç
        </button>
      </div>
    </div>
  );
}

function RedModal({
  koc,
  bekliyor,
  kapat,
  reddet,
}: {
  koc: KocSatiri;
  bekliyor: boolean;
  kapat: () => void;
  reddet: (neden: string) => void;
}) {
  const [neden, setNeden] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">Başvuruyu reddet</h2>
            <p className="mt-1 text-xs text-gray-500">
              {koc.kurumAdi || `${koc.ad} ${koc.soyad}`} başvurusu reddedilecek. Gerekçe kuruma bildirilir.
            </p>
          </div>
          <button onClick={kapat} className="rounded-lg p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <textarea
          value={neden}
          onChange={(e) => setNeden(e.target.value)}
          rows={3}
          placeholder="Red gerekçesi (kuruma iletilir)"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
        />

        <button
          onClick={() => reddet(neden.trim())}
          disabled={bekliyor}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {bekliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Reddet
        </button>
      </div>
    </div>
  );
}

function DetayModal({
  kocId,
  kapat,
  sil,
  demoUzat,
  sifreSifirla,
  sifreBekliyor,
}: {
  kocId: string;
  kapat: () => void;
  sil: () => void;
  demoUzat: (gun: number) => void;
  sifreSifirla: () => void;
  sifreBekliyor: boolean;
}) {
  const qc = useQueryClient();
  const [ogrenciEmail, setOgrenciEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-kurum-detay', kocId],
    queryFn: () => adminApi.kocDetay(kocId),
  });
  const { data: ogrenciData } = useQuery({
    queryKey: ['admin-koc-ogrencileri', kocId],
    queryFn: () => adminApi.kocOgrencileri(kocId),
  });

  const detay = data?.data?.veri as KurumDetay | undefined;
  const ogrenciler = (ogrenciData?.data?.veri?.ogrenciler || []) as Array<{
    id: string;
    ad: string;
    soyad: string;
    email: string;
    katilimSayisi: number;
  }>;

  const tazele = () => {
    qc.invalidateQueries({ queryKey: ['admin-koc-ogrencileri', kocId] });
    qc.invalidateQueries({ queryKey: ['admin-kurum-detay', kocId] });
    qc.invalidateQueries({ queryKey: ['admin-kurumlar'] });
  };

  const ogrenciAtaMut = useMutation({
    mutationFn: () => adminApi.kocOgrenciAta(kocId, ogrenciEmail.trim()),
    onSuccess: (res) => {
      const veri = res.data?.veri;
      toast.basarili(veri?.zatenBagli ? 'Öğrenci zaten bağlı' : veri?.devredildi ? 'Öğrenci devralındı' : 'Öğrenci bağlandı');
      setOgrenciEmail('');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Bağlanamadı')),
  });

  const ogrenciKaldirMut = useMutation({
    mutationFn: (ogrenciId: string) => adminApi.kocOgrenciKaldir(kocId, ogrenciId),
    onSuccess: () => {
      toast.basarili('Öğrenci bağlantısı kaldırıldı');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Kaldırılamadı')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-gray-900">
            {detay?.kurum.kurumAdi || (detay ? `${detay.kurum.ad} ${detay.kurum.soyad}` : 'Detay')}
          </h2>
          <button onClick={kapat} className="rounded-lg p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !detay ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Bilgi ikon={Mail} etiket="E-posta" deger={detay.kurum.email} />
              <Bilgi ikon={Phone} etiket="Telefon" deger={detay.kurum.telefon || '—'} />
              <Bilgi ikon={MapPin} etiket="Şehir" deger={detay.kurum.sehir || '—'} />
              <Bilgi ikon={CalendarClock} etiket="Başvuru" deger={tarih(detay.kurum.basvuruTarihi)} />
              <Bilgi
                ikon={CalendarClock}
                etiket="Demo bitiş"
                deger={detay.kurum.demoBitis ? tarih(detay.kurum.demoBitis) : 'Süresiz'}
              />
              <Bilgi ikon={Users} etiket="Öğrenci" deger={String(detay.kurum.ogrenciSayisi)} />
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Sınıflar ({detay.siniflar.length})
              </p>
              {detay.siniflar.length === 0 ? (
                <p className="text-xs text-gray-500">Sınıf oluşturulmamış.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detay.siniflar.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700"
                    >
                      {s.ad}
                      <span className="ml-1.5 font-medium text-gray-400">
                        {s.ogrenciSayisi} öğr. · {s.ogretmenSayisi} öğrt.
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Kurum öğretmenleri ({detay.ogretmenler.length})
              </p>
              {detay.ogretmenler.length === 0 ? (
                <p className="text-xs text-gray-500">Öğretmen eklenmemiş.</p>
              ) : (
                <ul className="space-y-1.5">
                  {detay.ogretmenler.map((o) => (
                    <li key={o.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {o.ad} {o.soyad}
                        </p>
                        <p className="text-[11px] text-gray-500">{o.email}</p>
                      </div>
                      {!o.aktif && <span className="text-[10px] font-bold text-amber-600">Pasif</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Bağlı öğrenciler ({ogrenciler.length})
              </p>
              <div className="mb-2 flex gap-2">
                <input
                  value={ogrenciEmail}
                  onChange={(e) => setOgrenciEmail(e.target.value)}
                  placeholder="ogrenci@ornek.com"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => ogrenciAtaMut.mutate()}
                  disabled={ogrenciAtaMut.isPending || !ogrenciEmail.trim()}
                  className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  Bağla
                </button>
              </div>
              {ogrenciler.length > 0 && (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {ogrenciler.map((o) => (
                    <li key={o.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-800">
                          {o.ad} {o.soyad}
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          {o.email} · {o.katilimSayisi} katılım
                        </p>
                      </div>
                      <button
                        onClick={() => ogrenciKaldirMut.mutate(o.id)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-rose-200 hover:text-rose-600"
                        title="Bağlantıyı kaldır"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => demoUzat(30)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <CalendarClock className="h-3.5 w-3.5" /> Demo +30 gün
              </button>
              <button
                onClick={() => demoUzat(0)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Süresiz yap
              </button>
              <button
                onClick={sifreSifirla}
                disabled={sifreBekliyor}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <KeyRound className="h-3.5 w-3.5" /> Şifre sıfırla
              </button>
              <button
                onClick={sil}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" /> Kaydı sil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Süper admin başvuru beklemeden kurum hesabı açar */
function KurumEkleModal({
  kapat,
  tamamlandi,
}: {
  kapat: () => void;
  tamamlandi: (bilgi: { email: string; sifre: string }) => void;
}) {
  const [form, setForm] = useState({
    kurumAdi: '',
    ad: '',
    soyad: '',
    email: '',
    telefon: '',
    sehir: '',
    beklenenOgrenci: '',
  });
  const [demoGun, setDemoGun] = useState<number | null>(null);

  const ekleMut = useMutation({
    mutationFn: () =>
      adminApi.kurumOlustur({
        kurumAdi: form.kurumAdi.trim(),
        ad: form.ad.trim(),
        soyad: form.soyad.trim() || undefined,
        email: form.email.trim(),
        telefon: form.telefon.trim() || undefined,
        sehir: form.sehir.trim() || undefined,
        beklenenOgrenci: form.beklenenOgrenci.trim() || undefined,
        demoGun,
      }),
    onSuccess: (res) => {
      toast.basarili('Kurum hesabı açıldı', `Referans kodu: ${res.data?.veri?.kurum?.referansKod ?? ''}`);
      tamamlandi({ email: res.data.veri.kurum.email, sifre: res.data.veri.geciciSifre });
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Kurum açılamadı')),
  });

  const alanlar: Array<{ anahtar: keyof typeof form; etiket: string; tip?: string }> = [
    { anahtar: 'kurumAdi', etiket: 'Kurum adı *' },
    { anahtar: 'ad', etiket: 'Yetkili adı *' },
    { anahtar: 'soyad', etiket: 'Yetkili soyadı' },
    { anahtar: 'email', etiket: 'Kurumsal e-posta *', tip: 'email' },
    { anahtar: 'telefon', etiket: 'Telefon' },
    { anahtar: 'sehir', etiket: 'Şehir' },
    { anahtar: 'beklenenOgrenci', etiket: 'Beklenen öğrenci', tip: 'number' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Kurum ekle</h2>
            <p className="mt-1 text-xs text-gray-500">
              Hesap doğrudan aktif açılır ve geçici şifre üretilir; kuruma iletirsiniz.
            </p>
          </div>
          <button onClick={kapat} className="rounded-lg p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {alanlar.map((a) => (
            <label key={a.anahtar} className={a.anahtar === 'kurumAdi' || a.anahtar === 'email' ? 'sm:col-span-2' : ''}>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {a.etiket}
              </span>
              <input
                type={a.tip || 'text'}
                value={form[a.anahtar]}
                onChange={(e) => setForm((f) => ({ ...f, [a.anahtar]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium"
              />
            </label>
          ))}
        </div>

        <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Erişim süresi</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { deger: 14, etiket: '14 gün' },
            { deger: 30, etiket: '30 gün' },
            { deger: 90, etiket: '90 gün' },
            { deger: null, etiket: 'Süresiz' },
          ].map((sec) => (
            <button
              key={sec.etiket}
              onClick={() => setDemoGun(sec.deger)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                demoGun === sec.deger
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {sec.etiket}
            </button>
          ))}
        </div>

        <button
          onClick={() => ekleMut.mutate()}
          disabled={ekleMut.isPending || !form.kurumAdi.trim() || !form.ad.trim() || !form.email.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {ekleMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Kurumu oluştur
        </button>
      </div>
    </div>
  );
}
