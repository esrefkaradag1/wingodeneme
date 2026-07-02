/**
 * OpenRouter / LLM yanıtlarından JSON ayıklama.
 * Kesilmiş (max_tokens) yanıtlarda bile tam soru nesnelerini kurtarmaya çalışır.
 */

function jsonTamamlamaDenemeleri(ham: string): string[] {
  const s = ham.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const ekler = ['', '"}', '"]}', '"}]}', '"} ]}', '" }] }', '} ] }', '"]', '}', ']'];
  const out = new Set<string>([s]);
  for (const ek of ekler) out.add(s + ek);
  if (/:\s*"[^"]*$/.test(s)) {
    for (const ek of ekler) out.add(`${s}"${ek.replace(/^"/, '')}`);
  }
  return [...out];
}

/** Dizi içindeki üst seviye `{ ... }` bloklarını (string kaçışlarına dikkat ederek) bulur */
function ustSeviyeNesneleriBul(jsonParca: string): string[] {
  const nesneler: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonParca.length; i++) {
    const c = jsonParca[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        nesneler.push(jsonParca.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return nesneler;
}

function kesikJsondanSorularCikar(metin: string): Record<string, unknown>[] {
  const temiz = metin.replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const idx = temiz.search(/"sorular"\s*:/i);
  const arama = idx >= 0 ? temiz.slice(idx) : temiz;
  const arrStart = arama.indexOf('[');
  if (arrStart === -1) return [];

  const inner = arama.slice(arrStart + 1);
  const sorular: Record<string, unknown>[] = [];

  for (const blok of ustSeviyeNesneleriBul(inner)) {
    try {
      const obj = JSON.parse(blok) as Record<string, unknown>;
      if (obj && typeof obj === 'object' && obj.metin && obj.secenekler) {
        sorular.push(obj);
      }
    } catch {
      /* eksik nesne atlanır */
    }
  }
  return sorular;
}

export function aiJsonAyikla(metin: string): Record<string, unknown> {
  const adaylar = [metin.trim()];
  const blok = metin.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (blok?.[1]) adaylar.push(blok[1].trim());
  const nesne = metin.match(/\{[\s\S]*/);
  if (nesne?.[0]) adaylar.push(nesne[0].trim());

  const tekNesneMi = (parsed: Record<string, unknown>): boolean =>
    parsed.metinHtml !== undefined ||
    parsed.secenekler !== undefined ||
    parsed.dogruCevap !== undefined ||
    parsed.kazanim !== undefined ||
    parsed.zorluk !== undefined ||
    parsed.aciklama !== undefined ||
    parsed.svgGorsel !== undefined ||
    parsed.neden !== undefined ||
    parsed.neYapmali !== undefined ||
    parsed.miniIpucu !== undefined ||
    parsed.tahtaAdimlari !== undefined ||
    parsed.cizimAdimlari !== undefined ||
    parsed.videoAdimlari !== undefined;
  for (const ham of adaylar) {
    for (const deneme of jsonTamamlamaDenemeleri(ham)) {
      try {
        const parsed = JSON.parse(deneme) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
        const sorular = parsed.sorular;
        if (Array.isArray(sorular) && sorular.length > 0) return parsed;
        if (tekNesneMi(parsed)) return parsed;
      } catch {
        /* sonraki deneme */
      }
    }
  }

  const kismi = kesikJsondanSorularCikar(metin);
  if (kismi.length > 0) return { sorular: kismi };

  return { sorular: [] };
}
