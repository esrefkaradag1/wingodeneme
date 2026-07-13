'use client';

/**
 * SoruAiGorsel — soru editöründe AI ile görsel üretme paneli.
 * Öğretmen kısa bir Türkçe istek yazar; backend isteği ayrıntılı bir
 * İngilizce görsel promptuna çevirip DALL·E-3 ile üretir ve kalıcı
 * bir URL döndürür. "Soruya ekle" ile görsel soru metnine yerleştirilir.
 */
import { useState } from 'react';
import { ImagePlus, Loader2, Sparkles, Check, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  ders?: string;
  konu?: string;
  /** Üretilen görselin kalıcı URL'ini soru metnine ekler */
  onEkle: (url: string) => void;
}

const ORNEK_PROMPTLAR = [
  'Eğik düzlemde duran bir bloğa etki eden kuvvetler (ağırlık, normal, sürtünme) vektörlerle gösterilsin',
  'Bir devrede seri bağlı iki direnç ve bir pil; akım yönü okla belirtilsin',
  'Birim çember üzerinde 30°, 45°, 60° açıların sinüs-kosinüs değerleri',
  'Fotosentez sürecini gösteren basit bir yaprak şeması (CO₂, H₂O, ışık, O₂)',
];

export default function SoruAiGorsel({ ders, konu, onEkle }: Props) {
  const [prompt, setPrompt] = useState('');
  const [kalite, setKalite] = useState<'standard' | 'hd'>('standard');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gorselUrl, setGorselUrl] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [eklendi, setEklendi] = useState(false);

  const uret = async () => {
    const metin = prompt.trim();
    if (metin.length < 3) return;
    setYukleniyor(true);
    setHata(null);
    setEklendi(false);
    try {
      const r = await api.post(
        '/ai/gorsel-uret',
        { prompt: metin, ders, konu, kalite },
        { timeout: 150000 },
      );
      const url = r.data?.veri?.url as string | undefined;
      if (!url) throw new Error('Görsel alınamadı.');
      setGorselUrl(url);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        (e as Error)?.message ||
        'Görsel üretilemedi.';
      setHata(msg);
    } finally {
      setYukleniyor(false);
    }
  };

  const ekle = () => {
    if (!gorselUrl) return;
    onEkle(gorselUrl);
    setEklendi(true);
  };

  const sifirla = () => {
    setGorselUrl(null);
    setHata(null);
    setEklendi(false);
  };

  return (
    <div className="rounded-3xl border border-fuchsia-100 bg-gradient-to-b from-fuchsia-50/50 to-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-fuchsia-600 text-white grid place-items-center shadow-sm">
          <Sparkles className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">AI Görsel Üret</h3>
          <p className="text-[11px] text-gray-500">
            Kısaca ne istediğini yaz; AI bunu sınav-uyumlu net bir diyagrama çevirir.
            {ders ? ` (${ders}${konu ? ' · ' + konu : ''})` : ''}
          </p>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Örn. Eğik düzlemde bir bloğa etki eden kuvvetleri vektörlerle göster…"
        rows={3}
        disabled={yukleniyor}
        className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 outline-none focus:border-fuchsia-500 text-sm resize-none disabled:opacity-60"
      />

      <div className="flex flex-wrap gap-1.5">
        {ORNEK_PROMPTLAR.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrompt(p)}
            disabled={yukleniyor}
            className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-fuchsia-100 hover:border-fuchsia-300 hover:bg-fuchsia-50 text-gray-600 transition disabled:opacity-50 max-w-full truncate"
            title={p}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {(['standard', 'hd'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKalite(k)}
              disabled={yukleniyor}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                kalite === k ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {k === 'standard' ? 'Standart' : 'HD (net)'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={uret}
          disabled={yukleniyor || prompt.trim().length < 3}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white text-sm font-semibold"
        >
          {yukleniyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {yukleniyor ? 'Üretiliyor…' : 'Görsel Üret'}
        </button>
      </div>

      {hata && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {hata}
        </div>
      )}

      {gorselUrl && (
        <div className="space-y-2">
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white grid place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gorselUrl} alt="AI görseli önizleme" className="max-h-80 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ekle}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> {eklendi ? 'Tekrar Ekle' : 'Soruya Ekle'}
            </button>
            <button
              type="button"
              onClick={uret}
              disabled={yukleniyor}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Yeniden Üret
            </button>
            <button
              type="button"
              onClick={sifirla}
              className="ml-auto text-[11px] text-gray-400 hover:text-gray-700"
            >
              Temizle
            </button>
          </div>
          {eklendi && (
            <p className="text-[11px] text-emerald-600 font-semibold">
              ✓ Görsel soru metnine eklendi. Kaydetmeyi unutmayın.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
