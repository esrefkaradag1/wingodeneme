/**
 * Serbest ve referans tabanlı AI soru üretiminden sonra:
 * özgünlük kontrolü + doğru şık tutarlılığı (gerekirse otomatik düzeltme).
 */

import { AppHatasi } from '../middlewares/hata.middleware';
import type { DogrulanmisHamSoru } from '../utils/soruUretimDogrulama';
import type { SikHarf } from '../utils/soruUretimDogrulama';
import { soruCevapTutarlilikDogrula, soruOzgunlukKontrol, soruCrossCheckBagimsiz, stemKontrolGerekli } from './ai.service';

const MAX_CEVAP_DUZELTME = 1;

export interface SoruGarantiSecenekleri {
  /**
   * Referans görsel/PDF varyasyonlarında ÖSYM/MEB kopya tespiti sık yanlış pozitif üretebilir.
   * Bu modda yalnızca cevap tutarlılığına odaklanılır.
   */
  referansVaryasyonu?: boolean;
  /** Tutarlılık uyuşmazlığında hata vermek yerine şıkkı otomatik düzeltip devam et */
  hataYerineDuzelt?: boolean;
  /** Matematik/fen gibi kesin doğrulama gereken derslerde bağımsız çözdürme uygular */
  sikiDogrulama?: boolean;
}

export interface SoruGarantiMeta {
  ozgunlukKontrol: { ozgun: boolean; gerekce: string };
  tutarlilikKontrol: { tutarli: boolean; gerekce: string; onerilenCevap?: string | null };
  dogruCevapOtomatikDuzeltme?: { once: SikHarf; sonra: SikHarf };
  dogruCevapZorunluDuzeltme?: { once: SikHarf; sonra: SikHarf; gerekce: string };
  crossCheck?: { dogruHarf: SikHarf; uyumlu: boolean; gerekce: string; model: string };
}

/**
 * Şema doğrulaması geçmiş sorular üzerinde çalışır; başarısızlıkta 422 fırlatır.
 */
