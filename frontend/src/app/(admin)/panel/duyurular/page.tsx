'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, adminApi } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { Loader2, Send, Users, Shield, Globe, Search, Eye } from 'lucide-react';

type Rol = 'OGRENCI' | 'VELI' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN';

type Kullanici = {
  id: string;
  email: string;
  rol: Rol;
  ogrenciProfil?: { ad: string; soyad: string } | null;
  veliProfil?: { ad: string; soyad: string } | null;
  adminProfil?: { ad: string; soyad: string } | null;
};

export default function DuyurularAdminSayfasi() {
  const [baslik, setBaslik] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [hedef, setHedef] = useState<'TUMU' | 'ROL' | 'KULLANICI'>('TUMU');
  const [roller, setRoller] = useState<Rol[]>(['OGRENCI']);
  const [q, setQ] = useState('');
  const [seciliIds, setSeciliIds] = useState<string[]>([]);

  const { data: kullanicilarData, isLoading: kullaniciYukleniyor, isPlaceholderData: kullaniciPlaceholder } = useQuery({
    queryKey: ['admin-kullanicilar-duyuru', q],
    queryFn: async () => {
      const r = await adminApi.kullanicilar({ sayfa: 1, boyut: 50, q: q.trim() || undefined });
      return r.data.veri as Kullanici[];
    },
    enabled: hedef === 'KULLANICI',
    placeholderData: (prev) => prev,
  });
  const kullanicilar = (kullanicilarData || []) as Kullanici[];

  const filtreli = useMemo(() => {
    if (!q.trim()) return kullanicilar;
    const s = q.trim().toLowerCase();
    return kullanicilar.filter((u) => (u.email || '').toLowerCase().includes(s));
  }, [kullanicilar, q]);

  const gonderMut = useMutation({
    mutationFn: () =>
      api.post('/duyurular', {
        baslik,
        mesaj,
        hedefTuru: hedef,
        hedefRoller: hedef === 'ROL' ? roller : undefined,
        kullaniciIds: hedef === 'KULLANICI' ? seciliIds : undefined,
      }),
    onSuccess: (r) => {
      const sayi = r?.data?.veri?.aliciSayisi;
      toast.basarili('Duyuru gönderildi.', sayi ? `${sayi} kişiye iletildi.` : undefined);
      setBaslik('');
      setMesaj('');
      setSeciliIds([]);
    },
    onError: (e: any) => toast.hata(e?.response?.data?.mesaj || 'Duyuru gönderilemedi'),
  });

  const { data: sonData, isLoading: sonYukleniyor, isPlaceholderData: sonPlaceholder, refetch: sonYenile } = useQuery({
    queryKey: ['duyuru-admin-liste'],
    queryFn: () => api.get('/duyurular/admin'),
    placeholderData: (prev) => prev,
  });
  const sonDuyurular: any[] = sonData?.data?.veri || [];

  const [okuyanModal, setOkuyanModal] = useState<{ id: string; baslik: string } | null>(null);
  const { data: aliciData, isLoading: aliciYukleniyor, isPlaceholderData: aliciPlaceholder } = useQuery({
    queryKey: ['duyuru-alicilar', okuyanModal?.id],
    queryFn: () => api.get(`/duyurular/${okuyanModal!.id}/alicilar`),
    enabled: !!okuyanModal?.id,
    placeholderData: (prev) => prev,
  });
  const alicilar: any[] = aliciData?.data?.veri || [];

  const rolSec = (rol: Rol) => {
    setRoller((prev) => (prev.includes(rol) ? prev.filter((x) => x !== rol) : [...prev, rol]));
  };

  const kisiToggle = (id: string) => {
    setSeciliIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Duyuru Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Tüm sisteme, role veya seçili kullanıcılara duyuru gönder.</p>
        </div>
      </div>

      <div className="card !p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-black text-gray-600">Başlık</span>
            <input value={baslik} onChange={(e) => setBaslik(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-gray-600">Hedef</span>
            <select value={hedef} onChange={(e) => { setHedef(e.target.value as any); setSeciliIds([]); }} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white">
              <option value="TUMU">Tüm sistem</option>
              <option value="ROL">Role göre</option>
              <option value="KULLANICI">Seçili kullanıcılar</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-black text-gray-600">Mesaj</span>
          <textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} rows={5} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm" />
        </label>

        {hedef === 'ROL' && (
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-black text-gray-600 mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-600" /> Roller</p>
            <div className="flex flex-wrap gap-2">
              {(['OGRENCI','VELI','TEACHER','ADMIN','SUPER_ADMIN'] as Rol[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => rolSec(r)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border transition ${roller.includes(r) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {hedef === 'KULLANICI' && (
          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="E-posta ara…" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm" />
            </div>
            {(kullaniciYukleniyor && !kullaniciPlaceholder) ? (
              <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Kullanıcılar yükleniyor…</div>
            ) : (
              <div className={`max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl transition-opacity ${kullaniciYukleniyor ? 'opacity-50' : 'opacity-100'}`}>
                {filtreli.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={seciliIds.includes(u.id)} onChange={() => kisiToggle(u.id)} />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{u.email}</p>
                      <p className="text-[11px] text-gray-500">{u.rol}</p>
                    </div>
                  </label>
                ))}
                {filtreli.length === 0 && <div className="p-3 text-sm text-gray-500">Kullanıcı bulunamadı.</div>}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => gonderMut.mutate()}
            disabled={gonderMut.isPending || baslik.trim().length < 3 || mesaj.trim().length < 2 || (hedef === 'ROL' && roller.length === 0) || (hedef === 'KULLANICI' && seciliIds.length === 0)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-black inline-flex items-center gap-2"
          >
            {gonderMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Duyuru Gönder
          </button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs font-black text-gray-600 uppercase tracking-wider">Son duyurular</p>
          <button onClick={() => sonYenile()} className="text-xs font-black text-indigo-600 hover:text-indigo-700">Yenile</button>
        </div>
        {(sonYukleniyor && !sonPlaceholder) ? (
          <div className="p-6 text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…</div>
        ) : sonDuyurular.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Henüz duyuru yok.</div>
        ) : (
          <div className={`divide-y divide-gray-100 transition-opacity ${sonYukleniyor ? 'opacity-50' : 'opacity-100'}`}>
            {sonDuyurular.map((d) => (
              <div key={d.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{d.baslik}</p>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{d.mesaj}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Okundu: <b className="text-emerald-700">{d.okundu}</b> · Okunmadı: <b className="text-amber-700">{d.okunmadi}</b> · Toplam: <b>{d.aliciToplam}</b>
                  </p>
                </div>
                <button
                  onClick={() => setOkuyanModal({ id: d.id, baslik: d.baslik })}
                  className="shrink-0 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-black text-gray-800 inline-flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Okuyanlar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card !p-5 flex items-center gap-2 text-xs text-gray-500">
        <Globe className="w-4 h-4 text-gray-400" />
        Duyuru gönderimi ayrıca kullanıcılara <b>bildirim</b> olarak da düşer.
      </div>

      {okuyanModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Okuyanlar</p>
                <p className="text-sm font-black text-gray-900 truncate">{okuyanModal.baslik}</p>
              </div>
              <button onClick={() => setOkuyanModal(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-5">
              {(aliciYukleniyor && !aliciPlaceholder) ? (
                <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…</div>
              ) : (
                <div className={`max-h-[420px] overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl transition-opacity ${aliciYukleniyor ? 'opacity-50' : 'opacity-100'}`}>
                  {alicilar.map((a) => {
                    const u = a.kullanici;
                    const adSoyad = u?.ogrenciProfil ? `${u.ogrenciProfil.ad} ${u.ogrenciProfil.soyad}` : u?.veliProfil ? `${u.veliProfil.ad} ${u.veliProfil.soyad}` : u?.adminProfil ? `${u.adminProfil.ad} ${u.adminProfil.soyad}` : '';
                    return (
                      <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{u?.email}</p>
                          <p className="text-[11px] text-gray-500 truncate">{adSoyad} {adSoyad ? '·' : ''} {u?.rol}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-black ${a.okundu ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {a.okundu ? 'Okundu' : 'Okunmadı'}
                          </p>
                          {a.okunduAt && <p className="text-[10px] text-gray-400">{new Date(a.okunduAt).toLocaleString('tr-TR')}</p>}
                        </div>
                      </div>
                    );
                  })}
                  {alicilar.length === 0 && <div className="p-4 text-sm text-gray-500">Kayıt yok.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

