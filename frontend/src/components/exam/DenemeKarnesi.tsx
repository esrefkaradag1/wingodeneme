'use client';

import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { siteLogoGorunum } from '@/lib/site-marka-logo';

export type DenemeKarnesiVerisi = {
  katilimId: string;
  ogrenci: {
    ad: string;
    soyad: string;
    sinif: string | null;
    okul: string | null;
    ilce: string | null;
    sehir: string | null;
  };
  sinav: {
    id: string;
    baslik: string;
    tur: string;
    baslangicZamani: string;
    grupAdi: string;
    kitapcikBolumAdi?: string | null;
  };
  ozet: {
    dogruSayisi: number;
    yanlisSayisi: number;
    bosSayisi: number;
    netPuan: number;
    hamPuan: number;
    ulusalSiralama: number | null;
    yuzdelik: number | null;
  };
  karsilastirma: {
    sinavOrtHamPuan: number | null;
    sinavOrtNet: number | null;
    enYuksekHamPuan: number | null;
    katilimciSayisi: number;
  };
  dereceler: {
    genel: { sira: number | null; toplam: number };
    sinif: { sira: number | null; toplam: number };
    okul: { sira: number | null; toplam: number };
    ilce: { sira: number | null; toplam: number };
    il: { sira: number | null; toplam: number };
  };
  dersOzeti: Array<{
    ders: string;
    soruSayisi: number;
    dogru: number;
    yanlis: number;
    bos: number;
    net: number;
    basariYuzdesi: number;
    genelBasariYuzdesi: number | null;
  }>;
  konuGruplu: Record<
    string,
    Array<{
      ders: string;
      konu: string;
      soruSayisi: number;
      dogru: number;
      yanlis: number;
      bos: number;
      basariYuzdesi: number;
      genelBasariYuzdesi: number | null;
    }>
  >;
  cevapAnahtari: Array<{
    siraNo: number;
    ders: string;
    dogruCevap: string;
    secilen: string | null;
    dogru: boolean | null;
  }>;
  gecmisSinavlar: Array<{
    katilimId: string;
    baslik: string;
    hamPuan: number;
    netPuan: number;
    tarih: string;
  }>;
  gecmisSinavlarGuncel: {
    baslik: string;
    hamPuan: number;
    netPuan: number;
  };
};

function PuanGostergesi({
  etiket,
  deger,
  max = 100,
  renk,
}: {
  etiket: string;
  deger: number | null;
  max?: number;
  renk: string;
}) {
  const yuzde = deger != null ? Math.min(100, Math.max(0, (deger / max) * 100)) : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (yuzde / 100) * c;

  return (
    <div className="flex flex-col items-center justify-center w-[92px] shrink-0">
      <div className="relative w-[76px] h-[76px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={renk}
            strokeWidth="6"
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-slate-900 tabular-nums leading-none">
            {deger != null ? deger.toFixed(deger >= 100 ? 0 : 1) : '—'}
          </span>
        </div>
      </div>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-2.5 text-center leading-tight max-w-[88px]">
        {etiket}
      </p>
    </div>
  );
}

function dereceMetni(d: { sira: number | null; toplam: number }) {
  if (!d.sira || d.toplam <= 0) return '—';
  return `${d.sira} / ${d.toplam}`;
}

function KartBaslik({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
      <span className="w-1 h-4 rounded-full bg-indigo-600" />
      <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.14em]">{children}</h3>
    </div>
  );
}

interface DenemeKarnesiProps {
  veri: DenemeKarnesiVerisi;
  kurumAdi?: string;
  logoUrl?: string;
}

