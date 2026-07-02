'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ImagePlus, Lightbulb, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';

type OnizlemeGorsel = {
  id: string;
  dosya: File;
  onizleme: string;
};

type OgretmenOneriModalProps = {
  acik: boolean;
  onKapat: () => void;
};

const MAKS_GORSEL = 5;
const MAKS_BOYUT = 5 * 1024 * 1024;

export function OgretmenOneriModal({ acik, onKapat }: OgretmenOneriModalProps) {
  const pathname = usePathname();
  const dosyaInputRef = useRef<HTMLInputElement>(null);
  const [baslik, setBaslik] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [gorseller, setGorseller] = useState<OnizlemeGorsel[]>([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [acik]);

  useEffect(() => {
    return () => {
      gorseller.forEach((g) => URL.revokeObjectURL(g.onizleme));
    };
  }, [gorseller]);

  const formuSifirla = () => {
    gorseller.forEach((g) => URL.revokeObjectURL(g.onizleme));
    setBaslik('');
    setMesaj('');
    setGorseller([]);
  };

  const modalKapat = () => {
    if (gonderiliyor) return;
    formuSifirla();
    onKapat();
  };

  const gorselEkle = (dosyalar: FileList | null) => {
    if (!dosyalar?.length) return;
    const yeni: OnizlemeGorsel[] = [];
    for (const dosya of Array.from(dosyalar)) {
      if (gorseller.length + yeni.length >= MAKS_GORSEL) {
        toast.uyari(`En fazla ${MAKS_GORSEL} görsel ekleyebilirsiniz.`);
        break;
      }
      if (!dosya.type.startsWith('image/')) {
        toast.hata('Yalnızca görsel dosyaları yükleyebilirsiniz.');
        continue;
      }
      if (dosya.size > MAKS_BOYUT) {
        toast.hata(`${dosya.name} çok büyük (en fazla 5 MB).`);
        continue;
      }
      yeni.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dosya,
        onizleme: URL.createObjectURL(dosya),
      });
    }
    if (yeni.length) setGorseller((prev) => [...prev, ...yeni]);
    if (dosyaInputRef.current) dosyaInputRef.current.value = '';
  };

  const gorselSil = (id: string) => {
    setGorseller((prev) => {
      const hedef = prev.find((g) => g.id === id);
      if (hedef) URL.revokeObjectURL(hedef.onizleme);
      return prev.filter((g) => g.id !== id);
    });
  };

  const gonder = async () => {
    const metin = mesaj.trim();
    if (metin.length < 10) {
      toast.hata('Lütfen en az 10 karakterlik bir açıklama yazın.');
      return;
    }

    setGonderiliyor(true);
    try {
      const form = new FormData();
      if (baslik.trim()) form.append('baslik', baslik.trim());
      form.append('mesaj', metin);
      form.append('sayfaYolu', pathname || '/panel');
      gorseller.forEach((g) => form.append('gorseller', g.dosya));

      await api.post('/ogretmen-onerileri', form);
      toast.basarili('Öneriniz iletildi. Teşekkür ederiz!');
      formuSifirla();
      onKapat();
    } catch (e: unknown) {
      const mesajHata = (e as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj;
      toast.hata(mesajHata || 'Öneri gönderilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        aria-label="Kapat"
        onClick={modalKapat}
      />
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="flex items-center gap-2 text-indigo-600">
              <Lightbulb className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Öneride Bulun</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Yazılım öneriniz veya isteğiniz</h2>
            <p className="mt-1 text-xs text-slate-500">
              Panel, soru bankası, AI veya genel kullanım hakkında görüşlerinizi paylaşın.
            </p>
          </div>
          <button
            type="button"
            onClick={modalKapat}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="oneri-baslik" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Konu (isteğe bağlı)
            </label>
            <input
              id="oneri-baslik"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Örn: AI soru düzenleme, soru bankası filtreleri…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="oneri-mesaj" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Açıklama *
            </label>
            <textarea
              id="oneri-mesaj"
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              rows={5}
              placeholder="Ne geliştirilmesini veya düzeltilmesini istiyorsunuz? Mümkünse örnek verin."
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              maxLength={8000}
            />
            <p className="mt-1 text-[11px] text-slate-400">{mesaj.trim().length}/8000 · en az 10 karakter</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ekran görüntüsü / fotoğraf
              </label>
              <span className="text-[11px] text-slate-400">{gorseller.length}/{MAKS_GORSEL}</span>
            </div>

            {gorseller.length > 0 ? (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {gorseller.map((g) => (
                  <div key={g.id} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={g.onizleme} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => gorselSil(g.id)}
                      className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Görseli kaldır"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {gorseller.length < MAKS_GORSEL ? (
              <>
                <input
                  ref={dosyaInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => gorselEkle(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => dosyaInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700"
                >
                  <ImagePlus className="h-4 w-4" />
                  Görsel ekle (JPG, PNG, WEBP — max 5 MB)
                </button>
              </>
            ) : null}
          </div>

          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Sayfa: <span className="font-medium text-slate-700">{pathname || '/panel'}</span>
          </p>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <button
            type="button"
            onClick={modalKapat}
            disabled={gonderiliyor}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={gonder}
            disabled={gonderiliyor || mesaj.trim().length < 10}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {gonderiliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
