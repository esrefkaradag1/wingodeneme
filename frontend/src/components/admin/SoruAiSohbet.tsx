'use client';

/**
 * SoruAiSohbet — soru düzenleme modal'ında AI yardımcı paneli.
 * Öğretmen komut yazar; AI mevcut soruyu önerilen şekilde günceller.
 * Kullanıcı "Uygula" derse parent form'a yansır.
 */
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Wand2, Loader2, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

export interface AiOneri {
  metinHtml?: string;
  svgGorsel?: string;
  secenekler?: Record<string, string>;
  dogruCevap?: string;
  kazanim?: string;
  zorluk?: string;
  aciklama: string;
  uyari?: string;
}

interface Mesaj {
  rol: 'kullanici' | 'asistan';
  metin: string;
  oneri?: AiOneri;
  zaman: number;
}

interface Props {
  /** Düzenlenen soru id; yeni soru eklerken null verilebilir (devre dışı) */
  soruId: string | null;
  /** Formdaki güncel soru durumu — AI art arda düzenlemelerde DB yerine bunu kullanır */
  mevcutDurum?: {
    metinHtml: string;
    secenekler: Record<string, string>;
    dogruCevap: string;
    kazanim?: string;
    zorluk?: string;
  } | null;
  /** Kullanıcı "Uygula" dediğinde parent'ın form state'ini günceller */
  onUygula: (oneri: AiOneri) => void;
}

function aiOneriUygulanabilirMi(oneri?: AiOneri | null): boolean {
  if (!oneri) return false;
  return Boolean(
    oneri.metinHtml ||
    oneri.svgGorsel ||
    (oneri.secenekler && Object.keys(oneri.secenekler).length > 0) ||
    oneri.dogruCevap ||
    oneri.kazanim ||
    oneri.zorluk,
  );
}

const HIZLI_KOMUTLAR = [
  'Şıkları karıştır (doğru cevap aynı kalsın)',
  'Doğru cevabı C yap, çeldiricileri ona göre düzenle',
  'Soru kökünü daha sade ve net yaz',
  'Çeldiricileri öğrenci yanılgılarına dayandır',
  'Bu soruyu zorlaştır',
  'Bu soruyu kolaylaştır',
  'Şıkları LGS formatına (A–D) dönüştür',
  'Dilini düzelt ve imla hatalarını gider',
  'Şekle uygun basit bir SVG grafik ekle (soru köküne atıf yap)',
  'Mevcut şekli daha okunaklı olacak şekilde yeniden çiz',
];