export function DenemeKarnesi({ veri, kurumAdi: kurumAdiProp, logoUrl: logoUrlProp }: DenemeKarnesiProps) {
  const site = useSiteIcerik();
  const kurumAdi = kurumAdiProp ?? site.marka.ad ?? 'Wingo Deneme';
  const logoUrl = logoUrlProp ?? site.marka.logoUrl;
  const logoSt = siteLogoGorunum({ ...site.marka, logoYukseklikPx: 52, logoMaxGenislikPx: 140 });

  const v = veri;
  const ogrenciAd = `${v.ogrenci.ad} ${v.ogrenci.soyad}`.trim();
  const tarih = format(new Date(v.sinav.baslangicZamani), 'd MMMM yyyy', { locale: tr });

  const gecmisGrafik = [
    ...v.gecmisSinavlar.map((g) => ({ etiket: g.baslik.slice(0, 10), puan: g.hamPuan, guncel: false })),
    { etiket: 'Bu sınav', puan: v.gecmisSinavlarGuncel.hamPuan, guncel: true },
  ];
  const maxGecmis = Math.max(100, ...gecmisGrafik.map((g) => g.puan), 1);

  const dersSatirlari = v.dersOzeti.filter((d) => d.ders !== 'TOPLAM');
  const toplamSatir = v.dersOzeti.find((d) => d.ders === 'TOPLAM');

  const cevapBolumler = v.cevapAnahtari.reduce<Record<string, typeof v.cevapAnahtari>>((acc, c) => {
    if (!acc[c.ders]) acc[c.ders] = [];
    acc[c.ders].push(c);
    return acc;
  }, {});

  const ogrenciBilgi = [
    { etiket: 'Ad Soyad', deger: ogrenciAd },
    { etiket: 'Sınıf', deger: v.ogrenci.sinif || '—' },
    { etiket: 'Okul', deger: v.ogrenci.okul || '—' },
    { etiket: 'Kitapçık', deger: 'A' },
  ];

  return (
    <div className="deneme-karnesi max-w-[210mm] mx-auto space-y-5 print:space-y-4">
      {/* Başlık bandı */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl print:shadow-none print:rounded-xl">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_#6366f1_0%,_transparent_55%)]" />
        <div className="relative px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em]">{kurumAdi}</p>
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                {v.sinav.baslik}
                <span className="block text-sm sm:text-base font-bold text-indigo-200 mt-1">Sonuç Belgesi</span>
              </h1>
              <p className="text-xs text-slate-300">
                {tarih} · {v.sinav.tur} · {v.sinav.grupAdi}
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-center sm:justify-end">
              {logoUrl ? (
                <div className="rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-white/20">
                  <img src={logoUrl} alt={kurumAdi} className={logoSt.className} style={logoSt.style} />
                </div>
              ) : (
                <div className="w-28 h-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <span className="text-2xl font-black text-white/90">{site.marka.kisaLogo || 'W'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {ogrenciBilgi.map((b) => (
              <div
                key={b.etiket}
                className="rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm px-3 py-2.5 min-w-0"
              >
                <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">{b.etiket}</p>
                <p className="text-sm font-bold text-white truncate mt-0.5" title={b.deger}>
                  {b.deger}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Özet kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm print:shadow-none print:border-slate-300 min-w-0">
          <KartBaslik>Puan Verileri</KartBaslik>
          <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-5 sm:gap-x-10 py-2">
            <PuanGostergesi etiket="Puanınız" deger={v.ozet.hamPuan} renk="#4f46e5" />
            <PuanGostergesi etiket="Sınav Ort." deger={v.karsilastirma.sinavOrtHamPuan} renk="#059669" />
            <PuanGostergesi etiket="En Yüksek" deger={v.karsilastirma.enYuksekHamPuan} renk="#d97706" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm print:shadow-none print:border-slate-300">
          <KartBaslik>Katılım ve Dereceler</KartBaslik>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-3 py-2 font-bold"></th>
                  <th className="text-center px-3 py-2 font-bold">Derece</th>
                  <th className="text-center px-3 py-2 font-bold">Katılım</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { etiket: 'Genel', d: v.dereceler.genel },
                  { etiket: 'Sınıf', d: v.dereceler.sinif },
                  { etiket: 'Okul', d: v.dereceler.okul },
                  { etiket: 'İlçe', d: v.dereceler.ilce },
                  { etiket: 'İl', d: v.dereceler.il },
                ].map((row) => (
                  <tr key={row.etiket} className="border-t border-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-700">{row.etiket}</td>
                    <td className="px-3 py-2 text-center font-black text-slate-900 tabular-nums">
                      {dereceMetni(row.d)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 tabular-nums">{row.d.toplam || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {v.ozet.yuzdelik != null && (
            <p className="mt-3 text-center text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-lg py-2">
              Yüzdelik dilim: %{v.ozet.yuzdelik.toFixed(1)}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm print:shadow-none print:border-slate-300">
          <KartBaslik>Geçmiş Sınav Puanlarınız</KartBaslik>
          <div className="flex items-end justify-around gap-2 h-32 px-1">
            {gecmisGrafik.map((g, i) => (
              <div key={i} className="flex flex-col items-center flex-1 min-w-0 max-w-[56px]">
                <span className="text-[9px] font-bold text-slate-600 mb-1 tabular-nums">{g.puan.toFixed(0)}</span>
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    g.guncel
                      ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                      : 'bg-gradient-to-t from-slate-300 to-slate-200'
                  }`}
                  style={{ height: `${Math.max(12, (g.puan / maxGecmis) * 72)}px` }}
                />
                <span className="text-[8px] text-slate-500 mt-2 truncate w-full text-center leading-tight">
                  {g.etiket}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Ders tablosu */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <KartBaslik>Ders Bazlı Sonuçlar</KartBaslik>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 font-bold">Ders</th>
                <th className="text-center px-3 py-3 font-bold">Soru</th>
                <th className="text-center px-3 py-3 font-bold">D</th>
                <th className="text-center px-3 py-3 font-bold">Y</th>
                <th className="text-center px-3 py-3 font-bold">B</th>
                <th className="text-center px-3 py-3 font-bold">Net</th>
                <th className="text-center px-3 py-3 font-bold">Başarı %</th>
                <th className="text-center px-4 py-3 font-bold">Genel %</th>
              </tr>
            </thead>
            <tbody>
              {dersSatirlari.map((d, i) => (
                <tr key={d.ders} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="px-4 py-2.5 font-bold text-slate-800">{d.ders}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{d.soruSayisi}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-emerald-600 tabular-nums">{d.dogru}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-rose-600 tabular-nums">{d.yanlis}</td>
                  <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">{d.bos}</td>
                  <td className="px-3 py-2.5 text-center font-black text-slate-900 tabular-nums">{d.net.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-center font-semibold tabular-nums">{d.basariYuzdesi.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-center text-slate-500 tabular-nums">
                    {d.genelBasariYuzdesi != null ? d.genelBasariYuzdesi.toFixed(0) : '—'}
                  </td>
                </tr>
              ))}
              {toplamSatir && (
                <tr className="bg-indigo-50 font-black text-indigo-950 border-t-2 border-indigo-200">
                  <td className="px-4 py-3">TOPLAM</td>
                  <td className="px-3 py-3 text-center tabular-nums">{toplamSatir.soruSayisi}</td>
                  <td className="px-3 py-3 text-center text-emerald-700 tabular-nums">{toplamSatir.dogru}</td>
                  <td className="px-3 py-3 text-center text-rose-700 tabular-nums">{toplamSatir.yanlis}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{toplamSatir.bos}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{toplamSatir.net.toFixed(2)}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{toplamSatir.basariYuzdesi.toFixed(0)}</td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {toplamSatir.genelBasariYuzdesi != null ? toplamSatir.genelBasariYuzdesi.toFixed(0) : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cevap anahtarı — grid, kaydırmasız */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm print:shadow-none print:border-slate-300">
        <KartBaslik>Cevap Anahtarı ve İşaretleriniz</KartBaslik>
        <div className="space-y-5">
          {Object.entries(cevapBolumler).map(([ders, cevaplar]) => (
            <div key={ders}>
              <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                {ders}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {cevaplar.map((c) => {
                  const yanlis = c.dogru === false;
                  const bos = c.dogru === null;
                  const dogru = c.dogru === true;
                  return (
                    <div
                      key={c.siraNo}
                      className={`rounded-lg border px-2 py-1.5 text-center ${
                        yanlis
                          ? 'border-rose-200 bg-rose-50'
                          : bos
                            ? 'border-slate-200 bg-slate-50'
                            : dogru
                              ? 'border-emerald-200 bg-emerald-50/70'
                              : 'border-slate-200 bg-white'
                      }`}
                    >
                      <p className="text-[9px] font-bold text-slate-400 mb-1">{c.siraNo}</p>
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-black">
                        <span className="text-slate-600">{c.dogruCevap}</span>
                        <span className="text-slate-300">→</span>
                        <span
                          className={
                            yanlis ? 'text-rose-700' : bos ? 'text-slate-400' : 'text-emerald-700'
                          }
                        >
                          {c.secilen || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Konu analizi */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm print:shadow-none print:border-slate-300">
        <KartBaslik>Konu Bazlı Analiz</KartBaslik>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(v.konuGruplu).map(([ders, konular]) => (
            <div key={ders} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white text-[10px] font-black px-4 py-2.5 uppercase tracking-wider">
                {ders}
              </div>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <th className="text-left px-3 py-2 font-bold">Konu</th>
                    <th className="text-center px-2 py-2 font-bold w-10">SS</th>
                    <th className="text-center px-2 py-2 font-bold w-11">%</th>
                    <th className="text-center px-2 py-2 font-bold w-11">Genel</th>
                  </tr>
                </thead>
                <tbody>
                  {konular.map((k) => {
                    const zayif = k.basariYuzdesi < 50;
                    return (
                      <tr key={k.konu} className="border-b border-slate-50 last:border-0">
                        <td className={`px-3 py-2 ${zayif ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>
                          {k.konu}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">{k.soruSayisi}</td>
                        <td className={`px-2 py-2 text-center font-bold tabular-nums ${zayif ? 'text-rose-700' : ''}`}>
                          {k.basariYuzdesi.toFixed(0)}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500 tabular-nums">
                          {k.genelBasariYuzdesi != null ? k.genelBasariYuzdesi.toFixed(0) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 print:border-slate-300">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={kurumAdi} className="h-8 w-auto object-contain opacity-80" />
          ) : (
            <span className="text-lg font-black text-indigo-600">{site.marka.kisaLogo || 'W'}</span>
          )}
          <p className="text-[10px] text-slate-500 max-w-xs">
            Bu belge <strong className="text-slate-700">{kurumAdi}</strong> tarafından otomatik oluşturulmuştur.
          </p>
        </div>
        <p className="text-[9px] text-slate-400 tabular-nums">
          {format(new Date(), 'd MMM yyyy HH:mm', { locale: tr })} · {v.katilimId.slice(-8).toUpperCase()}
        </p>
      </footer>
    </div>
  );
}
