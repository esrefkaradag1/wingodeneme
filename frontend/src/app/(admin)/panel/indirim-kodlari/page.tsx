'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import {
  BadgePercent,
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';

type Kod = {
  id: string;
  kod: string;
  aciklama: string | null;
  aktif: boolean;
  indirimTipi: 'YUZDE' | 'TUTAR';
  indirimDegeri: number;
  komisyonTipi: 'YUZDE' | 'TUTAR';
  komisyonDegeri: number;
  platform: 'HEPSI' | 'YKS_LGS' | 'KPSS';
  baslangic: string | null;
  bitis: string | null;
  maksKullanim: number | null;
  kullaniciLimiti: number | null;
  minTutar: number | null;
  kullanimSayisi: number;
  olusturuldu: string;
  ogretmen: { id: string; email: string; ad: string; soyad: string; brans: string | null; rol?: string } | null;
  toplamCiro: number;
  toplamKomisyon: number;
};

type Komisyon = {
  id: string;
  kod: string;
  ogretmen: { id: string; email: string; ad: string } | null;
  ogrenci: { email: string; ad: string };
  urun: string;
  brutTutar: number;
  indirimTutari: number;
  netTutar: number;
  komisyonTutari: number;
  komisyonDurumu: string;
  siparisDurumu: string | null;
  odemeTarihi: string | null;
  tarih: string;
};

type Ogretmen = {
  kullaniciId: string;
  email: string;
  ad: string;
  soyad: string;
  brans: string | null;
  tipEtiket?: string;
  rol?: string;
};

const PLATFORM_ETIKET: Record<string, string> = {
  HEPSI: 'Tüm platformlar',
  YKS_LGS: 'YKS / LGS',
  KPSS: 'KPSS',
};

