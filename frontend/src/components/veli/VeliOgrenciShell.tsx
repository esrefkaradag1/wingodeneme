'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useVeliOgrenci, veliOgrenciYolu } from '@/contexts/VeliOgrenciContext';
import { AlertCircle } from 'lucide-react';
import { VeliHero, VeliOgrenciBaslikBand, VeliPanel, VeliButon, VeliYukleniyor } from '@/components/veli/VeliUI';

export function VeliOgrenciKoruyucu({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string | undefined;
  const { ogrenciler, yukleniyor } = useVeliOgrenci();

  if (yukleniyor) {
    return <VeliYukleniyor mesaj="Öğrenci bilgileri yükleniyor…" />;
  }

  if (!ogrenciId || !ogrenciler.some((o) => o.id === ogrenciId)) {
    return (
      <VeliPanel className="max-w-lg border-amber-100 bg-gradient-to-br from-amber-50/50 to-white">
        <div className="flex gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Öğrenci bulunamadı</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Bu öğrenciye erişiminiz yok veya henüz bağlı değil.
            </p>
            <VeliButon href="/veli/dashboard" variant="ghost" className="mt-4 !px-0">
              Genel bakışa dön
            </VeliButon>
          </div>
        </div>
      </VeliPanel>
    );
  }

  return <>{children}</>;
}

export function VeliOgrenciBaslik({ altBaslik }: { altBaslik?: string }) {
  const { seciliOgrenci } = useVeliOgrenci();

  if (!seciliOgrenci || !altBaslik) return null;

  const meta = [
    seciliOgrenci.sinif && `${seciliOgrenci.sinif}. sınıf`,
    seciliOgrenci.okul,
    seciliOgrenci.ogretimTuru,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <VeliOgrenciBaslikBand
      ogrenciAd={`${seciliOgrenci.ad} ${seciliOgrenci.soyad}`}
      altBaslik={altBaslik}
      meta={meta || undefined}
    />
  );
}

export { veliOgrenciYolu };
