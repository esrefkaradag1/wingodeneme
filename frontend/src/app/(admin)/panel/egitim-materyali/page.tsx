'use client';

import { Fragment, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, soruApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import {
  BookOpenCheck,
  Upload,
  RefreshCw,
  Trash2,
  FileText,
  FileType2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EgitimDokuman {
  id: string;
  baslik: string;
  ders?: string | null;
  konuId?: string | null;
  ogretimTuru?: string | null;
  tur?: 'KONU_ANLATIMI' | 'DENEME_SINAVI' | 'SORU_ORNEKLERI' | 'COZUM' | 'DIGER' | null;
  dosyaAd: string;
  dosyaTipi: string;
  dosyaBoyut: number;
  dosyaUrl?: string | null;
  kaynakUrl?: string | null;
  sayfaBaslangic?: number | null;
  sayfaBitis?: number | null;
  hamMetin?: string | null;
  egitimOzeti?: string | null;
  durum: 'BEKLIYOR' | 'ISLENIYOR' | 'HAZIR' | 'HATA';
  hataMetni?: string | null;
  chunkSayisi: number;
  olusturuldu: string;
  guncellendi: string;
}

const DURUM_CONF: Record<EgitimDokuman['durum'], { etiket: string; ikon: typeof CheckCircle2; sinif: string }> = {
  BEKLIYOR: { etiket: 'Bekliyor', ikon: Clock, sinif: 'bg-gray-100 text-gray-600' },
  ISLENIYOR: { etiket: 'İşleniyor', ikon: Loader2, sinif: 'bg-blue-100 text-blue-700' },
  HAZIR: { etiket: 'Hazır', ikon: CheckCircle2, sinif: 'bg-emerald-100 text-emerald-700' },
  HATA: { etiket: 'Hata', ikon: AlertTriangle, sinif: 'bg-rose-100 text-rose-700' },
};

const TUR_ETIKET: Record<NonNullable<EgitimDokuman['tur']>, string> = {
  KONU_ANLATIMI: 'Konu anlatımı',
  DENEME_SINAVI: 'Deneme sınavı',
  SORU_ORNEKLERI: 'Soru örnekleri',
  COZUM: 'Çözüm',
  DIGER: 'Diğer',
};

/** LGS müfredatına göre branş/dersler (RAG ve filtre için) */
const LGS_DERSLERI = [
  'Matematik',
  'Fen Bilimleri',
  'Türkçe',
  'İnkılap Tarihi ve Atatürkçülük',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce',
] as const;

/** YKS müfredatına göre branş/dersler */
const YKS_DERSLERI = [
  'Matematik',
  'Geometri',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türkçe',
  'Edebiyat',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce',
  'Almanca',
  'Fransızca',
] as const;

/** KPSS GY + GK dersleri (Ortaöğretim ve Önlisans ortak havuz) */
const KPSS_DERSLERI = [
  'Türkçe',
  'Matematik',
  'Tarih',
  'Coğrafya',
  'Vatandaşlık',
  'Güncel Bilgiler',
] as const;

const KADEME_SECENEKLERI = [
  { value: 'YKS', label: 'YKS' },
  { value: 'LGS', label: 'LGS' },
  { value: 'KPSS_ORTAOGRETIM', label: 'KPSS Ortaöğretim' },
  { value: 'KPSS_ONLISANS', label: 'KPSS Önlisans' },
] as const;

type KademeGrubu = (typeof KADEME_SECENEKLERI)[number]['value'];

function kademeEtiket(k?: string | null): string {
  if (!k) return '—';
  return KADEME_SECENEKLERI.find((s) => s.value === k)?.label ?? k;
}

function konuApiKademesi(k: KademeGrubu): string {
  if (k === 'LGS') return 'LGS';
  if (k.startsWith('KPSS')) return k;
  return 'YKS';
}
const MAKS_DOSYA_BOYUTU = 25 * 1024 * 1024;

function bayttanInsan(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`;
  return `${(bayt / 1024 / 1024).toFixed(1)} MB`;
}

function sayfaAraligiEtiket(bas?: number | null, bit?: number | null): string | null {
  if (!bas && !bit) return null;
  if (bas && bit) return `Sayfa ${bas}–${bit}`;
  if (bas) return `Sayfa ${bas}+`;
  if (bit) return `Sayfa 1–${bit}`;
  return null;
}

function pdfKaynakMi(dosya: File | null, url: string, yuklemeTipi: 'dosya' | 'url'): boolean {
  if (yuklemeTipi === 'dosya' && dosya) {
    return dosya.type.includes('pdf') || /\.pdf$/i.test(dosya.name);
  }
  if (yuklemeTipi === 'url' && url.trim()) {
    return /\.pdf(\?|#|$)/i.test(url.trim());
  }
  return false;
}

interface EgitimOzetiJson {
  konular?: string[];
  kazanimlar?: string[];
  soruTipleri?: string[];
  soruSayisi?: number;
  sorular?: Array<{ sira: number; ozet: string; konu?: string }>;
  uretimYonergesi?: string;
}

function egitimOzetiParse(raw?: string | null): EgitimOzetiJson | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as EgitimOzetiJson;
  } catch {
    return null;
  }
}

function turKullanimAciklamasi(tur?: EgitimDokuman['tur']): string {
  switch (tur) {
    case 'DENEME_SINAVI':
      return 'Soru kökleri, şık dili ve sınav formatı örüntülerini öğrenip yeni üretimlere yansıtır.';
    case 'SORU_ORNEKLERI':
      return 'Kazanım düzeyi, çeldirici tipi ve soru kurgusunu örnekleyerek benzer tarzda soru üretimini besler.';
    case 'COZUM':
      return 'Adım adım çözüm anlatım dilini ve gerekçelendirme biçimini güçlendirir.';
    case 'KONU_ANLATIMI':
      return 'Kavram, kural ve tanımları kaynak bilgi olarak kullanıp müfredata sadık soru üretimine destek olur.';
    default:
      return 'RAG havuzunda genel kaynak olarak tutulur ve benzerlik aramasında uygun olduğunda prompta eklenir.';
  }
}

export default function EgitimMateryaliSayfasi() {
  const qc = useQueryClient();
  const [aramaQuery, setAramaQuery] = useState('');
  const [yukleAcik, setYukleAcik] = useState(false);
  const [acikDetayId, setAcikDetayId] = useState<string | null>(null);

  const { data: listeVerisi, isLoading } = useQuery({
    queryKey: ['egitim-dokumanlar'],
    queryFn: () => adminApi.egitimDokumanlar().then((r) => ({
      dokumanlar: r.data.veri as EgitimDokuman[],
      ozet: r.data.ozet,
    })),
    refetchInterval: (q) => {
      const ds = (q.state.data?.dokumanlar as EgitimDokuman[] | undefined) || [];
      return ds.some((d) => d.durum === 'ISLENIYOR' || d.durum === 'BEKLIYOR') ? 4000 : false;
    },
  });

  const dokumanlar = listeVerisi?.dokumanlar ?? [];
  const ozet = listeVerisi?.ozet;

  const filtreli = useMemo(() => {
    const q = aramaQuery.trim().toLowerCase();
    if (!q) return dokumanlar;
    return dokumanlar.filter(
      (d) =>
        d.baslik.toLowerCase().includes(q) ||
        d.dosyaAd.toLowerCase().includes(q) ||
        (d.ders || '').toLowerCase().includes(q),
    );
  }, [dokumanlar, aramaQuery]);

  const silMutation = useMutation({
    mutationFn: (id: string) => adminApi.egitimDokumanSil(id),
    onSuccess: () => {
      toast.basarili('Doküman silindi.');
      qc.invalidateQueries({ queryKey: ['egitim-dokumanlar'] });
    },
    onError: () => toast.hata('Doküman silinemedi.'),
  });

  const yenidenIsleMutation = useMutation({
    mutationFn: (id: string) => adminApi.egitimDokumanYenidenIsle(id),
    onSuccess: () => {
      toast.basarili('Yeniden işleme başlatıldı.');
      qc.invalidateQueries({ queryKey: ['egitim-dokumanlar'] });
    },
    onError: () => toast.hata('İşlem başlatılamadı.'),
  });

  const hazirSayisi = dokumanlar.filter((d) => d.durum === 'HAZIR').length;
  const islemeSayisi = dokumanlar.filter((d) => d.durum === 'ISLENIYOR' || d.durum === 'BEKLIYOR').length;
  const hataSayisi = dokumanlar.filter((d) => d.durum === 'HATA').length;
  const toplamChunk = ozet?.toplamChunk ?? dokumanlar.reduce((s, d) => s + (d.chunkSayisi || 0), 0);
  const toplamBoyut = ozet?.toplamBoyut ?? dokumanlar.reduce((s, d) => s + (d.dosyaBoyut || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BookOpenCheck className="w-7 h-7 text-indigo-600" /> Eğitim Materyali
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Yüklediğin materyallerden sistem <b>konu başlıklarını ve soru kavramlarını</b> çıkarır,
            parçalara böler ve soru üretiminde bu bilgiye göre eğitilmiş öneriler sunar.
          </p>
        </div>
        <button
          onClick={() => setYukleAcik(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm transition"
        >
          <Upload className="w-4 h-4" /> Doküman Yükle
        </button>
      </div>

      {/* Özet kutuları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <OzetKart etiket="Toplam doküman" deger={dokumanlar.length} renk="indigo" />
        <OzetKart etiket="Toplam boyut" deger={bayttanInsan(toplamBoyut)} renk="violet" />
        <OzetKart etiket="Hazır" deger={hazirSayisi} renk="emerald" />
        <OzetKart etiket="İşleniyor" deger={islemeSayisi} renk="blue" />
        <OzetKart etiket="Toplam parça (chunk)" deger={toplamChunk} renk="amber" />
      </div>

      {hataSayisi > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {hataSayisi} dokümanda işleme hatası var. "Yeniden işle" düğmesi ile tekrar deneyebilirsin.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Başlık, dosya adı veya ders ara…"
            value={aramaQuery}
            onChange={(e) => setAramaQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
          </div>
        ) : filtreli.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Henüz doküman eklenmedi. <button onClick={() => setYukleAcik(true)} className="text-indigo-600 font-semibold hover:underline">Yeni doküman yükle</button>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-sm table-auto">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left font-bold tracking-wider min-w-[320px] max-w-[450px]">Doküman</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider min-w-[160px]">Ders / Tür</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider w-24">Boyut</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider w-20">Parça</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider min-w-[120px]">Durum</th>
                  <th className="px-6 py-4 text-right font-bold tracking-wider min-w-[200px]">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtreli.map((d) => {
                  const durum = DURUM_CONF[d.durum];
                  const Ikon = durum.ikon;
                  const detayAcik = acikDetayId === d.id;
                  const onizleme = (d.hamMetin || '').slice(0, 2000).replace(/\s+/g, ' ').trim().slice(0, 420);
                  const analiz = egitimOzetiParse(d.egitimOzeti);
                  return (
                    <Fragment key={d.id}>
                      <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 max-w-[400px] min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center shrink-0">
                              <FileType2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate" title={d.baslik}>{d.baslik}</p>
                              <p className="text-xs text-gray-400 truncate mt-0.5" title={d.dosyaAd}>{d.dosyaAd}</p>
                            </div>
                          </div>
                        </td>
                      <td className="px-6 py-4 text-gray-700">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{d.ders || '—'}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                            {TUR_ETIKET[(d.tur || 'DIGER') as NonNullable<EgitimDokuman['tur']>]}
                          </span>
                        </div>
                        {d.ogretimTuru ? <span className="text-xs text-gray-400 ml-1">({kademeEtiket(d.ogretimTuru)})</span> : null}
                        {sayfaAraligiEtiket(d.sayfaBaslangic, d.sayfaBitis) ? (
                          <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                            {sayfaAraligiEtiket(d.sayfaBaslangic, d.sayfaBitis)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{bayttanInsan(d.dosyaBoyut)}</td>
                      <td className="px-6 py-4 text-gray-600">{d.chunkSayisi}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${durum.sinif}`}>
                          <Ikon className={`w-3.5 h-3.5 ${d.durum === 'ISLENIYOR' ? 'animate-spin' : ''}`} />
                          {durum.etiket}
                        </span>
                        {d.durum === 'HATA' && d.hataMetni && (
                          <p className="text-xs text-rose-700 mt-1 max-w-xs truncate" title={d.hataMetni}>{d.hataMetni}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setAcikDetayId((prev) => (prev === d.id ? null : d.id))}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Detay
                            {detayAcik ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {(d.durum === 'HATA' || d.durum === 'HAZIR') && (
                            <button
                              onClick={() => yenidenIsleMutation.mutate(d.id)}
                              disabled={yenidenIsleMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Yeniden işle
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`"${d.baslik}" dokümanını silmek istediğine emin misin?`)) {
                                silMutation.mutate(d.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                    {detayAcik && (
                      <tr className="bg-gray-50/70 border-t border-gray-100">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Okunan içerik özeti</p>
                              <p className="text-xs text-gray-700 leading-5 whitespace-pre-wrap">
                                {onizleme || 'Bu dokümanda henüz metin özeti oluşmadı (işlem tamamlanmamış olabilir).'}
                              </p>
                              {d.hamMetin ? (
                                <p className="text-[11px] text-gray-500 mt-2">
                                  Önizleme: {onizleme.length} karakter
                                </p>
                              ) : null}
                            </div>
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                              <p className="text-xs font-semibold text-indigo-900 mb-2">Çıkarılan konu / soru analizi</p>
                              {analiz ? (
                                <div className="text-xs text-gray-700 leading-5 space-y-2">
                                  {analiz.konular && analiz.konular.length > 0 ? (
                                    <p><span className="font-semibold">Konular:</span> {analiz.konular.slice(0, 8).join(' • ')}</p>
                                  ) : null}
                                  {analiz.soruSayisi != null && analiz.soruSayisi > 0 ? (
                                    <p><span className="font-semibold">Soru:</span> ~{analiz.soruSayisi} adet tespit</p>
                                  ) : null}
                                  {analiz.sorular && analiz.sorular.length > 0 ? (
                                    <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                                      {analiz.sorular.slice(0, 5).map((s) => (
                                        <li key={s.sira}>{s.ozet}</li>
                                      ))}
                                    </ul>
                                  ) : null}
                                  {analiz.uretimYonergesi ? (
                                    <p className="text-indigo-800 text-[11px]">{analiz.uretimYonergesi}</p>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">İşlem bitince konu ve soru özeti burada görünür.</p>
                              )}
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <p className="text-xs font-semibold text-gray-600 mb-2">AI üretiminde kullanım</p>
                              <p className="text-xs text-gray-700 leading-5">
                                {turKullanimAciklamasi(d.tur)}
                              </p>
                              <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-500 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full bg-gray-100">Chunk: {d.chunkSayisi}</span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100">Durum: {durum.etiket}</span>
                                {sayfaAraligiEtiket(d.sayfaBaslangic, d.sayfaBitis) ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                    {sayfaAraligiEtiket(d.sayfaBaslangic, d.sayfaBitis)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {yukleAcik && <YukleModali kapat={() => setYukleAcik(false)} onYuklendi={() => qc.invalidateQueries({ queryKey: ['egitim-dokumanlar'] })} />}
    </div>
  );
}

function OzetKart({ etiket, deger, renk }: { etiket: string; deger: number | string; renk: 'indigo' | 'emerald' | 'blue' | 'amber' | 'violet' }) {
  const renkler: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <div className={`rounded-2xl px-4 py-3 ${renkler[renk]}`}>
      <div className="text-xs uppercase tracking-wide font-semibold opacity-70">{etiket}</div>
      <div className="text-2xl font-black mt-1">{deger}</div>
    </div>
  );
}

function YukleModali({ kapat, onYuklendi }: { kapat: () => void; onYuklendi: () => void }) {
  const [baslik, setBaslik] = useState('');
  const [kademe, setKademe] = useState<KademeGrubu>('YKS');
  const [ders, setDers] = useState('');
  const [konuId, setKonuId] = useState('');
  const [tur, setTur] = useState<NonNullable<EgitimDokuman['tur']>>('KONU_ANLATIMI');
  const [yuklemeTipi, setYuklemeTipi] = useState<'dosya' | 'url'>('dosya');
  const [dosya, setDosya] = useState<File | null>(null);
  const [kaynakUrl, setKaynakUrl] = useState('');
  const [sayfaBaslangic, setSayfaBaslangic] = useState('');
  const [sayfaBitis, setSayfaBitis] = useState('');
  const [yuklemeMesaji, setYuklemeMesaji] = useState('');
  const dosyaRef = useRef<HTMLInputElement>(null);

  const dersListesi =
    kademe === 'LGS' ? LGS_DERSLERI : kademe.startsWith('KPSS') ? KPSS_DERSLERI : YKS_DERSLERI;
  const konuKademe = konuApiKademesi(kademe);
  const pdfSecili = pdfKaynakMi(dosya, kaynakUrl, yuklemeTipi);

  // Kademeye ait tüm konuları API'den çek
  const { data: tumKonular = [] } = useQuery<any[]>({
    queryKey: ['rag-konular', konuKademe],
    queryFn: () => soruApi.konular(konuKademe, {}).then((r) => r.data.veri as any[]),
  });

  const gosterilecekKonular = ders ? tumKonular.filter(k => k.ders === ders) : tumKonular;

  const konularDerslereGore = gosterilecekKonular.reduce((acc, k) => {
    const d = k.ders || 'Diğer';
    if (!acc[d]) acc[d] = [];
    acc[d].push(k);
    return acc;
  }, {} as Record<string, any[]>);

  const sayfaAlanlariniEkle = (hedef: Record<string, unknown>) => {
    if (!pdfSecili) return;
    if (sayfaBaslangic.trim()) hedef.sayfaBaslangic = Number(sayfaBaslangic);
    if (sayfaBitis.trim()) hedef.sayfaBitis = Number(sayfaBitis);
  };

  const yukleMutation = useMutation({
    mutationFn: async () => {
      if (yuklemeTipi === 'dosya' && !dosya) throw new Error('Dosya seçilmedi.');
      if (yuklemeTipi === 'url' && !kaynakUrl) throw new Error('URL girilmedi.');
      if (yuklemeTipi === 'dosya' && dosya && dosya.size > MAKS_DOSYA_BOYUTU) {
        throw new Error(`Dosya en fazla ${bayttanInsan(MAKS_DOSYA_BOYUTU)} olabilir.`);
      }

      if (pdfSecili) {
        const bas = sayfaBaslangic.trim() ? Number(sayfaBaslangic) : null;
        const bit = sayfaBitis.trim() ? Number(sayfaBitis) : null;
        if (bas != null && (!Number.isFinite(bas) || bas < 1)) {
          throw new Error('Başlangıç sayfası 1 veya daha büyük olmalıdır.');
        }
        if (bit != null && (!Number.isFinite(bit) || bit < 1)) {
          throw new Error('Bitiş sayfası 1 veya daha büyük olmalıdır.');
        }
        if (bas != null && bit != null && bit < bas) {
          throw new Error('Bitiş sayfası, başlangıç sayfasından küçük olamaz.');
        }
      }

      const ortakAlanlar: Record<string, unknown> = {
        baslik: baslik || (dosya ? dosya.name.replace(/\.[^.]+$/, '') : 'URL Kaynağı'),
        ders: ders || undefined,
        konuId: konuId || undefined,
        ogretimTuru: kademe,
        tur,
      };
      sayfaAlanlariniEkle(ortakAlanlar);

      if (yuklemeTipi === 'dosya' && dosya) {
        setYuklemeMesaji('Dosya sunucuya yükleniyor...');
        const fd = new FormData();
        fd.append('dosya', dosya);
        fd.append('baslik', String(ortakAlanlar.baslik));
        if (ders) fd.append('ders', ders);
        if (konuId) fd.append('konuId', konuId);
        fd.append('ogretimTuru', kademe);
        fd.append('tur', tur);
        if (ortakAlanlar.sayfaBaslangic != null) fd.append('sayfaBaslangic', String(ortakAlanlar.sayfaBaslangic));
        if (ortakAlanlar.sayfaBitis != null) fd.append('sayfaBitis', String(ortakAlanlar.sayfaBitis));
        return adminApi.egitimDokumanYukle(fd);
      }

      return adminApi.egitimDokumanKaydet({
        ...ortakAlanlar,
        kaynakUrl,
      });
    },
    onSuccess: () => {
      toast.basarili('Doküman yüklendi. İşleniyor…');
      onYuklendi();
      kapat();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { mesaj?: string } }; message?: string })?.response?.data?.mesaj
        || (err as Error)?.message
        || 'Yükleme başarısız.';
      toast.hata(msg);
    },
    onSettled: () => {
      setYuklemeMesaji('');
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Eğitim Materyali Ekle</h3>
          <button onClick={kapat} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setYuklemeTipi('dosya')}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition ${yuklemeTipi === 'dosya' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Dosya Yükle
            </button>
            <button
              onClick={() => setYuklemeTipi('url')}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition ${yuklemeTipi === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              URL ile Besle
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Başlık</span>
            <input
              type="text"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder={yuklemeTipi === 'url' ? 'Kaynak Başlığı' : 'Örn. 11. Sınıf Fizik — Hareket'}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm"
            />
          </label>

          {yuklemeTipi === 'url' ? (
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">URL Adresi</span>
              <input
                type="url"
                value={kaynakUrl}
                onChange={(e) => setKaynakUrl(e.target.value)}
                placeholder="https://ogmmateryal.eba.gov.tr/..."
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                İçerik bu linkten otomatik olarak kazınıp parçalara bölünecektir.
              </p>
            </label>
          ) : (
            <div>
              <span className="text-xs font-semibold text-gray-600">Dosya</span>
              <div
                onClick={() => dosyaRef.current?.click()}
                className={`mt-1 cursor-pointer border-2 border-dashed rounded-xl px-4 py-6 text-center transition ${dosya ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'}`}
              >
                <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                {dosya ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 truncate">{dosya.name}</p>
                    <p className="text-xs text-gray-500">{bayttanInsan(dosya.size)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700">Dosya seç veya buraya bırak</p>
                    <p className="text-xs text-gray-500">
                      PDF, DOCX, TXT, MD — maks. {bayttanInsan(MAKS_DOSYA_BOYUTU)} (doğrudan sunucuya)
                    </p>
                  </>
                )}
                <input
                  ref={dosyaRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  hidden
                  onChange={(e) => {
                    const secilen = e.target.files?.[0] || null;
                    if (secilen && secilen.size > MAKS_DOSYA_BOYUTU) {
                      toast.hata(`Dosya çok büyük. En fazla ${bayttanInsan(MAKS_DOSYA_BOYUTU)} yüklenebilir.`);
                      e.currentTarget.value = '';
                      setDosya(null);
                      return;
                    }
                    setDosya(secilen);
                  }}
                />
              </div>
            </div>
          )}

          {pdfSecili && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-900">PDF sayfa aralığı (opsiyonel)</p>
              <p className="text-[11px] text-indigo-700/80">
                Yalnızca belirttiğiniz sayfalar okunur ve AI eğitiminde kullanılır. Boş bırakırsanız tüm PDF işlenir.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-medium text-gray-600">Başlangıç sayfası</span>
                  <input
                    type="number"
                    min={1}
                    value={sayfaBaslangic}
                    onChange={(e) => setSayfaBaslangic(e.target.value)}
                    placeholder="Örn. 5"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-gray-600">Bitiş sayfası</span>
                  <input
                    type="number"
                    min={1}
                    value={sayfaBitis}
                    onChange={(e) => setSayfaBitis(e.target.value)}
                    placeholder="Örn. 24"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Sınav türü / Kademe</span>
              <select
                value={kademe}
                onChange={(e) => {
                  setKademe(e.target.value as KademeGrubu);
                  setDers('');
                  setKonuId('');
                }}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
              >
                {KADEME_SECENEKLERI.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-gray-600">Doküman Türü</span>
              <select
                value={tur}
                onChange={(e) => setTur(e.target.value as NonNullable<EgitimDokuman['tur']>)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
              >
                <option value="KONU_ANLATIMI">Konu anlatımı</option>
                <option value="DENEME_SINAVI">Deneme sınavı</option>
                <option value="SORU_ORNEKLERI">Soru örnekleri</option>
                <option value="COZUM">Çözüm</option>
                <option value="DIGER">Diğer</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Ders (opsiyonel)</span>
            <select
              value={ders}
              onChange={(e) => {
                setDers(e.target.value);
                setKonuId('');
              }}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
            >
              <option value="">— Branş seçin —</option>
              {dersListesi.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Konu Eşleştirme (opsiyonel)</span>
            <select
              value={konuId}
              disabled={gosterilecekKonular.length === 0}
              onChange={(e) => {
                const secilenId = e.target.value;
                setKonuId(secilenId);
                if (secilenId && !ders) {
                  const secilenKonu = tumKonular.find((k: any) => k.id === secilenId);
                  if (secilenKonu && secilenKonu.ders) setDers(secilenKonu.ders);
                }
              }}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              {gosterilecekKonular.length === 0 ? (
                <option value="">— Bu seçimde konu bulunamadı —</option>
              ) : (
                <>
                  <option value="">— Konu Seçin (Opsiyonel) —</option>
                  {Object.entries(konularDerslereGore).map(([dersAdi, konularListesi]) => (
                    <optgroup key={dersAdi} label={dersAdi}>
                      {konularListesi.map((k: any) => (
                        <option key={k.id} value={k.id}>
                          {k.yksSegment && k.yksSegment !== 'YOK' ? `[${k.yksSegment}] ` : ''}{k.uniteAdi ? `${k.uniteAdi} — ` : ''}{k.ad}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Materyali belirli bir konuya eşlerseniz, o konuda soru üretilirken bu materyal öncelikli olarak kullanılır.
            </p>
          </label>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 shrink-0">
          <button onClick={kapat} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Vazgeç</button>
          <button
            onClick={() => yukleMutation.mutate()}
            disabled={yukleMutation.isPending || (yuklemeTipi === 'dosya' ? !dosya : !kaynakUrl)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold text-white shadow-sm transition"
          >
            {yukleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {yukleMutation.isPending && yuklemeMesaji ? yuklemeMesaji : (yuklemeTipi === 'url' ? 'Kaynağı Bağla' : 'Yükle ve İşle')}
          </button>
        </div>
      </div>
    </div>
  );
}
