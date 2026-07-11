import { isKpssMode } from './platform';

/** Grup / öğretim türü seçim listesi — panel formlarında ortak kullanım */
export const OGRETIM_TURU_SECENEKLERI = [
  { value: 'YKS', label: 'YKS' },
  { value: 'LGS', label: 'LGS' },
  { value: 'KPSS', label: 'KPSS' },
  { value: 'KPSS_LISANS', label: 'KPSS Lisans' },
  { value: 'KPSS_ONLISANS', label: 'KPSS Önlisans' },
  { value: 'KPSS_ORTAOGRETIM', label: 'KPSS Ortaöğretim' },
  { value: 'SINIF_6', label: '6. Sınıf' },
  { value: 'SINIF_7', label: '7. Sınıf' },
  { value: 'SINIF_9', label: '9. Sınıf' },
  { value: 'SINIF_10', label: '10. Sınıf' },
  { value: 'SINIF_11', label: '11. Sınıf' },
] as const;

export type OgretimTuruDegeri = (typeof OGRETIM_TURU_SECENEKLERI)[number]['value'];

export function getOgretimTuruSecenekleri() {
  if (isKpssMode()) {
    return [
      { value: 'KPSS' as const, label: 'KPSS' },
      { value: 'KPSS_LISANS' as const, label: 'KPSS Lisans' },
      { value: 'KPSS_ONLISANS' as const, label: 'KPSS Önlisans' },
      { value: 'KPSS_ORTAOGRETIM' as const, label: 'KPSS Ortaöğretim' },
    ];
  }
  return [
    { value: 'YKS' as const, label: 'YKS' },
    { value: 'LGS' as const, label: 'LGS' },
    { value: 'SINIF_6' as const, label: '6. Sınıf' },
    { value: 'SINIF_7' as const, label: '7. Sınıf' },
    { value: 'SINIF_9' as const, label: '9. Sınıf' },
    { value: 'SINIF_10' as const, label: '10. Sınıf' },
    { value: 'SINIF_11' as const, label: '11. Sınıf' },
  ];
}

