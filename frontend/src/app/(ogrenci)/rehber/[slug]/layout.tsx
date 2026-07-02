import type { Metadata } from 'next';
import { rehberSlugMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return rehberSlugMetadata(slug);
}

export default function RehberSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
