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
  { value: 'SINIF_10', label: '10. Sınıf' },
  { value: 'SINIF_11', label: '11. Sınıf' },
] as const;

export type OgretimTuruDegeri = (typeof OGRETIM_TURU_SECENEKLERI)[number]['value'];
