'use client';

import Link from 'next/link';
import { useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  BookOpen, TrendingUp, Trophy, GraduationCap, ClipboardList,
  UserCircle, Sparkles, LineChart as LineChartIcon, UserPlus, Loader2, ArrowRight, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { veliApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { veliOgrenciYolu } from '@/contexts/VeliOgrenciContext';
import {
  VeliSayfa, VeliHero, VeliStatKart, VeliPanel, VeliPanelBaslik,
  VeliButon, VeliInput, VeliYukleniyor, VeliBosDurum, VeliTablo, VeliTabloBaslik, VeliBadge,
} from '@/components/veli/VeliUI';

function axiosApiMesaj(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data && typeof (error.response.data as { mesaj?: string }).mesaj === 'string') {
    return (error.response.data as { mesaj: string }).mesaj;
  }
  return (error as Error)?.message || 'Bir hata oluştu.';
}

interface VeliOzetVerisi {
  veli: { ad: string; soyad: string };
  ogrenciSayisi: number;
  ogrenciler: Array<{
    id: string;
    ad: string;
    soyad: string;
    sinif: string | null;
    okul: string | null;
    ogretimTuru: string;
    ozet: { tamamlananDeneme: number; ortalamaNet: number; enIyiSiralama: number | null };
    sonDenemeler: Array<{
      katilimId: string; sinavBaslik: string; sinavTur: string;
      net: number; siralama: number | null; tarih: string;
    }>;
    aktifCalismaPlani: {
      id: string; baslik: string; gorevSayisi: number; bekleyenGorev: number; bitis: string;
      onumdekiGorevler: Array<{ baslik: string; ders: string; gun: number }>;
    } | null;
  }>;
}

export default function VeliDashboardPage() {
  const queryClient = useQueryClient();
  const [baglaEmail, setBaglaEmail] = useState('');
  const { kullanici } = useAuthStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['veli-ozet'],
    queryFn: async () => (await veliApi.ozet()).data.veri as VeliOzetVerisi,
  });

  const baglaMutation = useMutation({
    mutationFn: (email: string) => veliApi.ogrenciBagla(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veli-ozet'] });
      setBaglaEmail('');
    },
  });

  if (isLoading) return <VeliYukleniyor mesaj="Öğrenci özetleri yükleniyor…" />;

  if (isError) {
    const msg = axiosApiMesaj(error);
    return (
      <VeliSayfa>
        <VeliPanel className="border-red-100 bg-red-50/50 text-red-800">
          <p className="font-semibold">{msg}</p>
        </VeliPanel>
      </VeliSayfa>
    );
  }

  const veri = data!;
  const hitapAd = [kullanici?.ad || veri.veli.ad, kullanici?.soyad || veri.veli.soyad].filter(Boolean).join(' ') || 'Veli';
  const toplamDeneme = veri.ogrenciler.reduce((s, o) => s + o.ozet.tamamlananDeneme, 0);
  const ogrencilerDenemeli = veri.ogrenciler.filter((o) => o.ozet.tamamlananDeneme > 0);
  const ortNet =
    ogrencilerDenemeli.length > 0
      ? (ogrencilerDenemeli.reduce((s, o) => s + o.ozet.ortalamaNet, 0) / ogrencilerDenemeli.length).toFixed(1)
      : '—';

  return (
    <VeliSayfa className="space-y-6">
      <VeliHero
        baslik={`Merhaba, ${hitapAd}`}
        aciklama="Öğrencinizin deneme performansı, net trendi ve çalışma planını tek ekrandan takip edin."
        rozet="Veli paneli"
      />

      {veri.ogrenciSayisi > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <VeliStatKart ikon={Users} etiket="Bağlı öğrenci" deger={veri.ogrenciSayisi} ton="violet" />
          <VeliStatKart ikon={BookOpen} etiket="Toplam deneme" deger={toplamDeneme} ton="emerald" />
          <VeliStatKart ikon={TrendingUp} etiket="Ort. net" deger={ortNet} ton="sky" />
        </div>
      )}

      <VeliPanel id="ogrenci-bagla">
        <VeliPanelBaslik
          ikon={UserPlus}
          baslik="Öğrenci bağla"
          aciklama="Öğrencinin kayıtlı e-posta adresini girerek hesabınıza bağlayın."
        />
        <form
          className="flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            baglaMutation.mutate(baglaEmail.trim());
          }}
        >
          <div className="flex-1">
            <label htmlFor="veli-ogrenci-email" className="sr-only">Öğrenci e-postası</label>
            <VeliInput
              id="veli-ogrenci-email"
              type="email"
              autoComplete="email"
              placeholder="ogrenci@ornek.com"
              value={baglaEmail}
              onChange={(e) => setBaglaEmail(e.target.value)}
              disabled={baglaMutation.isPending}
            />
          </div>
          <VeliButon type="submit" disabled={baglaMutation.isPending || !baglaEmail.trim()}>
            {baglaMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Bağlanıyor…</>
            ) : (
              'Öğrenciyi bağla'
            )}
          </VeliButon>
        </form>
        {baglaMutation.isError && (
          <p className="mt-3 text-sm text-red-600 font-medium">{axiosApiMesaj(baglaMutation.error)}</p>
        )}
        {baglaMutation.isSuccess && baglaMutation.data?.data?.veri && (
          <p className="mt-3 text-sm text-emerald-700 font-medium">
            {baglaMutation.data.data.veri.zatenBagli
              ? `${baglaMutation.data.data.veri.ogrenci.ad} ${baglaMutation.data.data.veri.ogrenci.soyad} zaten bağlı.`
              : `${baglaMutation.data.data.veri.ogrenci.ad} ${baglaMutation.data.data.veri.ogrenci.soyad} bağlandı.`}
          </p>
        )}
      </VeliPanel>

      {veri.ogrenciSayisi === 0 ? (
        <VeliBosDurum
          ikon={UserCircle}
          baslik="Henüz bağlı öğrenci yok"
          aciklama="Yukarıdaki formdan öğrenci e-postasını girerek başlayın. Kayıtta veli bilginiz varsa eşleşme otomatik oluşabilir."
        />
      ) : (
        <div className="space-y-6">
          {veri.ogrenciler.map((o) => (
            <OgrenciKarti key={o.id} ogrenci={o} />
          ))}
        </div>
      )}
    </VeliSayfa>
  );
}

