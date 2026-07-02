import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/SeoLandingPage';
import { SEO_LANDING, landingMetadata } from '@/lib/seo';

type Slug = keyof typeof SEO_LANDING;

type Props = {
  params: Promise<{ slug: string }>;
};

function slugGecerli(slug: string): slug is Slug {
  return slug in SEO_LANDING;
}

export function generateStaticParams() {
  return Object.keys(SEO_LANDING).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slugGecerli(slug)) return {};
  return landingMetadata(slug);
}

export default async function SeoLandingRoute({ params }: Props) {
  const { slug } = await params;
  if (!slugGecerli(slug)) notFound();
  return <SeoLandingPage pageKey={slug} />;
}
