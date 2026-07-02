'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  BookOpen, Trophy, Target, TrendingUp, ArrowRight,
  BarChart3, Map, Bell, Calendar,
} from 'lucide-react';
import { veliApi } from '@/lib/api';
import { VeliOgrenciBaslik, veliOgrenciYolu } from '@/components/veli/VeliOgrenciShell';
import {
  VeliSayfa, VeliStatKart, VeliPanel, VeliHizliLink, VeliTablo, VeliTabloBaslik,
  VeliBadge, VeliButon, VeliYukleniyor,
} from '@/components/veli/VeliUI';

export default function VeliOgrenciOzetPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;

  const { data: ozetData, isLoading: ozetYukleniyor } = useQuery({
    queryKey: ['veli-ozet'],
    queryFn: async () => (await veliApi.ozet()).data.veri,
  });

  const { data: analizData } = useQuery({
    queryKey: ['veli-ogrenci-analiz', ogrenciId],
    queryFn: async () => (await veliApi.ogrenciAnaliz(ogrenciId)).data.veri,
    enabled: !!ogrenciId,
  });

  const ogrenci = ozetData?.ogrenciler?.find((o: { id: string }) => o.id === ogrenciId);
  const analiz = analizData?.analiz;

  if (ozetYukleniyor || !ogrenci) return <VeliYukleniyor />;

  const hizliLinkler = [
    { href: veliOgrenciYolu(ogrenciId, '/sinavlar'), etiket: 'Sınavlar', ikon: BookOpen, renk: 'sky' as const },
    { href: veliOgrenciYolu(ogrenciId, '/analiz'), etiket: 'Analiz', ikon: BarChart3, renk: 'emerald' as const },
    { href: veliOgrenciYolu(ogrenciId, '/study-plan'), etiket: 'Çalışma Planı', ikon: Map, renk: 'green' as const },
    { href: veliOgrenciYolu(ogrenciId, '/takvim'), etiket: 'Takvim', ikon: Calendar, renk: 'rose' as const },
    { href: veliOgrenciYolu(ogrenciId, '/duyurular'), etiket: 'Duyurular', ikon: Bell, renk: 'amber' as const },
  ];

  return (
    <VeliSayfa>
      <VeliOgrenciBaslik altBaslik="Öğrenci özeti" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <VeliStatKart ikon={BookOpen} etiket="Toplam sınav" deger={analiz?.toplamSinav ?? ogrenci.ozet.tamamlananDeneme} ton="violet" />
        <VeliStatKart ikon={Trophy} etiket="En iyi sıra" deger={ogrenci.ozet.enIyiSiralama ? `#${ogrenci.ozet.enIyiSiralama.toLocaleString('tr-TR')}` : '—'} ton="amber" />
        <VeliStatKart ikon={Target} etiket="Ort. net" deger={(analiz?.ortalamaNe ?? ogrenci.ozet.ortalamaNet)?.toFixed?.(1) ?? String(ogrenci.ozet.ortalamaNet)} ton="emerald" />
        <VeliStatKart ikon={TrendingUp} etiket="Zayıf konu" deger={analiz?.zayifKonular?.length ?? '—'} ton="rose" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {hizliLinkler.map((l) => (
          <VeliHizliLink key={l.href} {...l} />
        ))}
      </div>

      <VeliPanel>
        <h2 className="text-sm font-bold text-gray-900 mb-4">Son denemeler</h2>
        {ogrenci.sonDenemeler.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center rounded-xl bg-gray-50">Henüz deneme yok.</p>
        ) : (
          <VeliTablo>
            <VeliTabloBaslik>
              <th className="px-4 py-3">Sınav</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Sıralama</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3" />
            </VeliTabloBaslik>
            <tbody className="divide-y divide-gray-50">
              {ogrenci.sonDenemeler.map((d: { katilimId: string; sinavBaslik: string; net: number; siralama: number | null; tarih: string }) => (
                <tr key={d.katilimId} className="hover:bg-violet-50/30">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.sinavBaslik}</td>
                  <td className="px-4 py-3 font-bold text-violet-700">{d.net}</td>
                  <td className="px-4 py-3 text-gray-600">{d.siralama != null ? `#${d.siralama.toLocaleString('tr-TR')}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(d.tarih), 'd MMM yyyy', { locale: tr })}</td>
                  <td className="px-4 py-3 text-right">
                    <VeliButon href={veliOgrenciYolu(ogrenciId, `/sonuc/${d.katilimId}`)} variant="ghost" className="!py-1.5 !px-2 text-xs">
                      Detay <ArrowRight className="w-3.5 h-3.5" />
                    </VeliButon>
                  </td>
                </tr>
              ))}
            </tbody>
          </VeliTablo>
        )}
      </VeliPanel>

      {ogrenci.aktifCalismaPlani && (
        <VeliPanel className="border-violet-100 bg-gradient-to-br from-violet-50/40 to-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <VeliBadge ton="violet">Aktif plan</VeliBadge>
              <p className="font-bold text-gray-900 mt-2">{ogrenci.aktifCalismaPlani.baslik}</p>
              <p className="text-sm text-gray-600 mt-1">
                {ogrenci.aktifCalismaPlani.bekleyenGorev} / {ogrenci.aktifCalismaPlani.gorevSayisi} görev bekliyor
              </p>
            </div>
            <VeliButon href={veliOgrenciYolu(ogrenciId, '/study-plan')} variant="outline">
              Planı gör
            </VeliButon>
          </div>
        </VeliPanel>
      )}
    </VeliSayfa>
  );
}
