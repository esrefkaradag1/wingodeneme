'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { Loader2, MessageCircle, Search, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';

type Talep = {
  id: string;
  baslik: string;
  durum: 'ACIK' | 'BEKLEMEDE' | 'COZULDU' | 'KAPANDI';
  oncelik: number;
  sonMesajAt: string;
  olusturuldu: string;
  ogrenci: { id: string; ad: string; soyad: string; kullanici: { email: string } };
};

type Mesaj = {
  id: string;
  gonderenRol: string;
  mesaj: string;
  olusturuldu: string;
};

function durumRozet(d: Talep['durum']) {
  if (d === 'ACIK') return { t: 'Açık', c: 'bg-emerald-50 text-emerald-700 border-emerald-100', i: Clock };
  if (d === 'BEKLEMEDE') return { t: 'Beklemede', c: 'bg-indigo-50 text-indigo-700 border-indigo-100', i: MessageCircle };
  if (d === 'COZULDU') return { t: 'Çözüldü', c: 'bg-emerald-50 text-emerald-700 border-emerald-100', i: CheckCircle2 };
  return { t: 'Kapandı', c: 'bg-gray-50 text-gray-600 border-gray-100', i: XCircle };
}

export default function AdminDestekSayfasi() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [durum, setDurum] = useState<string>('');
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['destek', 'admin', q, durum],
    queryFn: () => api.get('/destek/admin', { params: { q: q.trim() || undefined, durum: durum || undefined } }),
  });
  const talepler: Talep[] = data?.data?.veri || [];

  const { data: detayData, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['destek', 'detay-admin', seciliId],
    queryFn: () => api.get(`/destek/benim/${seciliId}`), // aynı detay endpoint'i admin için de açılıyor (service izinli)
    enabled: !!seciliId,
  });
  const detay = detayData?.data?.veri as any;

  const mesajMut = useMutation({
    mutationFn: () => api.post(`/destek/admin/${seciliId}/mesaj`, { mesaj }),
    onSuccess: () => {
      setMesaj('');
      qc.invalidateQueries({ queryKey: ['destek', 'detay-admin', seciliId] });
      qc.invalidateQueries({ queryKey: ['destek', 'admin'] });
    },
    onError: (e: any) => toast.hata(e?.response?.data?.mesaj || 'Mesaj gönderilemedi'),
  });

  const durumMut = useMutation({
    mutationFn: (d: string) => api.patch(`/destek/admin/${seciliId}/durum`, { durum: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['destek', 'admin'] });
      qc.invalidateQueries({ queryKey: ['destek', 'detay-admin', seciliId] });
    },
  });

  const secili = useMemo(() => talepler.find((t) => t.id === seciliId) || null, [talepler, seciliId]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Destek Talepleri</h1>
          <p className="text-sm text-gray-500 mt-1">Öğrencilerin destek mesajlarını buradan yönetin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlık / öğrenci / e-posta ara…" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm" />
            </div>
            <select value={durum} onChange={(e) => setDurum(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white">
              <option value="">Tümü</option>
              <option value="ACIK">Açık</option>
              <option value="BEKLEMEDE">Beklemede</option>
              <option value="COZULDU">Çözüldü</option>
              <option value="KAPANDI">Kapandı</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…</div>
          ) : talepler.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Talep yok.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {talepler.map((t) => {
                const r = durumRozet(t.durum);
                const Ikon = r.i;
                const aktif = t.id === seciliId;
                return (
                  <button key={t.id} onClick={() => setSeciliId(t.id)} className={`w-full text-left px-4 py-4 hover:bg-indigo-50/40 ${aktif ? 'bg-indigo-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{t.baslik}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{t.ogrenci.ad} {t.ogrenci.soyad} · {t.ogrenci.kullanici.email}</p>
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
            {seciliId && (
              <div className="flex items-center gap-2">
                <button onClick={() => durumMut.mutate('COZULDU')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700">Çözüldü</button>
                <button onClick={() => durumMut.mutate('KAPANDI')} className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black">Kapat</button>
              </div>
            )}
          </div>

          {!seciliId ? (
            <div className="p-8 text-sm text-gray-500">Soldan bir talep seçin.</div>
          ) : detayYukleniyor ? (
            <div className="p-8 text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…</div>
          ) : (
            <div className="flex flex-col h-[560px]">
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
                {(detay?.mesajlar || []).map((m: Mesaj) => {
                  const benim = m.gonderenRol !== 'OGRENCI';
                  return (
                    <div key={m.id} className={`flex ${benim ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${benim ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900 border border-gray-100'}`}>
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
                  <input value={mesaj} onChange={(e) => setMesaj(e.target.value)} placeholder="Yanıt yaz…" className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 text-sm" />
                  <button onClick={() => mesajMut.mutate()} disabled={!mesaj.trim() || mesajMut.isPending} className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-sm font-black inline-flex items-center gap-2">
                    {mesajMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

