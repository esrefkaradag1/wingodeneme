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
      className="bg-edu-bg px-3 sm:px-6 pb-8 -mt-2"
      aria-labelledby="seo-ozet-baslik"
    >
      <div className="max-w-7xl mx-auto rounded-3xl border border-edu-line bg-white px-6 sm:px-10 py-10 sm:py-12 shadow-sm">
        <h2
          id="seo-ozet-baslik"
          className="font-display text-xl sm:text-2xl font-extrabold text-edu-ink mb-3"
        >
          Online deneme, TYT, AYT ve LGS sınavları — Türkiye geneli
        </h2>
        <p className="text-edu-muted text-sm leading-relaxed mb-6 max-w-3xl">
          Wingo Deneme; <strong className="text-edu-ink">online deneme sınavı</strong>,{' '}
          <strong className="text-edu-ink">türkiye geneli deneme</strong> sıralaması ve ÖSYM/MEB
          tarzı kitapçık deneyimi sunar. <strong className="text-edu-ink">TYT sınavları</strong>,{' '}
          <strong className="text-edu-ink">AYT sınavları</strong>,{' '}
          <strong className="text-edu-ink">LGS sınavları</strong> ve{' '}
          <strong className="text-edu-ink">YKS deneme</strong> paketleriyle hazırlığınızı ölçün.
        </p>
        <nav aria-label="Deneme türleri">
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {linkler.map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  className="block rounded-xl border border-edu-line bg-edu-bg/60 px-4 py-3 text-sm font-semibold text-edu-ink hover:border-wingo-400 hover:bg-wingo-50 transition-colors"
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
