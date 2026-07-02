/**
 * AI soru üretimi sonrası: toplu iç benzerlik, banka benzerliği.
 * Cevap tutarlılığı ve özgün içerik → önce soruGarantiKatmani tamamlanır.
 */

import { SoruOnayDurumu } from '@prisma/client';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { jaccardKume, jaccardMetinler, metinKelimeKumesi } from '../utils/textBenzerlik';
import type { SoruGarantiMeta } from './soruGarantiKatmani';

export interface SoruKaliteGirdi {
  metin: string;
  svgGorsel?: string;
  secenekler: Record<string, string>;
  dogruCevap: string;
}

function tamMetin(s: SoruKaliteGirdi): string {
  return `${s.metin || ''}${s.svgGorsel || ''}`;
}

/** Aynı üretimde iki soru çok benzer (sıkı özgünlük) */
const ESIK_TOPLU_IC = 0.82;
/** Veritabanındaki aynı konu sorularına göre çok yüksek benzerlik → reddet */
const ESIK_BANKA_RED = 0.92;
/** Uyarı eşiği (düşük özgünlük şüphesi) */
const ESIK_BANKA_UYARI = 0.76;

export interface SoruKaliteSonuc {
  sorularMeta: Record<string, unknown>[];
  onayDurumu: SoruOnayDurumu;
}

export interface SoruKaliteSecenekleri {
  /** Referans varyasyonunda aynı partide benzer soru kökleri doğal kabul edilir. */
  referansVaryasyonu?: boolean;
}

/**
 * @param konuId null ise yalnızca toplu iç + banka (referans önizleme, kayıt yok)
 * @param garantiMeta soruGarantiKatmani çıktısı (aiMeta ile birleştirilir)
 */
export async function aiSoruKaliteIsleme(
  konuId: string | null,
  _ders: string,
  sorular: SoruKaliteGirdi[],
  garantiMeta?: SoruGarantiMeta[],
  secenekler?: SoruKaliteSecenekleri
): Promise<SoruKaliteSonuc> {
  void _ders;
  const metinler = sorular.map((s) => tamMetin(s));
  const atlaTopluIc = secenekler?.referansVaryasyonu === true;
  const sorularMeta: Record<string, unknown>[] = [];
  let onayDurumu: SoruOnayDurumu = SoruOnayDurumu.ONAY_BEKLIYOR;

  if (!atlaTopluIc) {
    for (let i = 0; i < metinler.length; i++) {
      for (let j = i + 1; j < metinler.length; j++) {
        const jacc = jaccardMetinler(metinler[i], metinler[j]);
        if (jacc >= ESIK_TOPLU_IC) {
          // Toplu üretimde tek bir benzerlik tüm isteği düşürmesin.
          // Bu durumda soruları reddetmek yerine editör onayı gerektirecek şekilde işaretle.
          onayDurumu = SoruOnayDurumu.ONAY_BEKLIYOR;
        }
      }
    }
  }

  let dbKumeler: Set<string>[] = [];
  if (konuId) {
    const mevcut = await prisma.soru.findMany({
      where: { konuId },
      select: { metinHtml: true },
      take: 600,
      orderBy: { olusturuldu: 'desc' },
    });
    dbKumeler = mevcut.map((r) => metinKelimeKumesi(r.metinHtml));
  }

  for (let idx = 0; idx < sorular.length; idx++) {
    const s = sorular[idx];
    const tam = tamMetin(s);
    const yeniKume = metinKelimeKumesi(tam);
    let maxBenzer = 0;

    for (const dbSet of dbKumeler) {
      const j = jaccardKume(yeniKume, dbSet);
      if (j > maxBenzer) maxBenzer = j;
    }

    if (konuId && maxBenzer >= ESIK_BANKA_RED) {
      // 5+ üretimde tek bir soru benzer çıktı diye tüm üretimi düşürmeyelim.
      // Soruyu kaydederken "editör incelemesi" uyarısı ekleyip onayı beklemeye al.
      onayDurumu = SoruOnayDurumu.ONAY_BEKLIYOR;
    }

    const meta: Record<string, unknown> = {
      ...(garantiMeta?.[idx] ? { soruGaranti: garantiMeta[idx] } : {}),
      ozgunluk: { konuBenzerlikSkoru: Number(maxBenzer.toFixed(4)) },
    };

    if (konuId && maxBenzer >= ESIK_BANKA_RED) {
      meta.ozgunlukRedUyari =
        `Bu soru kökü, aynı konudaki kayıtlı sorulara göre çok yüksek benzerlik gösteriyor (≈%${(maxBenzer * 100).toFixed(0)}). Editör incelemesi zorunludur.`;
    }

    if (konuId && maxBenzer >= ESIK_BANKA_UYARI) {
      meta.ozgunlukUyari =
        'Bu soru kökü, aynı konudaki kayıtlı sorulara göre orta/yüksek benzerlik gösteriyor; editör incelemesi önerilir.';
      onayDurumu = SoruOnayDurumu.ONAY_BEKLIYOR;
    }

    sorularMeta.push(meta);
  }

  return { sorularMeta, onayDurumu };
}