export default function SoruAiSohbet({ soruId, mevcutDurum, onUygula }: Props) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [komut, setKomut] = useState('');
  const [hedefKazanim, setHedefKazanim] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const sonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mesajlar]);

  const gonder = async (k?: string) => {
    const metin = (k ?? komut).trim();
    if (!metin) return;
    if (!soruId) {
      alert('AI yardım yalnızca kayıtlı sorular için kullanılabilir. Önce soruyu kaydet, sonra düzenleyerek yardım iste.');
      return;
    }
    setKomut('');
    setMesajlar((m) => [...m, { rol: 'kullanici', metin, zaman: Date.now() }]);
    setYukleniyor(true);
    try {
      const gecmis = mesajlar.slice(-6).map((m) => ({ rol: m.rol, metin: m.metin }));
      const r = await api.post(`/ai/sorular/${soruId}/yardim`, {
        komut: metin,
        gecmis,
        hedefKazanim: hedefKazanim.trim() || undefined,
        mevcutDurum: mevcutDurum || undefined,
      }, { timeout: 120000 });
      const oneri = r.data?.veri as AiOneri;
      const aciklama = oneri?.aciklama || 'Soru güncellendi.';
      const uyari = oneri?.uyari ? `\n⚠️ ${oneri.uyari}` : '';
      setMesajlar((m) => [...m, { rol: 'asistan', metin: aciklama + uyari, oneri, zaman: Date.now() }]);
      if (aiOneriUygulanabilirMi(oneri)) {
        onUygula(oneri);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj
        || (e as Error)?.message
        || 'AI yanıtı alınamadı.';
      setMesajlar((m) => [...m, { rol: 'asistan', metin: `❌ ${msg}`, zaman: Date.now() }]);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[480px] bg-gradient-to-b from-indigo-50/40 to-white rounded-3xl border border-indigo-100">
      {/* Başlık */}
      <div className="px-5 py-4 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-sm">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">AI Yardımcı</h3>
            <p className="text-[11px] text-gray-500">Komut yazarak soruyu düzenle. AI önerisi otomatik forma yansır; istersen «Uygula» ile tekrar uygulayabilirsin.</p>
          </div>
        </div>
        {mesajlar.length > 0 && (
          <button
            onClick={() => setMesajlar([])}
            className="text-[11px] text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Sıfırla
          </button>
        )}
      </div>

      {/* Hızlı komut butonları */}
      <div className="px-5 pt-4 pb-1">
        <label className="block">
          <span className="text-[11px] font-semibold text-gray-600">Hedef kazanım (opsiyonel)</span>
          <input
            type="text"
            value={hedefKazanim}
            onChange={(e) => setHedefKazanim(e.target.value)}
            placeholder="Örn. Üslü ifadelerde işlem önceliğini uygular."
            disabled={!soruId || yukleniyor}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-white border border-gray-200 outline-none focus:border-indigo-500 text-xs disabled:opacity-60"
          />
        </label>
      </div>
      {mesajlar.length === 0 && (
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {HIZLI_KOMUTLAR.map((k) => (
            <button
              key={k}
              onClick={() => gonder(k)}
              disabled={!soruId || yukleniyor}
              className="text-left text-xs px-3 py-2 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 transition disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5 inline mr-1.5 text-indigo-600" />
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {mesajlar.map((m, i) => (
          <div key={i} className={`flex ${m.rol === 'kullanici' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.rol === 'kullanici' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 border border-gray-100'} rounded-2xl px-4 py-2.5 shadow-sm`}>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${m.rol === 'kullanici' ? '' : 'text-gray-800'}`}>{m.metin}</p>

              {m.oneri && aiOneriUygulanabilirMi(m.oneri) && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Önerilen Değişiklikler</p>
                  <ul className="space-y-1 text-xs text-gray-700">
                    {m.oneri.metinHtml && <li>📝 Soru metni güncellenecek</li>}
                    {m.oneri.secenekler && <li>🔤 Şıklar yeniden yazılacak</li>}
                    {m.oneri.dogruCevap && <li>✅ Doğru cevap: <b>{m.oneri.dogruCevap}</b></li>}
                    {m.oneri.kazanim && <li>🎯 Kazanım güncellenecek</li>}
                    {m.oneri.zorluk && <li>🌡️ Zorluk: <b>{m.oneri.zorluk}</b></li>}
                  </ul>
                  {m.oneri.uyari && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                      <span>{m.oneri.uyari}</span>
                    </div>
                  )}
                  <button
                    onClick={() => onUygula(m.oneri!)}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" /> Uygula
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {yukleniyor && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-500 border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Düşünüyor…
            </div>
          </div>
        )}
        <div ref={sonRef} />
      </div>

      {/* Giriş kutusu */}
      <div className="px-3 py-3 border-t border-indigo-100 bg-white/70">
        <div className="flex items-end gap-2">
          <textarea
            value={komut}
            onChange={(e) => setKomut(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                gonder();
              }
            }}
            placeholder={soruId ? 'Bir komut yaz… (Enter: gönder, Shift+Enter: yeni satır)' : 'AI yardım için önce soruyu kaydet'}
            disabled={!soruId || yukleniyor}
            rows={2}
            className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 outline-none focus:border-indigo-500 text-sm resize-none disabled:opacity-60"
          />
          <button
            onClick={() => gonder()}
            disabled={!soruId || yukleniyor || !komut.trim()}
            className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {yukleniyor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
