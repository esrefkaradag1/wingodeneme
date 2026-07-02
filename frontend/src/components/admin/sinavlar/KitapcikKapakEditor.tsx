'use client';

import { ImageIcon, Link2, Upload, XCircle } from 'lucide-react';

const MAX_BOYUT = 4 * 1024 * 1024;

interface KitapcikKapakEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function KitapcikKapakEditor({ value, onChange }: KitapcikKapakEditorProps) {
  const dosyadanOku = (dosya: File) => {
    if (!dosya.type.startsWith('image/')) {
      alert('Lütfen PNG, JPG veya WebP formatında bir görsel seçin.');
      return;
    }
    if (dosya.size > MAX_BOYUT) {
      alert('Kapak görseli 4 MB\'dan büyük olamaz.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(dosya);
  };

  const handleDosya = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (dosya) dosyadanOku(dosya);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dosya = e.dataTransfer.files?.[0];
    if (dosya) dosyadanOku(dosya);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="shrink-0">
          {value ? (
            <div className="relative group w-[180px]">
              <div className="aspect-[210/297] rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
                <img src={value} alt="Kitapçık kapağı önizleme" className="w-full h-full object-contain" />
              </div>
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute -top-2 -right-2 bg-white rounded-full shadow-md text-rose-500 hover:text-rose-700"
                title="Kapağı kaldır"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <label
                htmlFor="kitapcik-kapak-upload"
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                Değiştir
              </label>
            </div>
          ) : (
            <label
              htmlFor="kitapcik-kapak-upload"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-3 aspect-[210/297] w-[180px] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer p-4 text-center"
            >
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-xs font-bold text-gray-500">Kapak yükle</span>
              <span className="text-[10px] text-gray-400">A4 dikey, en fazla 4 MB</span>
            </label>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kapak görseli adresi (opsiyonel)</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={value.startsWith('data:') ? '' : value}
                onChange={(e) => onChange(e.target.value.trim())}
                className="input-field pl-9"
                placeholder="https://... veya yüklenen görsel"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Deneme kitapçığının ilk sayfasında gösterilir. Öğrenci kitapçığı, yönetici önizlemesi ve HTML indirmede
            kullanılır. Boş bırakırsanız varsayılan ÖSYM/MEB kapak düzeni kullanılır.
          </p>
          <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 text-[11px] text-indigo-900">
            <ImageIcon className="w-4 h-4 shrink-0" />
            Önerilen boyut: A4 dikey (210×297 mm), PNG veya JPG.
          </div>
        </div>
      </div>

      <input id="kitapcik-kapak-upload" type="file" accept="image/*" onChange={handleDosya} className="hidden" />
    </div>
  );
}
