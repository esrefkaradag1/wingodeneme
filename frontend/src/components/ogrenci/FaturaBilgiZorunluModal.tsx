'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Save } from 'lucide-react';
import { kullaniciApi } from '@/lib/api';
import { faturaProfilEksikMi, tcKimlikNoGecerliMi, tcKimlikNoNormalize } from '@/lib/tcKimlik';
import { toast } from '@/store/toast.store';
import { useAuthStore } from '@/store/auth.store';

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition';

type Profil = {
  ad?: string;
  soyad?: string;
  sehir?: string | null;
  ilce?: string | null;
  adres?: string | null;
  tcKimlikNo?: string | null;
};

/**
 * Fatura için TC + adres eksikse öğrenci ana ekranda ilerleyemez; formu doldurması gerekir.
 */
export function FaturaBilgiZorunluModal() {
  const qc = useQueryClient();
  const kullanici = useAuthStore((s) => s.kullanici);
  const ogrenciMi = kullanici?.rol === 'OGRENCI';

  const { data, isLoading } = useQuery({
    queryKey: ['ogrenci', 'profil'],
    queryFn: () => kullaniciApi.profilGetir(),
    enabled: ogrenciMi,
    staleTime: 30_000,
  });

  const profil: Profil | null = data?.data?.veri ?? null;
  const eksik = ogrenciMi && !isLoading && faturaProfilEksikMi(profil);

  const [tcKimlikNo, setTcKimlikNo] = useState('');
  const [adres, setAdres] = useState('');
  const [sehir, setSehir] = useState('');
  const [ilce, setIlce] = useState('');

  useEffect(() => {
    if (!profil) return;
    setTcKimlikNo(profil.tcKimlikNo || '');
    setAdres(profil.adres || '');
    setSehir(profil.sehir || '');
    setIlce(profil.ilce || '');
  }, [profil]);

  const kaydetMut = useMutation({
    mutationFn: () => {
      const tc = tcKimlikNoNormalize(tcKimlikNo);
      if (!tcKimlikNoGecerliMi(tc)) {
        throw { response: { data: { mesaj: 'Geçerli bir TC kimlik numarası girin' } } };
      }
      if (adres.trim().length < 5) {
        throw { response: { data: { mesaj: 'Açık adres en az 5 karakter olmalı' } } };
      }
      if (sehir.trim().length < 2) {
        throw { response: { data: { mesaj: 'Şehir bilgisini girin' } } };
      }
      return kullaniciApi.profilGuncelle({
        tcKimlikNo: tc,
        adres: adres.trim(),
        sehir: sehir.trim(),
        ilce: ilce.trim() || null,
      });
    },
    onSuccess: () => {
      toast.basarili('Fatura bilgileriniz kaydedildi.');
      qc.invalidateQueries({ queryKey: ['ogrenci', 'profil'] });
    },
    onError: (e: { response?: { data?: { mesaj?: string } }; message?: string }) =>
      toast.hata(e?.response?.data?.mesaj || e?.message || 'Kayıt başarısız'),
  });

  if (!eksik) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fatura-zorunlu-baslik"
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </span>
          <div>
            <h2 id="fatura-zorunlu-baslik" className="text-lg font-black text-gray-900">
              Fatura bilgilerinizi tamamlayın
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ödeme ve fatura için TC kimlik numarası ile açık adres zorunludur. Kaydettikten sonra devam
              edebilirsiniz.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">TC kimlik no</label>
            <input
              className={inputCls}
              inputMode="numeric"
              maxLength={11}
              value={tcKimlikNo}
              onChange={(e) => setTcKimlikNo(tcKimlikNoNormalize(e.target.value))}
              placeholder="11 haneli TC"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Açık adres</label>
            <textarea
              className={`${inputCls} resize-none min-h-[88px]`}
              value={adres}
              onChange={(e) => setAdres(e.target.value)}
              placeholder="Mahalle, sokak, bina/daire no"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Şehir</label>
              <input
                className={inputCls}
                value={sehir}
                onChange={(e) => setSehir(e.target.value)}
                placeholder="İstanbul"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">İlçe</label>
              <input
                className={inputCls}
                value={ilce}
                onChange={(e) => setIlce(e.target.value)}
                placeholder="Başakşehir"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={kaydetMut.isPending}
          onClick={() => kaydetMut.mutate()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-sm font-bold disabled:opacity-50"
        >
          {kaydetMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet ve devam et
        </button>
      </div>
    </div>
  );
}
