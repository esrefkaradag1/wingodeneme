'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { Loader2, Plus, MessageCircle, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';

type Talep = {
  id: string;
  baslik: string;
  durum: 'ACIK' | 'BEKLEMEDE' | 'COZULDU' | 'KAPANDI';
  oncelik: number;
  sonMesajAt: string;
  olusturuldu: string;
};

type Mesaj = {
  id: string;
  gonderenRol: string;
  mesaj: string;
  olusturuldu: string;
};

function durumRozet(d: Talep['durum']) {
  if (d === 'ACIK') return { t: 'Açık', c: 'bg-emerald-50 text-emerald-700 border-emerald-100', i: Clock };
  if (d === 'BEKLEMEDE') return { t: 'Yanıtlandı', c: 'bg-indigo-50 text-indigo-700 border-indigo-100', i: MessageCircle };
  if (d === 'COZULDU') return { t: 'Çözüldü', c: 'bg-emerald-50 text-emerald-700 border-emerald-100', i: CheckCircle2 };
  return { t: 'Kapandı', c: 'bg-gray-50 text-gray-600 border-gray-100', i: XCircle };
}

export default function DestekSayfasi() {
  const qc = useQueryClient();
  const [yeniAcik, setYeniAcik] = useState(false);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [baslik, setBaslik] = useState('');
  const [ilkMesaj, setIlkMesaj] = useState('');
  const [mesaj, setMesaj] = useState('');

  const { data: taleplerData, isLoading } = useQuery({
    queryKey: ['destek', 'benim'],
    queryFn: () => api.get('/destek/benim'),
  });
  const talepler: Talep[] = taleplerData?.data?.veri || [];

  const { data: detayData, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['destek', 'detay', seciliId],
    queryFn: () => api.get(`/destek/benim/${seciliId}`),
    enabled: !!seciliId,
  });

  const detay = detayData?.data?.veri as (Talep & { mesajlar: Mesaj[] }) | null;

  const yeniMut = useMutation({
    mutationFn: () => api.post('/destek/benim', { baslik, mesaj: ilkMesaj }),
    onSuccess: (r) => {
      toast.basarili('Destek talebi oluşturuldu.');
      setYeniAcik(false);
      setBaslik('');
      setIlkMesaj('');
      qc.invalidateQueries({ queryKey: ['destek', 'benim'] });
      const id = r?.data?.veri?.id;
      if (id) setSeciliId(id);
    },
    onError: (e: any) => toast.hata(e?.response?.data?.mesaj || 'Talep oluşturulamadı'),
  });

  const mesajMut = useMutation({
    mutationFn: () => api.post(`/destek/benim/${seciliId}/mesaj`, { mesaj }),
    onSuccess: () => {
      setMesaj('');
      qc.invalidateQueries({ queryKey: ['destek', 'detay', seciliId] });
      qc.invalidateQueries({ queryKey: ['destek', 'benim'] });
    },
    onError: (e: any) => toast.hata(e?.response?.data?.mesaj || 'Mesaj gönderilemedi'),
  });

  const secili = useMemo(() => talepler.find((t) => t.id === seciliId) || null, [talepler, seciliId]);

  return (
    <div className="space-y-6 pb-12">
      <section className="card !p-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900">Destek</h1>
          <p className="text-sm text-gray-500 mt-1">Sorun bildir, soru sor; ekip yanıtlasın.</p>
        </div>
        <button
          onClick={() => setYeniAcik(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Yeni Talep
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wider">Taleplerim</p>
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
            </div>
          ) : talepler.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Henüz talep yok.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {talepler.map((t) => {
                const r = durumRozet(t.durum);
                const Ikon = r.i;
                const aktif = t.id === seciliId;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setSeciliId(t.id)}
                    className={`w-full text-left px-5 py-4 hover:bg-indigo-50/40 transition ${aktif ? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{t.baslik}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Son mesaj: {new Date(t.sonMesajAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black border ${r.c}`}>
                        <Ikon className="w-3.5 h-3.5" /> {r.t}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-gray-600 uppercase tracking-wider">Görüşme</p>
              <p className="text-sm font-black text-gray-900 truncate">{secili?.baslik || 'Talep seçin'}</p>
            </div>
          </div>

          {!seciliId ? (
            <div className="p-8 text-sm text-gray-500">Soldan bir talep seçin veya “Yeni Talep” oluşturun.</div>
          ) : detayYukleniyor ? (
            <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Mesajlar yükleniyor…
            </div>
          ) : (
            <div className="flex flex-col h-[520px]">
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
                {(detay?.mesajlar || []).map((m) => {
                  const benim = m.gonderenRol === 'OGRENCI';
                  return (
                    <div key={m.id} className={`flex ${benim ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${benim ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-900 border border-gray-100'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.mesaj}</p>
                        <p className={`mt-1 text-[10px] font-black opacity-70 ${benim ? 'text-white' : 'text-gray-500'}`}>
                          {new Date(m.olusturuldu).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    value={mesaj}
                    onChange={(e) => setMesaj(e.target.value)}
                    placeholder="Mesaj yaz…"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => mesajMut.mutate()}
                    disabled={!mesaj.trim() || mesajMut.isPending}
                    className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-black inline-flex items-center gap-2"
                  >
                    {mesajMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {yeniAcik && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900">Yeni Destek Talebi</h3>
              <button onClick={() => setYeniAcik(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="text-xs font-black text-gray-600">Başlık</span>
                <input value={baslik} onChange={(e) => setBaslik(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm" placeholder="Örn. Sınav sonucum görünmüyor" />
              </label>
              <label className="block">
                <span className="text-xs font-black text-gray-600">Mesaj</span>
                <textarea value={ilkMesaj} onChange={(e) => setIlkMesaj(e.target.value)} rows={5} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm" placeholder="Detayları yaz…" />
              </label>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setYeniAcik(false)} className="px-4 py-2 text-sm font-black text-gray-600 hover:bg-gray-100 rounded-lg">Vazgeç</button>
              <button
                onClick={() => yeniMut.mutate()}
                disabled={yeniMut.isPending || baslik.trim().length < 3 || ilkMesaj.trim().length < 2}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-black text-white"
              >
                {yeniMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

