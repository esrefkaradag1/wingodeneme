import { prisma } from '../config/database';
import { soruMetinImzasi, soruMetinImzasiGecerli } from './soruMetinImza';
import { sinavSorulariniGetir } from './sinavSoruListe';

export type MukerrerSoruBilgi = { siraNo: number; soruId: string };

/** Sınavdaki mevcut soruların (birincil + paylaşım) metin imzalarını döndürür. */
export async function sinavSoruImzaHaritasi(
  sinavId: string,
  excludeSoruId?: string,
): Promise<Map<string, MukerrerSoruBilgi>> {
  const sorular = await sinavSorulariniGetir(sinavId, {
    select: { id: true, siraNo: true, metinHtml: true },
  });
  const map = new Map<string, MukerrerSoruBilgi>();
  for (const s of sorular) {
    if (excludeSoruId && s.id === excludeSoruId) continue;
    const imza = soruMetinImzasi(String(s.metinHtml ?? ''));
    if (!soruMetinImzasiGecerli(imza)) continue;
    if (!map.has(imza)) map.set(imza, { siraNo: s.siraNo, soruId: s.id });
  }
  return map;
}

export async function sinavdaMukerrerSoruVarMi(
  sinavId: string,
  metinHtml: string,
  excludeSoruId?: string,
): Promise<{ var: boolean; siraNo?: number; soruId?: string }> {
  const imza = soruMetinImzasi(metinHtml);
  if (!soruMetinImzasiGecerli(imza)) return { var: false };
  const harita = await sinavSoruImzaHaritasi(sinavId, excludeSoruId);
  const mevcut = harita.get(imza);
  if (!mevcut) return { var: false };
  return { var: true, siraNo: mevcut.siraNo, soruId: mevcut.soruId };
}
