import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { LandingAnaSayfa } from '@/components/landing/LandingAnaSayfa';
import { LandingAnaSayfaKpss } from '@/components/landing/LandingAnaSayfaKpss';
import { SeoAnaSayfaEk } from '@/components/seo/SeoAnaSayfaEk';
import { anaSayfaMetadata, anaSayfaMetadataKpss } from '@/lib/seo';
import { siteIcerikGetirSSR } from '@/lib/site-icerik-server';

// Sunucu tarafında platformun KPSS olup olmadığını algılayan yardımcı fonksiyon
async function checkIsKpss(): Promise<boolean> {
  const envMode = process.env.NEXT_PUBLIC_APP_MODE;
  if (envMode === 'kpss') return true;

  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    if (host.includes('kpss')) {
      return true;
    }
  } catch (e) {
    // Statik üretim (build time) esnasında headers() hata verirse fallback
  }
  return false;
}

export async function generateMetadata(): Promise<Metadata> {
  const isKpss = await checkIsKpss();
  return isKpss ? anaSayfaMetadataKpss() : anaSayfaMetadata();
}

export default async function Home() {
  const [isKpss, siteIcerik] = await Promise.all([checkIsKpss(), siteIcerikGetirSSR()]);

  if (isKpss) {
    return (
      <>
        <LandingAnaSayfaKpss initialIcerik={siteIcerik} />
      </>
    );
  }

  return (
    <>
      <LandingAnaSayfa initialIcerik={siteIcerik} />
      <SeoAnaSayfaEk />
    </>
  );
}

