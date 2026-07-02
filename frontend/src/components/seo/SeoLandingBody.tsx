import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { SEO_LANDING, SITE_NAME, type SeoPageConfig } from '@/lib/seo';

type SeoLandingKey = keyof typeof SEO_LANDING;

const DIGER_SAYFALAR: { key: SeoLandingKey; label: string }[] = [
  { key: 'online-deneme', label: 'Online deneme' },
  { key: 'turkiye-geneli-deneme', label: 'Türkiye geneli deneme' },
  { key: 'yks-deneme', label: 'YKS deneme' },
  { key: 'tyt-deneme', label: 'TYT deneme' },
  { key: 'ayt-deneme', label: 'AYT deneme' },
  { key: 'lgs-deneme', label: 'LGS deneme' },
];

export function SeoLandingBody({ config, pageKey }: { config: SeoPageConfig; pageKey: SeoLandingKey }) {
  const diger = DIGER_SAYFALAR.filter((d) => d.key !== pageKey);

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <nav className="text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-white transition-colors">
              Ana sayfa
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-slate-300">{config.h1}</li>
        </ol>
      </nav>

      <header className="mb-10">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-400 mb-3">
          {SITE_NAME} · Online deneme
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
          {config.h1}
        </h1>
        <p className="text-lg text-slate-300 leading-relaxed max-w-3xl">{config.lead}</p>
      </header>

      <section className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-4">Neden {SITE_NAME}?</h2>
        <ul className="space-y-3">
          {config.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-slate-200 text-sm md:text-base">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/kayit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-sm font-black text-white hover:bg-teal-400 transition-colors"
          >
            Ücretsiz kayıt ol
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/paketler"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
          >
            Deneme paketlerini gör
          </Link>
        </div>
      </section>

      {config.faqs.length > 0 ? (
        <section className="mb-10" aria-labelledby="sss-baslik">
          <h2 id="sss-baslik" className="text-xl font-bold text-white mb-4">
            Sık sorulan sorular
          </h2>
          <div className="space-y-4">
            {config.faqs.map((f) => (
              <details
                key={f.soru}
                className="group rounded-xl border border-white/10 bg-slate-900/50 open:bg-slate-900/80"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-white text-sm md:text-base [&::-webkit-details-marker]:hidden">
                  {f.soru}
                </summary>
                <p className="px-5 pb-4 text-slate-300 text-sm leading-relaxed border-t border-white/5 pt-3">
                  {f.cevap}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-white/10 pt-8">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Diğer deneme türleri
        </h2>
        <ul className="flex flex-wrap gap-2">
          {diger.map((d) => (
            <li key={d.key}>
              <Link
                href={SEO_LANDING[d.key].path}
                className="inline-block rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-teal-500/50 hover:text-white transition-colors"
              >
                {d.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/rehber"
              className="inline-block rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-teal-500/50 hover:text-white transition-colors"
            >
              Rehber
            </Link>
          </li>
        </ul>
      </section>
    </article>
  );
}
