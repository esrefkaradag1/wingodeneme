/**
 * AI soru çıktısı: literal \\n, iç monolog / öz-düzeltme sızıntısı ve HTML paragraf temizliği.
 * LaTeX komutlarını bozmamak için \\n → boşluk dönüşümünde dikkatli kalınır (\\neq vb.).
 */

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Metinde görünen "ters eğik+n" satır sonu kalıntıları; LaTeX \\neq, \\nabla vb. korunur. */
export function aiSoruLiteralYeniSatirDuzelt(metin: string): string {
  let s = String(metin || '');
  s = s.replace(/\r\n/g, '\n');
  /* JSON’dan kalan çift kaçış */
  s = s.replace(/\\\\n/g, ' ');
  /*
   * Model bazen satır sonunu metne "\\n" diye basar: "\\n1." "\\n2." ekranda görünür.
   * Önce numaralı listeyi <br/> ile düzelt; sonra kalan "\\n" ( \\neq, \\nabla hariç ) sök.
   */
  s = s.replace(/\\n\s*(?=\d+[\.)]\s*)/g, '<br/>');
  s = s.replace(/\\n\\n+/g, ' ');
  s = s.replace(/\\n(?=[A-ZÇĞİÖŞÜİ\u0130])/g, ' ');
  s = s.replace(/\\n(?=\s)/g, ' ');
  s = s.replace(/\\n$/gm, ' ');
  s = s.replace(/\\n(?!eq\b|abla\b)/g, ' ');
  return s;
}

/** LLM/JSON fazla ters eğik döndürdüğünde KaTeX için sadeleştir. */
export function aiSoruLatexTersEgikNormalize(metin: string): string {
  return String(metin || '')
    .replace(/\\{2}([\(\)\[\]])/g, '\\$1')
    .replace(
      /\\{2}(sqrt|frac|left|right|cdot|cdotp|pm|mp|times|div|leq|geq|neq|approx|equiv|text|mathrm|mathbf|overline)/gi,
      '\\$1',
    );
}

const KOTU_PARAGRAF_ANAHTARLARI = [
  'tekrar kontrol',
  'tekrar bak',
  'tekrar bakıyorum',
  'tekrar hesap',
  'yanlış topladım',
  'yanlış toplad',
  'yanlış ekledim',
  'toplama hatası',
  'hesaplamayı yeniden',
  'dikkat!',
  'değil, dikkat',
  'aslında doğru',
  'asıl doğru',
  'asıl cevap',
  'düşünce süreci',
  'hata yaptım',
  'kendimi düzelt',
  'ancak şıklarda',
  'olması gerekirdi',
  'bir dakika',
  'bekle,',
  'özür',
  'zincirleme',
  'doğru cevabın',
  'iç monolog',
  'model öz',
  'öz-düzeltme',
  'kendi kendine',
  'şüphedeyim',
  'emin değilim',
  'yanlış yaptım',
  'lütfen yoksay',
  'yoksayın',
  'iç kontrol',
  'iç denetim',
  'gerçek sınavda',
  'sınavda görünmez',
  'model için',
  'sadece model',
  'modelin iç',
  'bu açıklama sadece',
  'bu not sadece',
  'şıklar yanlış',
  'şıklar hatalı',
  'seçenek olmalıydı',
  'doğru seçim olmalıydı',
];

