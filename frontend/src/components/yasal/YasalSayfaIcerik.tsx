'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  FileText,
  Home,
  Mail,
  Scale,
  ScrollText,
  Shield,
  Truck,
  Users,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { VARSAYILAN_SITE_ICERIK } from '@/lib/site-icerik-defaults';
import {
  YASAL_SAYFA_ETIKET,
  YASAL_SAYFA_SLUGS,
  slugGecerli,
  slugdanAnahtar,
  type YasalSayfaAnahtar,
  type YasalSayfaSlug,
} from '@/lib/yasal-sayfalar';
import { yasalIcerikHtmlDuzenle } from '@/lib/yasal-icerik-html';

const SAYFA_IKON: Record<YasalSayfaAnahtar, typeof FileText> = {
  hakkimizda: Users,
  gizlilik: Shield,
  mesafeliSatis: Scale,
  teslimatIade: Truck,
};

function yasalNavOgesi(
  slug: YasalSayfaSlug,
  yasal: (typeof VARSAYILAN_SITE_ICERIK)['yasalSayfalar']
) {
  const anahtar = slugdanAnahtar(slug);
  const sayfa = yasal[anahtar];
  if (sayfa?.yayinda === false) return null;
  return {
    slug,
    anahtar,
    href: `/${slug}`,
    label: sayfa?.baslik?.trim() || YASAL_SAYFA_ETIKET[anahtar],
  };
}

const ICERIK_STILI =
  'yasal-icerik text-[15px] leading-[1.75] text-slate-600 ' +
  '[&_p]:mb-4 [&_p:last-child]:mb-0 ' +
  '[&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2:first-child]:mt-0 ' +
  '[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-2 ' +
  '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 ' +
  '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 ' +
  '[&_li]:text-slate-600 [&_strong]:font-bold [&_strong]:text-slate-800 ' +
  '[&_a]:text-indigo-600 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-700';

export function YasalSayfaIcerik({ slug }: { slug: YasalSayfaSlug }) {
  if (!slugGecerli(slug)) notFound();

  const site = useSiteIcerik();
  const anahtar = slugdanAnahtar(slug);
  const yasal = site.yasalSayfalar ?? VARSAYILAN_SITE_ICERIK.yasalSayfalar;
  const sayfa = yasal[anahtar];
  const eposta = site.footer.eposta?.trim() || 'destek@wingodeneme.com';

  const navOgeleri = (Object.keys(YASAL_SAYFA_SLUGS) as YasalSayfaSlug[])
    .map((s) => yasalNavOgesi(s, yasal))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const AktifIkon = SAYFA_IKON[anahtar] ?? ScrollText;
  const duzenlenmisHtml = useMemo(
    () => yasalIcerikHtmlDuzenle(sayfa?.icerikHtml || ''),
    [sayfa?.icerikHtml],
  );

  return (
    <MarketingShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14 w-full">
        {/* Breadcrumb */}
        <nav
          className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 mb-8"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-[#2ABBA7] transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Ana sayfa
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          <span className="text-slate-400">Sözleşmeler</span>
          {sayfa?.yayinda !== false && (
            <>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <span className="text-slate-300">{sayfa.baslik}</span>
            </>
          )}
        </nav>

        <div className="lg:grid lg:grid-cols-12 lg:gap-10 items-start">
          {/* Sidebar — mobilde yatay kaydırma */}
          <aside className="lg:col-span-4 xl:col-span-3 mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-24 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Sözleşmeler
                </p>
                <p className="text-sm text-slate-400 mt-1 font-medium">
                  Yasal metinler ve politikalar
                </p>
              </div>
              <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {navOgeleri.map((oge) => {
                  const aktif = oge.slug === slug;
                  const Ikon = SAYFA_IKON[oge.anahtar] ?? FileText;
                  return (
                    <Link
                      key={oge.slug}
                      href={oge.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap lg:whitespace-normal transition-all shrink-0 lg:shrink ${
                        aktif
                          ? 'bg-[#2ABBA7]/15 text-[#2ABBA7] border border-[#2ABBA7]/30'
                          : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <Ikon className={`w-4 h-4 shrink-0 ${aktif ? 'text-[#2ABBA7]' : ''}`} />
                      {oge.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Ana içerik */}
          <main className="lg:col-span-8 xl:col-span-9 min-w-0">
            {!sayfa?.yayinda ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-sm px-8 py-16 text-center"
              >
                <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Sayfa hazırlanıyor</h1>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Bu sözleşme metni henüz yayınlanmadı. Kısa süre içinde güncellenecektir.
                </p>
              </motion.div>
            ) : (
              <motion.article
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30 overflow-hidden"
              >
                <header className="relative overflow-hidden bg-gradient-to-br from-[#0F2137] via-indigo-950 to-indigo-900 px-6 sm:px-10 py-10 sm:py-12">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 20% 50%, rgba(42,187,167,0.25) 0%, transparent 50%)',
                    }}
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#2ABBA7]/20 border border-[#2ABBA7]/30 flex items-center justify-center shrink-0">
                      <AktifIkon className="w-6 h-6 text-[#2ABBA7]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#2ABBA7] mb-2">
                        Yasal metin
                      </p>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                        {sayfa.baslik}
                      </h1>
                    </div>
                  </div>
                </header>

                <div className="px-6 sm:px-10 py-8 sm:py-10 bg-slate-50/80 border-t border-slate-100">
                  <div
                    className={ICERIK_STILI}
                    dangerouslySetInnerHTML={{ __html: duzenlenmisHtml }}
                  />
                </div>
              </motion.article>
            )}

            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <p className="text-sm text-slate-400 font-medium">
                Bu metinle ilgili sorularınız için bizimle iletişime geçebilirsiniz.
              </p>
              <a
                href={`mailto:${eposta}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#2ABBA7] hover:text-teal-300 transition-colors shrink-0"
              >
                <Mail className="w-4 h-4" />
                {eposta}
              </a>
            </div>
          </main>
        </div>
      </div>
    </MarketingShell>
  );
}
