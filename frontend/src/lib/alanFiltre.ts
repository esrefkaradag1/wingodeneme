/** Soru bankası alan sekmesi → API filtre parametreleri */
export type AlanTab =
  | 'HEPSI'
  | 'TYT'
  | 'AYT'
  | 'LGS'
  | 'KPSS_LISANS'
  | 'KPSS_ORTAOGRETIM'
  | 'KPSS_ONLISANS';

import { isKpssMode } from './platform';

export const ALAN_FILTRE_SECENEKLERI: { id: AlanTab; etiket: string; aktifSinif: string }[] = [
  { id: 'HEPSI', etiket: 'Tümü', aktifSinif: 'bg-gray-900 text-white shadow' },
  { id: 'TYT', etiket: 'TYT', aktifSinif: 'bg-indigo-600 text-white shadow' },
  { id: 'AYT', etiket: 'AYT', aktifSinif: 'bg-violet-600 text-white shadow' },
  { id: 'LGS', etiket: 'LGS', aktifSinif: 'bg-amber-500 text-white shadow' },
  { id: 'KPSS_ORTAOGRETIM', etiket: 'KPSS OÖ', aktifSinif: 'bg-cyan-700 text-white shadow' },
  { id: 'KPSS_ONLISANS', etiket: 'KPSS ÖL', aktifSinif: 'bg-sky-700 text-white shadow' },
  { id: 'KPSS_LISANS', etiket: 'KPSS LİS', aktifSinif: 'bg-teal-700 text-white shadow' },
];

export function getAlanFiltreSecenekleri() {
  if (isKpssMode()) {
    return [
      { id: 'HEPSI' as const, etiket: 'Tümü', aktifSinif: 'bg-gray-900 text-white shadow' },
      { id: 'KPSS_ORTAOGRETIM' as const, etiket: 'KPSS OÖ', aktifSinif: 'bg-cyan-700 text-white shadow' },
      { id: 'KPSS_ONLISANS' as const, etiket: 'KPSS ÖL', aktifSinif: 'bg-sky-700 text-white shadow' },
      { id: 'KPSS_LISANS' as const, etiket: 'KPSS LİS', aktifSinif: 'bg-teal-700 text-white shadow' },
    ];
  }
  return [
    { id: 'HEPSI' as const, etiket: 'Tümü', aktifSinif: 'bg-gray-900 text-white shadow' },
    { id: 'TYT' as const, etiket: 'TYT', aktifSinif: 'bg-indigo-600 text-white shadow' },
    { id: 'AYT' as const, etiket: 'AYT', aktifSinif: 'bg-violet-600 text-white shadow' },
    { id: 'LGS' as const, etiket: 'LGS', aktifSinif: 'bg-amber-500 text-white shadow' },
  ];
}


export function alanFiltreApiParams(tab: AlanTab): {
  ogretimTuru?: string;
  yksKapsam?: string;
} {
  switch (tab) {
    case 'TYT':
      return { ogretimTuru: 'YKS', yksKapsam: 'TYT' };
    case 'AYT':
      return { ogretimTuru: 'YKS', yksKapsam: 'AYT' };
    case 'LGS':
      return { ogretimTuru: 'LGS' };
    case 'KPSS_LISANS':
      return { ogretimTuru: 'KPSS_LISANS' };
    case 'KPSS_ORTAOGRETIM':
      return { ogretimTuru: 'KPSS_ORTAOGRETIM' };
    case 'KPSS_ONLISANS':
      return { ogretimTuru: 'KPSS_ONLISANS' };
    default:
      return {};
  }
}

export function alanKonuEtiketi(ogretimTuru?: string | null, yksSegment?: string | null): string {
  if (yksSegment === 'TYT') return 'TYT';
  if (yksSegment && yksSegment !== 'TYT') return 'AYT';
  if (ogretimTuru === 'KPSS_LISANS') return 'KPSS LİS';
  if (ogretimTuru === 'KPSS_ORTAOGRETIM') return 'KPSS OÖ';
  if (ogretimTuru === 'KPSS_ONLISANS') return 'KPSS ÖL';
  if (ogretimTuru === 'LGS') return 'LGS';
  if (ogretimTuru === 'YKS') return 'YKS';
  return ogretimTuru || '—';
}