const DURUM_ETIKET: Record<string, { etiket: string; sinif: string }> = {
  BEKLEMEDE: { etiket: 'Ödeme bekliyor', sinif: 'bg-amber-50 text-amber-700 border-amber-200' },
  ONAYLANDI: { etiket: 'Ödenecek', sinif: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ODENDI: { etiket: 'Ödendi', sinif: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IPTAL: { etiket: 'İptal', sinif: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function tl(deger: number) {
  return `${(deger ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function hataMesaji(err: unknown, varsayilan: string) {
  return (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj || varsayilan;
}

export default function IndirimKodlariSayfasi() {
  const qc = useQueryClient();
  const [sekme, setSekme] = useState<'kodlar' | 'komisyonlar'>('kodlar');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ mod: 'yeni' } | { mod: 'duzenle'; kod: Kod } | null>(null);
  const [komisyonDurum, setKomisyonDurum] = useState('ONAYLANDI');
  const [secili, setSecili] = useState<string[]>([]);
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);

  const { data: kodData, isLoading } = useQuery({
    queryKey: ['admin-indirim-kodlari', q],
    queryFn: () => adminApi.indirimKodlari({ q: q.trim() || undefined }),
  });
  const kodlar: Kod[] = kodData?.data?.veri || [];

  const { data: komisyonData } = useQuery({
    queryKey: ['admin-komisyonlar', komisyonDurum],
    queryFn: () => adminApi.komisyonlar({ durum: komisyonDurum || undefined }),
  });
  const komisyonlar: Komisyon[] = komisyonData?.data?.veri?.kayitlar || [];
  const komisyonOzet = (komisyonData?.data?.veri?.ozet || {}) as Record<string, { tutar: number; adet: number }>;

  const tazele = () => {
    qc.invalidateQueries({ queryKey: ['admin-indirim-kodlari'] });
    qc.invalidateQueries({ queryKey: ['admin-komisyonlar'] });
  };

  const silMut = useMutation({
    mutationFn: (id: string) => adminApi.indirimKoduSil(id),
    onSuccess: (res) => {
      toast.basarili(res.data?.veri?.pasifeAlindi ? 'Kod kullanılmış olduğu için pasife alındı' : 'Kod silindi');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Silinemedi')),
  });

  const durumMut = useMutation({
    mutationFn: ({ id, aktif }: { id: string; aktif: boolean }) => adminApi.indirimKoduGuncelle(id, { aktif }),
    onSuccess: (_v, d) => {
      toast.basarili(d.aktif ? 'Kod aktifleştirildi' : 'Kod pasife alındı');
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Güncellenemedi')),
  });

  const odeMut = useMutation({
    mutationFn: () => adminApi.komisyonOde(secili),
    onSuccess: (res) => {
      toast.basarili(
        `${res.data.veri.odenen} komisyon ödendi olarak işaretlendi`,
        tl(res.data.veri.toplamTutar),
      );
      setSecili([]);
      tazele();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'İşaretlenemedi')),
  });

  const seciliToplam = useMemo(
    () => komisyonlar.filter((k) => secili.includes(k.id)).reduce((s, k) => s + k.komisyonTutari, 0),
    [komisyonlar, secili],
  );

  const kodKopyala = async (kod: string) => {
    try {
      await navigator.clipboard.writeText(kod);
      setKopyalanan(kod);
      toast.basarili('Kod kopyalandı');
      setTimeout(() => setKopyalanan(null), 2000);
    } catch {
      toast.hata('Kopyalanamadı');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <BadgePercent className="h-4 w-4" /> Kampanya
          </div>
          <h1 className="text-3xl font-bold tracking-tight">İndirim Kodları & Komisyonlar</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Öğretmen ve koçlara kod tanımlayın; öğrenci bu kodla ödeme yaptığında indirim uygulanır ve komisyon
            sahibine yazılır. Hakedişler ödeme tamamlanınca kesinleşir, buradan ödendi olarak işaretlenir.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { etiket: 'Tanımlı kod', deger: String(kodlar.length), ikon: BadgePercent, kutu: 'bg-violet-50 text-violet-600' },
          { etiket: 'Ödenecek komisyon', deger: tl(komisyonOzet.ONAYLANDI?.tutar ?? 0), ikon: Wallet, kutu: 'bg-indigo-50 text-indigo-600' },
          { etiket: 'Ödenen komisyon', deger: tl(komisyonOzet.ODENDI?.tutar ?? 0), ikon: Check, kutu: 'bg-emerald-50 text-emerald-600' },
          { etiket: 'Bekleyen sipariş', deger: tl(komisyonOzet.BEKLEMEDE?.tutar ?? 0), ikon: Users, kutu: 'bg-amber-50 text-amber-600' },
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

      <div className="flex gap-1.5 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
        {([
          { deger: 'kodlar', etiket: 'İndirim kodları' },
          { deger: 'komisyonlar', etiket: 'Komisyon ödemeleri' },
        ] as const).map((t) => (
          <button
            key={t.deger}
            onClick={() => setSekme(t.deger)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              sekme === t.deger ? 'bg-slate-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.etiket}
          </button>
        ))}
      </div>

      {sekme === 'kodlar' ? (
        <>
          <section className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Kod, açıklama veya sahip ara…"
                className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-12 pr-4 text-sm font-bold shadow-sm"
              />
            </div>
            <button
              onClick={() => setModal({ mod: 'yeni' })}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Kod oluştur
            </button>
          </section>

          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Kod</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Sahip</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">İndirim / komisyon</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Kullanım</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Durum</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                      </td>
                    </tr>
                  ) : kodlar.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-sm font-medium text-gray-500">
                        Tanımlı indirim kodu yok. &quot;Kod oluştur&quot; ile başlayın.
                      </td>
                    </tr>
                  ) : (
                    kodlar.map((k) => (
                      <tr key={k.id} className="border-b border-gray-50">
                        <td className="p-4">
                          <button
                            onClick={() => kodKopyala(k.kod)}
                            className="inline-flex items-center gap-1.5 font-mono text-sm font-black text-gray-900"
                          >
                            {kopyalanan === k.kod ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-gray-400" />
                            )}
                            {k.kod}
                          </button>
                          {k.aciklama && <p className="mt-0.5 text-[11px] text-gray-500">{k.aciklama}</p>}
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {PLATFORM_ETIKET[k.platform]}
                          </p>
                        </td>
                        <td className="p-4">
                          {k.ogretmen ? (
                            <>
                              <p className="text-sm font-bold text-gray-900">
                                {[k.ogretmen.ad, k.ogretmen.soyad].filter(Boolean).join(' ') || k.ogretmen.email}
                              </p>
                              <p className="text-[11px] text-gray-500">{k.ogretmen.email}</p>
                              <p className="text-[10px] font-bold text-gray-400">
                                {k.ogretmen.rol === 'KOC' ? 'Koç' : k.ogretmen.brans || 'Öğretmen'}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400">Komisyonsuz</span>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-gray-800">
                            {k.indirimTipi === 'YUZDE' ? `%${k.indirimDegeri}` : tl(k.indirimDegeri)} indirim
                          </p>
                          <p className="text-xs font-bold text-emerald-700">
                            {k.komisyonDegeri > 0
                              ? `${k.komisyonTipi === 'YUZDE' ? `%${k.komisyonDegeri}` : tl(k.komisyonDegeri)} komisyon`
                              : '—'}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-black text-gray-900">
                            {k.kullanimSayisi}
                            {k.maksKullanim ? <span className="text-gray-400"> / {k.maksKullanim}</span> : ''}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400">
                            {tl(k.toplamCiro)} ciro · {tl(k.toplamKomisyon)} komisyon
                          </p>
                          {k.bitis && (
                            <p className="text-[10px] text-gray-400">
                              son {format(new Date(k.bitis), 'd MMM yyyy', { locale: tr })}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => durumMut.mutate({ id: k.id, aktif: !k.aktif })}
                            disabled={durumMut.isPending}
                            className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              k.aktif
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {k.aktif ? 'Aktif' : 'Pasif'}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setModal({ mod: 'duzenle', kod: k })}
                              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                              title="Düzenle"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`${k.kod} kodu silinsin mi? Kullanılmışsa pasife alınır.`)) {
                                  silMut.mutate(k.id);
                                }
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700"
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={komisyonDurum}
              onChange={(e) => {
                setKomisyonDurum(e.target.value);
                setSecili([]);
              }}
              className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold shadow-sm"
            >
              <option value="ONAYLANDI">Ödenecek (hakediş)</option>
              <option value="ODENDI">Ödenen</option>
              <option value="BEKLEMEDE">Ödeme bekleyen sipariş</option>
              <option value="IPTAL">İptal</option>
              <option value="">Tümü</option>
            </select>

            {komisyonDurum === 'ONAYLANDI' && (
              <button
                onClick={() => odeMut.mutate()}
                disabled={odeMut.isPending || secili.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {odeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Seçilenleri ödendi işaretle ({secili.length} · {tl(seciliToplam)})
              </button>
            )}
          </section>

          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {komisyonDurum === 'ONAYLANDI' && (
                      <th className="p-4">
                        <input
                          type="checkbox"
                          checked={secili.length > 0 && secili.length === komisyonlar.length}
                          onChange={(e) => setSecili(e.target.checked ? komisyonlar.map((k) => k.id) : [])}
                        />
                      </th>
                    )}
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Tarih</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Sahip</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Kod / ürün</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Satış</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Komisyon</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {komisyonlar.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-sm font-medium text-gray-500">
                        Bu filtrede komisyon kaydı yok.
                      </td>
                    </tr>
                  ) : (
                    komisyonlar.map((k) => {
                      const d = DURUM_ETIKET[k.komisyonDurumu] ?? DURUM_ETIKET.BEKLEMEDE;
                      return (
                        <tr key={k.id} className="border-b border-gray-50">
                          {komisyonDurum === 'ONAYLANDI' && (
                            <td className="p-4">
                              <input
                                type="checkbox"
                                checked={secili.includes(k.id)}
                                onChange={(e) =>
                                  setSecili((liste) =>
                                    e.target.checked ? [...liste, k.id] : liste.filter((x) => x !== k.id),
                                  )
                                }
                              />
                            </td>
                          )}
                          <td className="p-4 text-xs font-bold text-gray-700">
                            {format(new Date(k.tarih), 'd MMM yyyy', { locale: tr })}
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-bold text-gray-900">{k.ogretmen?.ad || '—'}</p>
                            <p className="text-[11px] text-gray-500">{k.ogretmen?.email}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-mono text-xs font-black text-gray-900">{k.kod}</p>
                            <p className="text-xs text-gray-500">{k.urun}</p>
                            <p className="text-[10px] text-gray-400">{k.ogrenci.ad || k.ogrenci.email}</p>
                          </td>
                          <td className="p-4 text-sm font-bold text-gray-800">
                            {tl(k.netTutar)}
                            <p className="text-[10px] font-medium text-gray-400">indirim {tl(k.indirimTutari)}</p>
                          </td>
                          <td className="p-4 text-sm font-black text-emerald-700">{tl(k.komisyonTutari)}</td>
                          <td className="p-4">
                            <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${d.sinif}`}>
                              {d.etiket}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modal && (
        <KodModal
          mevcut={modal.mod === 'duzenle' ? modal.kod : null}
          kapat={() => setModal(null)}
          tamamlandi={() => {
            setModal(null);
            tazele();
          }}
        />
      )}
    </div>
  );
}

function KodModal({
  mevcut,
  kapat,
  tamamlandi,
}: {
  mevcut: Kod | null;
  kapat: () => void;
  tamamlandi: () => void;
}) {
  const [form, setForm] = useState({
    kod: mevcut?.kod ?? '',
    aciklama: mevcut?.aciklama ?? '',
    ogretmenId: mevcut?.ogretmen?.id ?? '',
    indirimTipi: mevcut?.indirimTipi ?? 'YUZDE',
    indirimDegeri: String(mevcut?.indirimDegeri ?? 10),
    komisyonTipi: mevcut?.komisyonTipi ?? 'YUZDE',
    komisyonDegeri: String(mevcut?.komisyonDegeri ?? 10),
    platform: mevcut?.platform ?? 'HEPSI',
    bitis: mevcut?.bitis ? mevcut.bitis.slice(0, 10) : '',
    maksKullanim: mevcut?.maksKullanim != null ? String(mevcut.maksKullanim) : '',
    kullaniciLimiti: mevcut?.kullaniciLimiti != null ? String(mevcut.kullaniciLimiti) : '1',
    minTutar: mevcut?.minTutar != null ? String(mevcut.minTutar) : '',
  });
  const [sahipArama, setSahipArama] = useState('');

  const { data: ogretmenData } = useQuery({
    queryKey: ['admin-indirim-sahip-adaylari'],
    queryFn: () => adminApi.indirimSahipAdaylari(),
  });
  const ogretmenler: Ogretmen[] = ogretmenData?.data?.veri || [];

  const filtrelenmisSahipler = useMemo(() => {
    const q = sahipArama.trim().toLocaleLowerCase('tr');
    if (!q) return ogretmenler;
    return ogretmenler.filter((o) => {
      const ad = [o.ad, o.soyad].filter(Boolean).join(' ');
      return [ad, o.email, o.brans, o.tipEtiket, o.rol]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase('tr').includes(q));
    });
  }, [ogretmenler, sahipArama]);

  const seciliSahip = useMemo(
    () => ogretmenler.find((o) => o.kullaniciId === form.ogretmenId) ?? null,
    [ogretmenler, form.ogretmenId],
  );

  const kaydetMut = useMutation({
    mutationFn: () => {
      const govde = {
        kod: form.kod,
        aciklama: form.aciklama,
        ogretmenId: form.ogretmenId || null,
        indirimTipi: form.indirimTipi,
        indirimDegeri: Number(form.indirimDegeri),
        komisyonTipi: form.komisyonTipi,
        komisyonDegeri: Number(form.komisyonDegeri || 0),
        platform: form.platform,
        bitis: form.bitis || null,
        maksKullanim: form.maksKullanim === '' ? null : Number(form.maksKullanim),
        kullaniciLimiti: form.kullaniciLimiti === '' ? null : Number(form.kullaniciLimiti),
        minTutar: form.minTutar === '' ? null : Number(form.minTutar),
      };
      return mevcut ? adminApi.indirimKoduGuncelle(mevcut.id, govde) : adminApi.indirimKoduOlustur(govde);
    },
    onSuccess: () => {
      toast.basarili(mevcut ? 'Kod güncellendi' : 'Kod oluşturuldu');
      tamamlandi();
    },
    onError: (e) => toast.hata(hataMesaji(e, 'Kaydedilemedi')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">{mevcut ? 'Kodu düzenle' : 'İndirim kodu oluştur'}</h2>
            <p className="mt-1 text-xs text-gray-500">
              Öğrenci ödemede kodu girer; indirim düşülür ve seçilen öğretmen/koça komisyon yazılır.
            </p>
          </div>
          <button onClick={kapat} className="rounded-lg p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Kod *</span>
            <input
              value={form.kod}
              onChange={(e) => setForm((f) => ({ ...f, kod: e.target.value.toUpperCase() }))}
              disabled={!!mevcut}
              placeholder="ORNEK25"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm font-bold uppercase disabled:bg-gray-50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Açıklama</span>
            <input
              value={form.aciklama}
              onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
              placeholder="Ör. Matematik hocası kampanyası"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium"
            />
          </label>

          <div className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Komisyon sahibi (öğretmen / koç)
            </span>
            {seciliSahip && (
              <div
                className={`mb-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                  seciliSahip.rol === 'KOC' || seciliSahip.tipEtiket === 'Koç'
                    ? 'border-teal-200 bg-teal-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {[seciliSahip.ad, seciliSahip.soyad].filter(Boolean).join(' ') || seciliSahip.email}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {seciliSahip.tipEtiket || (seciliSahip.rol === 'KOC' ? 'Koç' : 'Öğretmen')}
                    {seciliSahip.brans ? ` · ${seciliSahip.brans}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, ogretmenId: '' }))}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 hover:bg-white"
                >
                  Temizle
                </button>
              </div>
            )}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="relative border-b border-gray-100">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={sahipArama}
                  onChange={(e) => setSahipArama(e.target.value)}
                  placeholder="Ad, e-posta veya branş ara…"
                  className="w-full py-2.5 pl-9 pr-3 text-sm font-medium outline-none"
                />
              </div>
              <ul className="max-h-48 overflow-y-auto">
                <li>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, ogretmenId: '' }))}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm font-medium hover:bg-gray-50 ${
                      !form.ogretmenId ? 'bg-indigo-50 text-indigo-800' : 'text-gray-700'
                    }`}
                  >
                    Komisyonsuz (yalnızca indirim)
                  </button>
                </li>
                {filtrelenmisSahipler.length === 0 ? (
                  <li className="px-3 py-4 text-center text-xs text-gray-500">Sonuç bulunamadı</li>
                ) : (
                  filtrelenmisSahipler.map((o) => {
                    const kocMu = o.rol === 'KOC' || o.tipEtiket === 'Koç';
                    const secili = form.ogretmenId === o.kullaniciId;
                    return (
                      <li key={o.kullaniciId}>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, ogretmenId: o.kullaniciId }))}
                          className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50 ${
                            secili
                              ? kocMu
                                ? 'bg-teal-100'
                                : 'bg-indigo-50'
                              : kocMu
                                ? 'bg-teal-50/70'
                                : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-bold ${kocMu ? 'text-teal-900' : 'text-gray-900'}`}>
                              {[o.ad, o.soyad].filter(Boolean).join(' ') || o.email}
                            </p>
                            <p className="truncate text-[11px] text-gray-500">{o.email}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              kocMu
                                ? 'border-teal-200 bg-teal-100 text-teal-800'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            }`}
                          >
                            {o.tipEtiket || (kocMu ? 'Koç' : 'Öğretmen')}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Öğrenci indirimi *
              </span>
              <div className="flex gap-2">
                <select
                  value={form.indirimTipi}
                  onChange={(e) => setForm((f) => ({ ...f, indirimTipi: e.target.value as 'YUZDE' | 'TUTAR' }))}
                  className="rounded-xl border border-gray-200 px-2 py-2.5 text-sm font-bold"
                >
                  <option value="YUZDE">%</option>
                  <option value="TUTAR">₺</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={form.indirimDegeri}
                  onChange={(e) => setForm((f) => ({ ...f, indirimDegeri: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Komisyon
              </span>
              <div className="flex gap-2">
                <select
                  value={form.komisyonTipi}
                  onChange={(e) => setForm((f) => ({ ...f, komisyonTipi: e.target.value as 'YUZDE' | 'TUTAR' }))}
                  className="rounded-xl border border-gray-200 px-2 py-2.5 text-sm font-bold"
                >
                  <option value="YUZDE">%</option>
                  <option value="TUTAR">₺</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={form.komisyonDegeri}
                  onChange={(e) => setForm((f) => ({ ...f, komisyonDegeri: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold"
                />
              </div>
            </label>
          </div>
          <p className="text-[11px] text-gray-500">
            Komisyon, indirim düşüldükten sonraki net tutar üzerinden hesaplanır.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Platform</span>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Kod['platform'] }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium"
              >
                <option value="HEPSI">Tüm platformlar</option>
                <option value="YKS_LGS">Yalnızca YKS / LGS</option>
                <option value="KPSS">Yalnızca KPSS</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Son kullanma
              </span>
              <input
                type="date"
                value={form.bitis}
                onChange={(e) => setForm((f) => ({ ...f, bitis: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {([
              { anahtar: 'maksKullanim', etiket: 'Toplam limit' },
              { anahtar: 'kullaniciLimiti', etiket: 'Kişi başı' },
              { anahtar: 'minTutar', etiket: 'Min. tutar ₺' },
            ] as const).map((a) => (
              <label key={a.anahtar} className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {a.etiket}
                </span>
                <input
                  type="number"
                  min={0}
                  value={form[a.anahtar]}
                  onChange={(e) => setForm((f) => ({ ...f, [a.anahtar]: e.target.value }))}
                  placeholder="—"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={() => kaydetMut.mutate()}
          disabled={kaydetMut.isPending || !form.kod.trim() || !Number(form.indirimDegeri)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {kaydetMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {mevcut ? 'Kaydet' : 'Kodu oluştur'}
        </button>
      </div>
    </div>
  );
}