function paragrafKotuMu(htmlParca: string): boolean {
  const t = stripHtmlTags(htmlParca).toLowerCase().replace(/\s+/g, ' ');
  if (t.length < 10) return false;
  if (KOTU_PARAGRAF_ANAHTARLARI.some((k) => t.includes(k))) return true;
  /* Çözüm adımları soru gövdesiyle aynı <p> içinde olduğunda başta olmayabilir */
  if (/\badım\s*\d+\s*(?:[.:;…]|[\-–—])/i.test(t)) return true;
  if (/\bdoğru\s+cevap\s*[a-e]\b/i.test(t)) return true;
  if (/\bdoğru\s+cevap\s*[a-e][\u0027\u2019]?\s*d[ıi]r\b/i.test(t)) return true;
  if (/\b[a-e]\s*şıkkıd[ıi]r\b/i.test(t)) return true;
  if (/^sonuç\s*:/i.test(t) && /\b(şıkkıd|doğru\s+cevap|cevap\s*[a-e]|doğrudur[,;.])/i.test(t)) return true;
  /* Sözel mantık çözümü: "elendi", "Geriye sadece … kaldı" */
  if (/\b(?:geri[ye]?\s+sadece|elendi)\b/i.test(t) && /\bsonuç\b/i.test(t)) return true;
  if (/\birrasyonel\w*\b/i.test(t) && /\btam\s+sayı\b/i.test(t) && /\bdoğru\s+cevap\b/i.test(t)) return true;
  return false;
}

/**
 * Model "metin"e çözüm yapıştırdığında ilk anlamlı kesim noktası (Türkçe sınav çözümü kalıpları).
 * Örn. "Adım 1 —" veya "Adım 1" sonrası doğrudan cümle: eski `[.:\\s]` em tireyi kaçırıyordu.
 */
function ilkCozumKesimIndeksi(metin: string): number {
  const kalıplar = [
    /\bAdım\s*1\s*(?:[\.:…\-–—]\s*|\s{1,4}|\n)/i,
    /\b1\s*[\.)]\s*Adım\b/i,
    /\bİlk\s+adım\s*[\.:…\-–—]?\s*/i,
    /* “Adım 1” ile biten kısa HTML parçaları */
    /\bAdım\s*1\s*<\/\s*p\s*>/i,
  ];
  let enKucuk = -1;
  for (const re of kalıplar) {
    const m = re.exec(metin);
    if (m && m.index !== undefined && (enKucuk < 0 || m.index < enKucuk)) enKucuk = m.index;
  }
  return enKucuk;
}

/** Aynı <p> içinde soru + "Adım 1: ..." çözümü birleşmişse çözüm kısmını at; yalnızca çözüm varsa boşalt. */
function cozumSizdirmaMetinKes(metin: string): string {
  const kesim = ilkCozumKesimIndeksi(metin);
  if (kesim < 0) return metin;

  const tail = metin.slice(kesim);
  const tailL = tail.toLowerCase();
  const adımKalıbı = /\badım\s*1\b/i.test(tail);

  const cozumGibi =
    adımKalıbı ||
    tailL.includes('sonuç') ||
    /\badım\s*2\b/i.test(tail) ||
    /\bdoğru\s+cevap\b/i.test(tail) ||
    /\b[a-e]\s*şıkkıd[ıi]r\b/i.test(tail) ||
    /\bdoğru\s+cevap\s*[a-e][\u0027\u2019]?\s*d[ıi]r\b/i.test(tail) ||
    (tailL.includes('olduğu için') && (tail.includes('$') || tail.includes('\\sqrt') || tail.includes('\\('))) ||
    (/\birrasyonel\w*\b/i.test(tailL) && tailL.includes('tam sayı'));

  /* Kesimden sonraki metin uzunsa ve "Adım 1" eşleştiyse, çözüm dışı pek olası değil */
  const kuyrukUzun = tail.replace(/\s+/g, ' ').trim().length >= 32;
  if (!cozumGibi && !(adımKalıbı && kuyrukUzun)) return metin;

  if (kesim === 0) return '';

  const oncesi = metin.slice(0, kesim).trim();
  return oncesi.length >= 6 ? oncesi : '';
}

/**
 * Model bazen soru cümlesi bittikten sonra köşe harfleri + ölçü yapıştırır: ?BCA86∠60°
 * (iç monolog/HTML değil; metin içinde kalmamalı.)
 */
