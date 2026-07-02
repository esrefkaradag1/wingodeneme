'use client';

import { useState, useRef } from 'react';
import { Upload, X, Camera, FileText, Loader2, CheckCircle } from 'lucide-react';
import { sinavApi } from '@/lib/api';
import { toast } from '@/store/toast.store';

interface Props {
  katilimId: string;
  onKapat: () => void;
  onBasarili: () => void;
}

export function OptikFormYukle({ katilimId, onKapat, onBasarili }: Props) {
  const [dosya, setDosya] = useState<File | null>(null);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [tamamlandi, setTamamlandi] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dosyaSec = (secilenDosya: File) => {
    setDosya(secilenDosya);
    const okuyucu = new FileReader();
    okuyucu.onload = (e) => setOnizleme(e.target?.result as string);
    okuyucu.readAsDataURL(secilenDosya);
  };

  const surukBirak = (e: React.DragEvent) => {
    e.preventDefault();
    const surukDosya = e.dataTransfer.files[0];
    if (surukDosya && (surukDosya.type.includes('image') || surukDosya.type === 'application/pdf')) {
      dosyaSec(surukDosya);
    }
  };

  const yukle = async () => {
    if (!dosya) return;
    setYukleniyor(true);
    try {
      const form = new FormData();
      form.append('form', dosya);
      await sinavApi.optikFormYukle(katilimId, form);
      setTamamlandi(true);
      setTimeout(onBasarili, 1500);
    } catch {
      toast.hata('Yükleme başarısız. Lütfen tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Başlık */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Optik Form Yükle</h2>
            <p className="text-sm text-gray-500 mt-0.5">A4 cevap kâğıdını fotoğraflayın ve yükleyin</p>
          </div>
          <button onClick={onKapat} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {tamamlandi ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Yükleme Başarılı!</h3>
              <p className="text-gray-500 text-sm mt-1">Cevaplarınız işleme alındı</p>
            </div>
          ) : (
            <>
              {/* Dosya yükleme alanı */}
              <div
                onDrop={surukBirak}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                {onizleme ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={onizleme} alt="Önizleme" className="max-h-48 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Upload className="w-10 h-10" />
                    <div>
                      <p className="font-medium text-gray-600">Dosyayı buraya sürükleyin</p>
                      <p className="text-sm">veya tıklayarak seçin</p>
                    </div>
                    <p className="text-xs text-gray-400">JPG, PNG, PDF (maks. 10 MB)</p>
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => e.target.files?.[0] && dosyaSec(e.target.files[0])}
                className="hidden"
              />

              {/* Hızlı seçenekler */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if ('mediaDevices' in navigator) {
                      inputRef.current?.click();
                    }
                  }}
                  className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  <Camera className="w-4 h-4 text-indigo-600" /> Fotoğraf Çek
                </button>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  <FileText className="w-4 h-4 text-indigo-600" /> Dosya Seç
                </button>
              </div>

              {/* İpuçları */}
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                <p className="font-medium mb-1">📸 En iyi sonuç için:</p>
                <ul className="space-y-0.5 text-blue-600 text-xs">
                  <li>• Iyi aydınlatılmış ortamda çekin</li>
                  <li>• Kağıdı düzgün tutun, kıvrılmamasına dikkat edin</li>
                  <li>• Tüm kağıt fotoğraf karesinde görünmeli</li>
                  <li>• En az 300 DPI çözünürlük önerilir</li>
                </ul>
              </div>

              {dosya && (
                <button
                  onClick={yukle}
                  disabled={yukleniyor}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {yukleniyor ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> İşleniyor...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Formu Yükle ve Oku</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
