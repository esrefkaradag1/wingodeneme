import { TUR_BILGI, denemeEtiketiCikar } from './osymKitapcikMetin';
import { soruGorunurHtml } from './soru-metin-parcalari';
import { formatOsymDagilimCumlesi, kitapcikSolKodSatir, soruSirasinaGoreDersBloklari } from './kitapcikDagilimMetni';
import { cozumleKitapcikBolumleri } from './kitapcikBolumleri';
import {
  KITAPCIK_SAYFA_BASI_SORU,
  kitapcikIkiSutunMu,
  kitapcikOgmTema,
  ogmKapakMi,
} from './kitapcik-tema';

export interface KitapcikHtmlSoru {
  siraNo: number;
  metinHtml: string;
  gorselUrl?: string | null;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string };
}

export interface KitapcikHtmlSinav {
  baslik: string;
  tur: string;
  baslangicZamani: string;
  kitapcikBolumAdi?: string | null;
  kitapcikTarihMetni?: string | null;
  kitapcikUrl?: string | null;
  konuDagilimi?: unknown;
}

function seceneklerHtml(secenekler: Record<string, string>): string {
  const siklar = ['A', 'B', 'C', 'D', 'E'] as const;
  return siklar
    .map((sik) => {
      const t = secenekler[sik];
      if (!t) return '';
      return `<div class="sec"><span class="sik">${sik}</span><span class="st">${escapeHtml(t)}</span></div>`;
    })
    .filter(Boolean)
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sayfaParcala<T>(dizi: T[], sayfaBoyu: number): T[][] {
  const cikis: T[][] = [];
  for (let i = 0; i < dizi.length; i += sayfaBoyu) {
    cikis.push(dizi.slice(i, i + sayfaBoyu));
  }
  return cikis;
}

function soruBloklariHtml(sorular: KitapcikHtmlSoru[]): string {
  return sorular
    .map(
      (s) => `
    <div class="soru">
      <div class="sno">${s.siraNo}.</div>
      <div class="sbody">
        <div class="metin">${soruGorunurHtml(s.metinHtml)}</div>
        ${s.gorselUrl ? `<div class="gorsel"><img src="${escapeHtml(s.gorselUrl)}" alt="" /></div>` : ''}
        <div class="secenekler">${seceneklerHtml(s.secenekler)}</div>
      </div>
    </div>`
    )
    .join('\n');
}

/** Yönetici içeriği; soru gövdesi HTML olarak (güvenilir kaynak) gömülür */
export function kitapcikHtmlBelgesiUret(sinav: KitapcikHtmlSinav, sorular: KitapcikHtmlSoru[]): string {
  const baslangicIso =
    typeof sinav.baslangicZamani === 'string'
      ? sinav.baslangicZamani
      : new Date(sinav.baslangicZamani).toISOString();
  const yil = new Date(baslangicIso).getFullYear();
  const bilgi = TUR_BILGI[sinav.tur] || TUR_BILGI.TYT;
  const n = sorular.length;
  const ogm = ogmKapakMi(sinav.tur);
  const ikiSutun = kitapcikIkiSutunMu(sinav.tur);
  const ogmTema = kitapcikOgmTema(sinav.tur);
  const filigran = sinav.tur === 'LGS' ? 'wingolik' : 'wingodeneme';
  const filigranFontBoyutu = sinav.tur === 'LGS' ? '90px' : '75px';
  const sayfaBoyu = ikiSutun ? KITAPCIK_SAYFA_BASI_SORU : 6;
  const bolumler = cozumleKitapcikBolumleri(sinav.tur, sorular, sinav.konuDagilimi, sinav.kitapcikBolumAdi);

  // Bölüm bazında sayfa grupları (siraNo ile sıralı; dağılım metni ile uyumlu)
  const sayfaPlan = bolumler.flatMap((b) => {
    const bolumSorularSirali = [...b.sorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0));
    const sayfalar = bolumSorularSirali.length === 0 ? [] : sayfaParcala(bolumSorularSirali, sayfaBoyu);
    return sayfalar.map((grup, idx) => ({
      bolumAdi: b.bolumAdi,
      isBolumIlkSayfa: idx === 0,
      sorular: grup,
    }));
  });

  const kapakGorsel = sinav.kitapcikUrl?.trim();
  const toplamSayfa = Math.max(1, sayfaPlan.length + (kapakGorsel ? 1 : 0));
  const ilkBolumAdi = bolumler[0]?.bolumAdi || 'GENEL TEST';

  function kapakOgm(bolumAdi: string, talimat1Metni: string): string {
    const bolumEscLocal = escapeHtml(bolumAdi);
    const solKodEsc = escapeHtml(kitapcikSolKodSatir(yil, sinav.tur, bolumAdi));
    const talEsc = escapeHtml(talimat1Metni);
    const sagRaw =
      denemeEtiketiCikar(sinav.baslik) || denemeEtiketiCikar(bolumAdi) || `${yil}-${bilgi.kod}/TÜR`;
    const sagEsc = escapeHtml(sagRaw);
    const altEsc = escapeHtml(ogmTema.altEtiket(yil));
    return `
  <p class="ogm-onizleme-not">Wingo Deneme — Öğrenci kitapçığı önizlemesi</p>
  <div class="ogm-logo">
    <div class="ogm-logo-ust">WINGO</div>
    <div class="ogm-logo-alt">DENEME</div>
  </div>
  <div class="ogm-box">
    <div class="ogm-top">
      <div class="ogm-top-sol">
        <div class="ogm-sol-kod">${solKodEsc}</div>
        <div class="ogm-sol-alt">${altEsc}</div>
      </div>
      <div class="ogm-top-orta">${bolumEscLocal}</div>
      <div class="ogm-top-sag">${sagEsc}</div>
    </div>
    <div class="ogm-talimat">
      <p><strong>1.</strong> ${talEsc}</p>
      <p><strong>2.</strong> Cevaplarınızı, cevap kâğıdının <strong>${bolumEscLocal}</strong> için ayrılan kısmına işaretleyiniz.</p>
    </div>
  </div>`;
  }


  function icBaslikOgm(bolumAdi: string): string {
    const bolumEscLocal = escapeHtml(bolumAdi);
    const sagIcRaw =
      denemeEtiketiCikar(sinav.baslik) || denemeEtiketiCikar(bolumAdi) || `${yil}-${bilgi.kod}/TÜR`;
    return `
  <div class="ogm-box ogm-box-ic">
    <div class="ogm-top">
      <div class="ogm-top-sol"><span class="ogm-sol-kod">${escapeHtml(kitapcikSolKodSatir(yil, sinav.tur, bolumAdi))}</span></div>
      <div class="ogm-top-orta">${bolumEscLocal}</div>
      <div class="ogm-top-sag">${escapeHtml(sagIcRaw)}</div>
    </div>
  </div>`;
  }

  function sayfaAltiHtml(sayfaNo: number): string {
    const son = sayfaNo >= toplamSayfa;
    const diger = son ? '' : '<span class="sayfa-alti-sag">Diğer sayfaya geçiniz.</span>';
    const sol = ogm
      ? `<span class="sayfa-alti-sol">${escapeHtml(ogmTema.footerSol)}</span>`
      : '';
    const footerCls = ogm ? 'sayfa-alti ogm-footer' : 'sayfa-alti';
    return `<div class="${footerCls}">${sol}<span class="sayfa-no">${sayfaNo}</span>${diger}</div>`;
  }

  const cssOrtak = `
  :root { --ogm-accent: ${ogmTema.accent}; }
  body { font-family: 'Times New Roman', Times, serif; color: #111; max-width: 210mm; margin: 0 auto; padding: 12mm; background: #f5f5f5; }
  .sayfa { background: #fff; padding: 14mm; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08); position: relative; overflow: hidden; max-width: 210mm; margin-left: auto; margin-right: auto; }
  ${ogm ? `.sayfa.sayfa-ogm::before { content: '${filigran}'; position: absolute; left: 50%; top: 48%; transform: translate(-50%,-50%) rotate(-32deg); font-size: ${filigranFontBoyutu}; font-weight: 700; color: rgba(0,0,0,.05); pointer-events: none; font-family: Arial, sans-serif; letter-spacing: .06em; z-index: 0; }` : ''}
  .sayfa > .sayfa-ic { position: relative; z-index: 1; }
  .sayfa > .sayfa-alti { position: relative; z-index: 1; }
  .sayfa-ic { display: flex; flex-direction: column; min-height: 0; }
  .sayfa-kapak .kapak-gorsel { width: 100%; max-height: 280mm; object-fit: contain; display: block; margin: 0 auto; }
  .iki-sutun { column-count: 2; column-gap: 1.6rem; column-rule: 2px solid var(--ogm-accent); }
  .iki-sutun .soru { break-inside: avoid; page-break-inside: avoid; }
  .tek-sutun { column-count: 1; }
  .ic-yks { border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 8px 0; margin-bottom: 14px; }
  .ic-yks-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ic-yks-kod { font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .ic-yks-orta { flex: 1; display: flex; justify-content: center; min-width: 0; }
  .ic-yks-mor { display: inline-block; background: #ebe3f7; border: 1px solid #c4b5dc; padding: 4px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
  .ic-yks-bos { width: 3rem; flex-shrink: 0; }
  .ic-lgs { margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #111; text-align: center; }
  .ic-lgs-satir { font-size: 11px; font-weight: 700; margin: 0; }
  .sayfa-alti { margin-top: auto; padding-top: 12px; border-top: 1px solid #999; position: relative; min-height: 1.75rem; display: flex; align-items: center; justify-content: center; }
  .ogm-footer { border-top: 1.8px solid var(--ogm-accent); padding-top: 10px; }
  .sayfa-alti-sol { position: absolute; left: 0; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 700; color: #111827; }
  .sayfa-no { font-size: 12px; font-weight: 600; }
  .sayfa-alti-sag { position: absolute; right: 0; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 700; color: #111827; }
  .uyari { font-size: 8.5px; line-height: 1.35; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 12px; text-align: justify; }
  .ust { text-align: center; }
  .ust .u1 { font-size: 11px; font-weight: 600; }
  .ust .u2 { font-size: 15px; font-weight: 700; margin-top: 4px; }
  .ust .u3 { font-size: 12px; font-weight: 600; margin-top: 6px; }
  .ust .u4 { font-size: 11px; margin-top: 10px; }
  .bolum { margin-top: 18px; padding-top: 18px; border-top: 3px solid #000; }
  .bolum .satir { text-align: center; font-size: 13px; font-weight: 700; }
  .talimat { margin-top: 14px; font-size: 11px; line-height: 1.5; }
  .talimat strong { font-weight: 700; }
  /* OGM / YKS kapak */
  .ogm-onizleme-not { font-size: 9px; text-align: center; color: #9ca3af; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 8px 0; font-family: Arial, sans-serif; }
  .ogm-logo { text-align: center; line-height: 1; margin-bottom: 6px; }
  .ogm-logo-ust { font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; letter-spacing: .08em; color: var(--ogm-accent); }
  .ogm-logo-alt { font-family: Arial, sans-serif; font-size: 9px; font-weight: 900; letter-spacing: .14em; color: #111827; margin-top: -2px; }
  .ogm-box { border: 1.8px solid var(--ogm-accent); border-radius: 14px; overflow: hidden; margin-bottom: 10px; background: #fff; }
  .ogm-box-ic { border-radius: 10px; margin-bottom: 12px; }
  .ogm-box-ic .ogm-top-orta { font-size: 11px; padding: 8px 10px; }
  .ogm-box-ic .ogm-top-sol { padding: 6px 10px; }
  .ogm-box-ic .ogm-top-sag { padding: 6px 10px; font-size: 10px; }
  .ogm-top { display: grid; grid-template-columns: 1fr 1.2fr 1fr; }
  .ogm-top-sol { background: #fff; color: #111827; padding: 10px 12px; border-right: 1.8px solid var(--ogm-accent); display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .ogm-sol-kod { font-size: 10px; font-weight: 700; font-family: ui-monospace, monospace; }
  .ogm-sol-alt { font-size: 9px; color: #6b7280; font-weight: 600; }
  .ogm-top-sag { background: #fff; color: #111827; font-size: 11px; font-weight: 700; padding: 10px 12px; text-align: right; border-left: 1.8px solid var(--ogm-accent); display: flex; align-items: center; justify-content: flex-end; }
  .ogm-top-orta { background: var(--ogm-accent); color: #fff; font-size: 12px; font-weight: 900; padding: 10px 12px; text-align: center; text-transform: uppercase; letter-spacing: .04em; display: flex; align-items: center; justify-content: center; line-height: 1.35; }
  .ogm-talimat { border-top: 1.8px solid var(--ogm-accent); padding: 10px 12px; font-size: 11px; line-height: 1.55; font-family: 'Times New Roman', Times, serif; }
  .soru { border-bottom: 1px solid #ddd; padding: 14px 0; display: flex; gap: 10px; align-items: flex-start; }
  .sno { font-weight: 700; font-size: 15px; min-width: 1.5em; line-height: 1.35; }
  .sbody { flex: 1; min-width: 0; }
  .metin { font-size: 14px; line-height: 1.45; margin-bottom: 10px; }
  .gorsel { text-align: center; margin: 10px 0; }
  .gorsel img { max-width: 100%; height: auto; }
  .secenekler .sec { display: flex; gap: 10px; align-items: flex-start; margin: 4px 0; font-size: 13px; line-height: 1.35; }
  .secenekler .sik { width: 18px; height: 18px; border: 1.6px solid #111827; border-radius: 999px; text-align: center; line-height: 16px; font-size: 10px; font-weight: 800; flex-shrink: 0; }
  .secenekler .st { font-weight: 500; color: #111827; }
  @media print { body { background: #fff; padding: 0; } .sayfa { box-shadow: none; padding: 10mm; margin-bottom: 0; page-break-after: always; } .sayfa:last-of-type { page-break-after: auto; } .sayfa.sayfa-ogm::before { display: none; } }`;

  if (n === 0) {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(sinav.baslik)} — Kitapçık</title>
<style>${cssOrtak}</style>
</head>
<body>
<div class="sayfa${ogm ? ' sayfa-ogm' : ''}">
  <div class="sayfa-ic">
  ${ogm ? kapakOgm(ilkBolumAdi, formatOsymDagilimCumlesi([], 0)) : ""}
  </div>
  ${sayfaAltiHtml(1)}
</div>
</body>
</html>`;
  }

  const kapakSayfasiHtml = kapakGorsel
    ? `<div class="sayfa sayfa-kapak"><div class="sayfa-ic"><img src="${escapeHtml(kapakGorsel)}" alt="Kitapçık kapağı" class="kapak-gorsel" /></div>${sayfaAltiHtml(1)}</div>`
    : '';

  const sayfaDivleri = sayfaPlan
    .map((p, idx) => {
      const bolumAdi = p.bolumAdi;
      const bTum = bolumler.find((b) => b.bolumAdi === bolumAdi);
      const bolumSorularSirali = bTum
        ? [...bTum.sorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0))
        : [...sorular].sort((a, b) => (a.siraNo ?? 0) - (b.siraNo ?? 0));
      const bolumToplamSoru = bolumSorularSirali.length;
      const dagilimBloklari = soruSirasinaGoreDersBloklari(bolumSorularSirali);
      const talimat1Ogm = formatOsymDagilimCumlesi(dagilimBloklari, bolumToplamSoru);
      const kapak = p.isBolumIlkSayfa
        ? (ogm ? kapakOgm(bolumAdi, talimat1Ogm) : '')
        : (ogm ? icBaslikOgm(bolumAdi) : '');
      const sutun = ikiSutun ? 'iki-sutun' : 'tek-sutun';
      const sorularHtml = soruBloklariHtml(p.sorular);
      return `<div class="sayfa${ogm ? ' sayfa-ogm' : ''}">
  <div class="sayfa-ic">
  ${kapak}
  <div class="${sutun}">${sorularHtml}</div>
  </div>
  ${sayfaAltiHtml(idx + 1 + (kapakGorsel ? 1 : 0))}
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(sinav.baslik)} — Kitapçık</title>
<style>${cssOrtak}</style>
</head>
<body>
${kapakSayfasiHtml}
${sayfaDivleri}
</body>
</html>`;
}

export function kitapcikHtmlDosyaIndir(sinav: KitapcikHtmlSinav, sorular: KitapcikHtmlSoru[], dosyaAdi?: string): void {
  const html = kitapcikHtmlBelgesiUret(sinav, sorular);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (dosyaAdi || `kitapcik-${sinav.baslik.replace(/[^\wğüşıöçĞÜŞİÖÇ\s-]/gi, '').slice(0, 40) || 'sinav'}`) + '.html';
  // Safari/Chrome güvenlik politikaları için DOM'a ekleyip tıklat
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