export function aiSoruStemJunkKes(metin: string): string {
  let s = String(metin || '');
  if (!s.includes('?')) return s;

  const harfBlok = '[A-Za-zİıIıÇçĞğÖöŞşÜü]{2,14}\\d*';
  const dereceSonu = '(?:°|\\\\^\\\\circ|&#176;|&deg;|\\\'(?:dir)?\\.?)';
  // ? sonra opsiyonel ** / boşluk; harf+sayı; ∠ veya \angle; derece; opsiyonel kapanış **
  const yapistikKalip = new RegExp(
    `\\?(\\s*\\*{0,2}\\s*)(${harfBlok})((?:\\s*∠|\\s*\\\\angle\\b)\\s*\\d+\\s*${dereceSonu})(?:\\s*\\*{0,2})?`,
    'gi',
  );
  s = s.replace(yapistikKalip, '?');

  // ∠ olmadan: yalnızca harf yığını en az bir rakam içeriyorsa (Türkçe "Açı 60°" yanlış kesilmesin)
  const yapistikKalip2 = new RegExp(
    `\\?(\\s*\\*{0,2}\\s*)(${harfBlok})((?:\\s*∠|\\s*\\\\angle\\b)?\\s*\\d+\\s*${dereceSonu})(?:\\s*\\*{0,2})?`,
    'gi',
  );
  s = s.replace(yapistikKalip2, (full, _sp, orta: string) => {
    if (orta && /\d/.test(orta) && /^[A-Za-zİıIıÇçĞğÖöŞşÜü]{2,}/.test(orta)) return '?';
    return full;
  });

  return s;
}

/** Soru kökü HTML: kötü paragrafları at, literal \\n temizle. */
export function aiSoruMetinHtmlTemizle(html: string): string {
  let h = aiSoruStemJunkKes(aiSoruLiteralYeniSatirDuzelt(String(html || '')));
  h = aiSoruLatexTersEgikNormalize(h).trim();
  if (!h) return '<p></p>';
  const hasP = /<p[\s>]/i.test(h);
  if (!hasP) {
    h = cozumSizdirmaMetinKes(h);
    const plain = stripHtmlTags(h).replace(/\s+/g, ' ').trim();
    if (!plain) return '<p></p>';
    return h.trim();
  }
  h = h.replace(/<p(\s[^>]*)?>[\s\S]*?<\/p>/gi, (full) => {
    const m = full.match(/^<p(\s[^>]*)?>([\s\S]*)<\/p>$/i);
    if (!m) return full;
    const kesilmis = cozumSizdirmaMetinKes(m[2]).trim();
    if (!kesilmis) return '';
    return `<p${m[1] || ''}>${kesilmis}</p>`;
  });
  h = h.replace(/<p(\s[^>]*)?>\s*<\/p>/gi, '').trim();
  const re = /<p(\s[^>]*)?>[\s\S]*?<\/p>/gi;
  const chunks = h.match(re);
  if (!chunks?.length) return h.trim() || '<p></p>';
  const kept = chunks.filter((p) => !paragrafKotuMu(p));
  const body = kept.join('').trim();
  if (!body) return '<p></p>';
  return body;
}

/** SVG / diyagram üretim promptlarına ortak geometri tutarlılığı (tepe = orta harf). */
export const SVG_GEOMETRI_ACI_KURALI = `
📐 AÇI–KÖŞE EŞLEMESİ (ZORUNLU — çarpanlar sınavda buradan yakalanır):
- "∠BAC", "BAC açısı", "A tepesindeki açı", "A köşesindeki açı" ifadelerinde TEPE NOKTASI A'dır. Derece etiketi (örn. 60°) ve açı yayı yalnızca A köşesinde, iki komşu kenar (AB ile AC) arasında olmalı; B veya C tepe seçme.
- ∠ABC → tepe B; ∠ACB → tepe C. Metinde yazılan tepe harfine ters köşeye açı veya derece yazmak YASAK.
- |AB|, |AC|, |BC| sayıları şekilde doğru kenar üzerinde etiketlenmeli; metin ve svg aynı sayıları kullanmalı.
`;