export async function soruUretimGarantiKatmani(
  sorular: DogrulanmisHamSoru[],
  ders: string,
  secenekler?: SoruGarantiSecenekleri
): Promise<{ sorular: DogrulanmisHamSoru[]; garantiMeta: SoruGarantiMeta[] }> {
  const out: DogrulanmisHamSoru[] = [];
  const garantiMeta: SoruGarantiMeta[] = [];
  const referansModu = secenekler?.referansVaryasyonu === true;
  const hataYerineDuzelt = secenekler?.hataYerineDuzelt !== false;
  const siki = secenekler?.sikiDogrulama === true;

  for (let i = 0; i < sorular.length; i++) {
    const kaynak = sorular[i];
    const metin = kaynak.metinHtml ?? kaynak.metin ?? '';

    const oz = referansModu
      ? {
          ozgun: true,
          gerekce:
            'Referans varyasyonu: kaynakla aynı kavramda benzer soru üretimi amacıyla kopya taraması atlandı.',
        }
      : await soruOzgunlukKontrol(metin, ders);
    if (!oz.ozgun) {
      throw new AppHatasi(
        `Soru ${i + 1} özgünlük kontrolünden geçmedi (${oz.gerekce}). Üretimi tekrarlayın veya farklı bir konu deneyin.`,
        422
      );
    }

    let dogru: SikHarf = kaynak.dogruCevap;
    let duzeltme: { once: SikHarf; sonra: SikHarf } | undefined;
    let zorunluDuzeltme: { once: SikHarf; sonra: SikHarf; gerekce: string } | undefined;

    /** Referans üretiminde soru başına ek LLM tutarlılık çağrısı OpenRouter 429 üretir; sıkı doğrulama kapalıysa atla */
    if (referansModu && !siki) {
      garantiMeta.push({
        ozgunlukKontrol: oz,
        tutarlilikKontrol: {
          tutarli: true,
          gerekce: 'Referans varyasyonu: toplu tutarlılık LLM kontrolü atlandı.',
        },
      });
      out.push({ ...kaynak, dogruCevap: dogru });
      continue;
    }

    for (let deneme = 0; deneme <= MAX_CEVAP_DUZELTME; deneme++) {
      const t = referansModu
        ? {
            tutarli: true,
            gerekce: 'Referans varyasyonu: tutarlılık ön kontrolü atlandı.',
            onerilenCevap: null as string | null,
          }
        : await soruCevapTutarlilikDogrula({
            ders,
            metin,
            secenekler: kaynak.secenekler,
            dogruCevap: dogru,
            referansVaryasyonu: referansModu,
          });

      if (t.tutarli) {
        // Sıkı doğrulama: bağımsız çözdürme ile doğru şıkkı teyit et.
        // STEM ile sınırlı tutmuyoruz; sözel sorularda da yanlış cevaplara
        // rastlandığı için 'siki:true' geldiğinde her dersten teyit alıyoruz.
        let ccMeta: SoruGarantiMeta['crossCheck'] | undefined;
        if (siki) {
          const cc = await soruCrossCheckBagimsiz({
            ders,
            metin,
            secenekler: kaynak.secenekler,
          });
          const uyumlu = cc.dogruHarf === dogru;
          ccMeta = { dogruHarf: cc.dogruHarf, uyumlu, gerekce: cc.gerekce, model: cc.model };

          // STEM olmasa bile bağımsız çözücüler farklı harf verirse:
          // - hataYerineDuzelt açıkken doğru şıkkı otomatik düzelt
          // - değilse üretimi reddet
          if (!uyumlu) {
            const sozel = !stemKontrolGerekli(ders);
            // Sözelde tek bir model farklı olabilir; cross-check zaten 2-3 model
            // çoğunluk oylaması yapıyor, dolayısıyla farklılık güçlü bir sinyal.
            if (!hataYerineDuzelt) {
              throw new AppHatasi(
                `Soru ${i + 1} sıkı doğrulamada (bağımsız çözüm) işaretlenen cevapla uyuşmadı. Tekrar üretin. (${cc.gerekce})`,
                422
              );
            }
            const once = dogru;
            dogru = cc.dogruHarf;
            zorunluDuzeltme = {
              once,
              sonra: dogru,
              gerekce: `${sozel ? 'Sözel ' : ''}Bağımsız çözüm uyuşmazlığı: ${cc.gerekce}`.slice(0, 900),
            };
          }
        }
        garantiMeta.push({
          ozgunlukKontrol: oz,
          tutarlilikKontrol: t,
          ...(duzeltme ? { dogruCevapOtomatikDuzeltme: duzeltme } : {}),
          ...(zorunluDuzeltme ? { dogruCevapZorunluDuzeltme: zorunluDuzeltme } : {}),
          ...(ccMeta ? { crossCheck: ccMeta } : {}),
        });
        out.push({
          ...kaynak,
          dogruCevap: dogru,
        });
        break;
      }

      if (t.onerilenCevap && deneme < MAX_CEVAP_DUZELTME) {
        const once = dogru;
        dogru = t.onerilenCevap as SikHarf;
        duzeltme = { once, sonra: dogru };
        continue;
      }

      if (!hataYerineDuzelt) {
        throw new AppHatasi(
          `Soru ${i + 1} cevap tutarlılığı garanti katmanında geçmedi (${t.gerekce}). Tekrar üretin.`,
          422
        );
      }

      // Hata yerine düzelt: önce önerilen cevap, yoksa bağımsız çözücüden gelen harf
      let aday: SikHarf | null = null;
      if (t.onerilenCevap && /^[A-E]$/.test(t.onerilenCevap)) {
        aday = t.onerilenCevap as SikHarf;
      } else {
        const cc = await soruCrossCheckBagimsiz({
          ders,
          metin,
          secenekler: kaynak.secenekler,
        });
        if (cc?.dogruHarf && /^[A-E]$/.test(cc.dogruHarf)) {
          aday = cc.dogruHarf as SikHarf;
        }
      }

      if (!aday) {
        throw new AppHatasi(
          `Soru ${i + 1} tutarsız bulundu ve otomatik düzeltme harfi üretilemedi. Tekrar üretin.`,
          422
        );
      }

      if (aday !== dogru) {
        zorunluDuzeltme = {
          once: dogru,
          sonra: aday,
          gerekce: t.gerekce || 'Tutarlılık denetiminde otomatik düzeltme uygulandı.',
        };
        dogru = aday;
      }

      garantiMeta.push({
        ozgunlukKontrol: oz,
        tutarlilikKontrol: { ...t, tutarli: true },
        ...(duzeltme ? { dogruCevapOtomatikDuzeltme: duzeltme } : {}),
        ...(zorunluDuzeltme ? { dogruCevapZorunluDuzeltme: zorunluDuzeltme } : {}),
      });
      out.push({
        ...kaynak,
        dogruCevap: dogru,
      });
      break;
    }
  }

  return { sorular: out, garantiMeta };
}
