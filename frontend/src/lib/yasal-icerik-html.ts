const BLOCK_TAG_RE = /<(p|h[1-6]|ul|ol|li|div|table|blockquote)\b/i;

/** Büyük harfli bölüm başlığı: "HİZMETİN KAPSAMI:" */
const BOLUM_BASLIK_RE = /^([A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9\s\-–—]{2,}):\s*(.*)$/s;

/** Metin içinde yeni bölüm başlangıcı (lookbehind olmadan split) */
const BOLUM_AYIRICI_RE = /(?=[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9\s\-–—]{4,}:)/;

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSatirlar(text: string): string {
  return htmlEscape(text).replace(/\n/g, '<br />');
}

function formatNumaraliListe(blok: string): string {
  const satirlar = blok.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const items = satirlar.map((satir) => {
    const m = satir.match(/^\d+\.\s+(.*)$/);
    return `<li>${formatSatirlar(m ? m[1] : satir)}</li>`;
  });
  return `<ol>${items.join('')}</ol>`;
}

function formatBolum(parca: string): string {
  const trimmed = parca.trim();
  if (!trimmed) return '';

  const baslikEslesme = trimmed.match(BOLUM_BASLIK_RE);
  if (baslikEslesme) {
    const baslik = baslikEslesme[1].trim();
    const govde = baslikEslesme[2].trim();
    if (govde) {
      if (/^\d+\.\s/m.test(govde)) {
        return `<h2>${htmlEscape(baslik)}</h2>\n${formatNumaraliListe(govde)}`;
      }
      return `<h2>${htmlEscape(baslik)}</h2>\n<p>${formatSatirlar(govde)}</p>`;
    }
    return `<h2>${htmlEscape(baslik)}</h2>`;
  }

  if (/^\d+\.\s/m.test(trimmed)) {
    return formatNumaraliListe(trimmed);
  }

  return `<p>${formatSatirlar(trimmed)}</p>`;
}

function formatBlok(blok: string): string {
  const trimmed = blok.trim();
  if (!trimmed) return '';

  const baslikEslesme = trimmed.match(BOLUM_BASLIK_RE);
  if (baslikEslesme && baslikEslesme[1] === baslikEslesme[1].toLocaleUpperCase('tr-TR')) {
    return formatBolum(trimmed);
  }

  if (/^\d+\.\s/m.test(trimmed)) {
    return formatNumaraliListe(trimmed);
  }

  return `<p>${formatSatirlar(trimmed)}</p>`;
}

/**
 * Admin panelinden düz metin yapıştırıldığında paragraf ve bölüm başlıklarını HTML'e çevirir.
 * Zaten HTML (p, h2, ul vb.) içeriyorsa dokunulmaz.
 */
export function yasalIcerikHtmlDuzenle(ham: string): string {
  const src = (ham || '').trim();
  if (!src) return '';

  if (BLOCK_TAG_RE.test(src)) {
    return src;
  }

  const text = src.replace(/\r\n/g, '\n');

  if (!text.includes('\n')) {
    const bolumler = text.split(BOLUM_AYIRICI_RE).map((b) => b.trim()).filter(Boolean);
    if (bolumler.length > 1) {
      return bolumler.map(formatBolum).filter(Boolean).join('\n');
    }
  }

  const bloklar = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (bloklar.length > 0) {
    return bloklar.map(formatBlok).filter(Boolean).join('\n');
  }

  return formatBlok(text);
}
