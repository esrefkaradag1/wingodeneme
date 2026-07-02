import Link from 'next/link';
import { SEO_LANDING } from '@/lib/seo';

/** Ana sayfada tarayıcılar için zengin, sunucu tarafı SEO içeriği */
export function SeoAnaSayfaEk() {
  const linkler = Object.entries(SEO_LANDING).map(([key, cfg]) => ({
    key,
    href: cfg.path,
    label: cfg.h1,
  }));

  return (
    <section
      className="bg-[#060a14] border-t border-white/10 py-14 px-4 sm:px-6"
      aria-labelledby="seo-ozet-baslik"
    >
      <div className="max-w-5xl mx-auto">
        <h2 id="seo-ozet-baslik" className="text-2xl font-black text-white mb-3">
          Online deneme, TYT, AYT ve LGS sınavları — Türkiye geneli
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-3xl">
          Wingo Deneme; <strong className="text-slate-200">online deneme sınavı</strong>,{' '}
          <strong className="text-slate-200">türkiye geneli deneme</strong> sıralaması ve ÖSYM/MEB
          tarzı kitapçık deneyimi sunar. <strong className="text-slate-200">TYT sınavları</strong>,{' '}
          <strong className="text-slate-200">AYT sınavları</strong>,{' '}
          <strong className="text-slate-200">LGS sınavları</strong> ve{' '}
          <strong className="text-slate-200">YKS deneme</strong> paketleriyle hazırlığınızı ölçün.
        </p>
        <nav aria-label="Deneme türleri">
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {linkler.map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-teal-500/40 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