/** Düz metin (şık / kısa alan): literal satır sonu ve gereksiz boşluk. */
export function aiSoruDuzMetinTemizle(metin: string): string {
  let t = aiSoruLiteralYeniSatirDuzelt(String(metin || ''));
  t = aiSoruStemJunkKes(t);
  return aiSoruLatexTersEgikNormalize(t).replace(/\s+/g, ' ').trim();
}

export type AiSoruTemizlenecek = {
  metin?: string;
  secenekler?: Record<string, string>;
  cozumAciklamasi?: string;
};

export function uretilenSoruAiTemizle<T extends AiSoruTemizlenecek>(s: T): T {
  const bosSoruYeri =
    '<p>Soru kökü eksik kaldı; model çözümü soru metnine karıştırmış olabilir. Çözüm açıklamasına bakın veya soruyu yeniden üretin.</p>';

  const out = { ...s } as T;
  if (typeof out.metin === 'string') {
    const ham = out.metin;
    let metin = aiSoruMetinHtmlTemizle(ham);
    const metinDuz = stripHtmlTags(metin).replace(/\s+/g, ' ').trim();
    const hamDuz = stripHtmlTags(ham).replace(/\s+/g, ' ').trim();

    if (metinDuz.length < 12 && hamDuz.length > 40) {
      const mevcut = typeof out.cozumAciklamasi === 'string' ? out.cozumAciklamasi.trim() : '';
      out.cozumAciklamasi = (mevcut ? `${hamDuz}\n\n${mevcut}` : hamDuz) as T['cozumAciklamasi'];
      metin = bosSoruYeri;
    } else if (metinDuz.length < 8) {
      metin = bosSoruYeri;
    }
    out.metin = metin;
  }
  if (out.secenekler && typeof out.secenekler === 'object') {
    const sc: Record<string, string> = { ...out.secenekler };
    for (const k of Object.keys(sc)) {
      const v = sc[k];
      if (typeof v === 'string') sc[k] = aiSoruDuzMetinTemizle(v);
    }
    out.secenekler = sc as T['secenekler'];
  }
  if (typeof out.cozumAciklamasi === 'string') {
    out.cozumAciklamasi = aiSoruDuzMetinTemizle(out.cozumAciklamasi) as T['cozumAciklamasi'];
  }
  return out;
}

/** Matematik/fen üretim promptu: KaTeX uyumlu LaTeX. */
export const LATEX_KATEX_YONERGESI = `
🔢 MATEMATİK / FEN / SAYISAL — LaTeX (KaTeX, zorunlu):
- Tüm formülleri satır içi \\( ... \\) veya blok/display \\[ ... \\] içine al; kök, kesir, üs vb. ham bırakma.
- Örnek kök: "Aşağıdaki ifadenin sadeleştirilmiş biçimi hangisidir? \\( \\sqrt{50} - 2\\sqrt{8} + \\sqrt{18} \\)"
- Şıklarda da aynı: örn. \\( 3\\sqrt{2} \\), \\( \\frac{2}{5} \\); tek başına \\sqrt{2} yazma.
- Kesir: \\frac{a}{b}; çarpma: \\cdot; üs: x^{2} veya x^n.
- Geometri / trigonometri / analitik: açılar için tercihen \\( \\widehat{BAC} = 60^\\circ \\) (tepe ortadaki harf); kenar uzunluğu \\( |AB| = 8 \\) veya \\( AB = 8 \\) birim. Ham "∠" veya köşe harflerini soru sonuna yapıştırma.
- Soru cümlesi "…dır?" veya "…midir?" ile bittikten sonra ek harf/sayı/açı dizisi yazma (örn. BCA86∠60° yasak); tek cümlede tamamla.
`;
