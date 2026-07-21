'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, Loader2, BookOpen, CheckSquare, Square, X } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { soruListeOnMetin } from '@/lib/soruCozumYardim';

interface SoruSecimModalProps {
  sinavId: string;
  konuId: string;
  konuAd: string;
  sinavdakiKonuSoruIds?: string[];
  /** Öğretmen atamasında admin onayı mesajı */
  adminOnayiGerekli?: boolean;
  onClose: () => void;
}

interface SoruSecimItem {
  id: string;
  siraNo: number;
  metinHtml: string;
  dogruCevap: string;
  zorluk: string;
  konuId: string;
  konu: { ad: string; ders: string };
  sinav?: { baslik: string } | null;
}

export default function SoruSecimModal({
  sinavId,
  konuId,
  konuAd,
  sinavdakiKonuSoruIds = [],
  adminOnayiGerekli = false,
  onClose,
}: SoruSecimModalProps) {
  const queryClient = useQueryClient();
  const [soruAramaMetni, setSoruAramaMetni] = useState('');
  const [seciliSoruIds, setSeciliSoruIds] = useState<string[]>([]);

  // Konuya ait havuzdaki soruları çek
  const { data: soruSecimRes, isLoading: soruSecimYukleniyor } = useQuery({
    queryKey: ['admin-konu-sorulari', konuId],
    queryFn: () => adminApi.konuSorulari(konuId),
    enabled: !!konuId,
  });

  const tumSoruSecim = (soruSecimRes?.data?.veri || []) as SoruSecimItem[];

  const filtreliSoruSecim = tumSoruSecim.filter((s) => {
    const arama = soruAramaMetni.toLowerCase();
    const metin = (s.metinHtml || '').toLowerCase();
    const konuAd = (s.konu?.ad || '').toLowerCase();
    return metin.includes(arama) || konuAd.includes(arama);
  });

  const sinavdakiKonuSoruIdSet = new Set(sinavdakiKonuSoruIds);
  const eklenebilirSoruSecim = filtreliSoruSecim.filter((soru) => !sinavdakiKonuSoruIdSet.has(soru.id));
  const yeniSecimSayisi = seciliSoruIds.filter((soruId) => !sinavdakiKonuSoruIdSet.has(soruId)).length;

  const soruAtaMut = useMutation({
    mutationFn: () => {
      const yeniSecimler = seciliSoruIds.filter((soruId) => !sinavdakiKonuSoruIdSet.has(soruId));
      return adminApi.sinavSoruAta(sinavId, yeniSecimler, konuId);
    },
    onSuccess: (res: {
      data?: {
        basarili?: boolean;
        veri?: {
          eklenenAdet?: number;
          kopyalananAdet?: number;
          tasinanAdet?: number;
          adminOnayiBekliyor?: boolean;
        };
      };
    }) => {
      const veri = res?.data?.veri;
      const eklenen = veri?.eklenenAdet ?? seciliSoruIds.filter((soruId) => !sinavdakiKonuSoruIdSet.has(soruId)).length;
      const kopya = veri?.kopyalananAdet ?? 0;
      const onayBekliyor = Boolean(veri?.adminOnayiBekliyor ?? adminOnayiGerekli);
      let mesaj: string;
      if (eklenen <= 0) {
        mesaj = 'Yeni soru eklenmedi.';
      } else if (onayBekliyor) {
        mesaj =
          eklenen === 1
            ? 'Soru sınava eklendi; admin onayından sonra öğrenciye açılır.'
            : `${eklenen} soru eklendi; admin onayından sonra öğrenciye açılır.`;
      } else if (kopya > 0 && kopya === eklenen) {
        mesaj =
          eklenen === 1
            ? 'Soru kopyalanarak bu kitapçığa eklendi (önceki denemede kaldı).'
            : `${eklenen} soru kopyalanarak eklendi (önceki kitapçıklar korundu).`;
      } else if (kopya > 0) {
        mesaj = `${eklenen} soru eklendi (${kopya} kopya, önceki kitapçıklar korundu).`;
      } else {
        mesaj = eklenen === 1 ? 'Seçilen soru sınava eklendi.' : `${eklenen} soru sınava eklendi.`;
      }
      if (eklenen > 0) {
        toast.basarili(mesaj, onayBekliyor ? 'Onay bekliyor' : 'Tamamlandı');
      } else {
        toast.uyari(mesaj);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-sinav-detay', sinavId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sinav-sorular', sinavId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
      queryClient.invalidateQueries({ queryKey: ['admin-konu-sorulari', konuId] });
      onClose();
    },
    onError: (err: unknown) => {
      const axiosMsg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { mesaj?: string } } }).response?.data?.mesaj;
      toast.hata(
        typeof axiosMsg === 'string' && axiosMsg.trim() ? axiosMsg : 'Sorular atanamadı.',
        'Hata',
      );
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <div>
            <h3 className="font-bold text-lg">Soru Seçimi</h3>
            <p className="text-xs text-indigo-100">{konuAd}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={soruAramaMetni}
              onChange={(e) => setSoruAramaMetni(e.target.value)}
              placeholder="Soru içeriğinde ara..."
              className="input-field pl-9 w-full text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {soruSecimYukleniyor ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filtreliSoruSecim.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold">Bu konuya ait onaylanmış soru bulunamadı.</p>
              <p className="text-sm mt-1">Önce soru bankasına bu konuda sorular ekleyin.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50">
                <span className="text-xs text-gray-500 font-medium">{filtreliSoruSecim.length} soru bulundu</span>
                <button
                  onClick={() => {
                    const eklenebilirIds = eklenebilirSoruSecim.map((soru) => soru.id);
                    const hepsiSecili = eklenebilirIds.length > 0 && eklenebilirIds.every((soruId) => seciliSoruIds.includes(soruId));
                    if (hepsiSecili) {
                      setSeciliSoruIds([]);
                    } else {
                      setSeciliSoruIds(eklenebilirIds);
                    }
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {eklenebilirSoruSecim.length > 0 &&
                  eklenebilirSoruSecim.every((soru) => seciliSoruIds.includes(soru.id))
                    ? 'Tümünü Kaldır'
                    : 'Tümünü Seç'}
                </button>
              </div>
              {filtreliSoruSecim.map((soru, i) => {
                const sinavda = sinavdakiKonuSoruIdSet.has(soru.id);
                const secili = sinavda || seciliSoruIds.includes(soru.id);
                return (
                  <button
                    key={soru.id}
                    type="button"
                    disabled={sinavda}
                    onClick={() => {
                      if (sinavda) return;
                      setSeciliSoruIds(prev =>
                        prev.includes(soru.id)
                          ? prev.filter(x => x !== soru.id)
                          : [...prev, soru.id]
                      );
                    }}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      sinavda
                        ? 'border-emerald-200 bg-emerald-50/70 opacity-90 cursor-default'
                        : secili
                        ? 'border-indigo-200 bg-indigo-50'
                        : 'border-gray-100 bg-white hover:border-indigo-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {secili
                        ? <CheckSquare className="w-5 h-5 text-indigo-600" />
                        : <Square className="w-5 h-5 text-gray-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium line-clamp-2">
                        {soruListeOnMetin(soru.metinHtml, 150)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          soru.zorluk === 'KOLAY' ? 'bg-emerald-50 text-emerald-700' :
                          soru.zorluk === 'ZOR' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>{soru.zorluk}</span>
                        {sinavda && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            Bu sınava ekli
                          </span>
                        )}
                        {soru.sinav && !sinavda && (
                          <span className="text-[10px] text-gray-400 font-medium truncate">
                            📋 {soru.sinav.baslik}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-300 font-mono shrink-0">#{i + 1}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-600 font-medium">
            {yeniSecimSayisi > 0
              ? <><strong className="text-indigo-600">{yeniSecimSayisi}</strong> yeni soru seçildi</>
              : sinavdakiKonuSoruIds.length > 0
                ? `${sinavdakiKonuSoruIds.length} soru zaten bu sınava ekli`
                : 'Soru seçilmedi'}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm"
            >
              İptal
            </button>
            <button
              type="button"
              disabled={yeniSecimSayisi === 0 || soruAtaMut.isPending}
              onClick={() => soruAtaMut.mutate()}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {soruAtaMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {yeniSecimSayisi} Soruyu Sınava Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