function OgrenciKarti({ ogrenci }: { ogrenci: VeliOzetVerisi['ogrenciler'][0] }) {
  const grafikVerisi = [...ogrenci.sonDenemeler]
    .reverse()
    .map((d, i) => ({
      etiket: format(new Date(d.tarih), 'd MMM', { locale: tr }),
      net: d.net,
      key: i,
    }));

  return (
    <VeliPanel padding={false} className="overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-violet-50/80 via-white to-fuchsia-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {ogrenci.ad} {ogrenci.soyad}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {[ogrenci.sinif && `${ogrenci.sinif}. sınıf`, ogrenci.okul, ogrenci.ogretimTuru].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <VeliButon href={veliOgrenciYolu(ogrenci.id)}>
            Öğrenci paneline git <ArrowRight className="w-4 h-4" />
          </VeliButon>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <VeliStatKart ikon={BookOpen} etiket="Deneme" deger={ogrenci.ozet.tamamlananDeneme} ton="slate" />
          <VeliStatKart
            ikon={TrendingUp}
            etiket="Ort. net"
            deger={ogrenci.ozet.tamamlananDeneme > 0 ? ogrenci.ozet.ortalamaNet.toFixed(1) : '—'}
            ton="emerald"
          />
          <VeliStatKart
            ikon={Trophy}
            etiket="En iyi sıra"
            deger={ogrenci.ozet.enIyiSiralama != null ? `#${ogrenci.ozet.enIyiSiralama.toLocaleString('tr-TR')}` : '—'}
            ton="amber"
          />
        </div>

        {grafikVerisi.length >= 2 && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <LineChartIcon className="w-4 h-4 text-violet-600" /> Net trendi
            </h3>
            <div className="h-52 rounded-xl bg-gray-50/80 border border-gray-100 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={grafikVerisi}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="etiket" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Line type="monotone" dataKey="net" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Son denemeler</h3>
          {ogrenci.sonDenemeler.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center rounded-xl bg-gray-50">Henüz tamamlanan deneme yok.</p>
          ) : (
            <VeliTablo>
              <VeliTabloBaslik>
                <th className="px-4 py-3">Sınav</th>
                <th className="px-4 py-3">Tür</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Sıralama</th>
                <th className="px-4 py-3">Tarih</th>
              </VeliTabloBaslik>
              <tbody className="divide-y divide-gray-50">
                {ogrenci.sonDenemeler.map((d) => (
                  <tr key={d.katilimId} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={veliOgrenciYolu(ogrenci.id, `/sonuc/${d.katilimId}`)} className="hover:text-violet-700 transition-colors">
                        {d.sinavBaslik}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><VeliBadge ton="gray">{d.sinavTur}</VeliBadge></td>
                    <td className="px-4 py-3 font-bold text-violet-700">{d.net}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.siralama != null ? `#${d.siralama.toLocaleString('tr-TR')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {format(new Date(d.tarih), 'd MMM yyyy', { locale: tr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </VeliTablo>
          )}
        </div>

        {ogrenci.aktifCalismaPlani && (
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-fuchsia-50/30 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <h3 className="font-bold text-violet-950">Çalışma planı</h3>
            </div>
            <p className="text-sm font-semibold text-violet-900">{ogrenci.aktifCalismaPlani.baslik}</p>
            <p className="text-xs text-violet-700/90 mt-1">
              {ogrenci.aktifCalismaPlani.bekleyenGorev} / {ogrenci.aktifCalismaPlani.gorevSayisi} görev · Bitiş{' '}
              {format(new Date(ogrenci.aktifCalismaPlani.bitis), 'd MMM yyyy', { locale: tr })}
            </p>
            {ogrenci.aktifCalismaPlani.onumdekiGorevler.length > 0 && (
              <ul className="mt-3 space-y-2">
                {ogrenci.aktifCalismaPlani.onumdekiGorevler.map((g, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-violet-900">
                    <ClipboardList className="w-4 h-4 text-violet-500 shrink-0" />
                    {g.ders} — {g.baslik} <span className="text-violet-600 text-xs">(Gün {g.gun})</span>
                  </li>
                ))}
              </ul>
            )}
            <VeliButon href={veliOgrenciYolu(ogrenci.id, '/study-plan')} variant="ghost" className="mt-3 !px-0">
              Tüm planı gör →
            </VeliButon>
          </div>
        )}
      </div>
    </VeliPanel>
  );
}
