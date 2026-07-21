/** YKS (pembe/kırmızı), LGS (mavi) ve KPSS (aynı YKS kitapçık düzeni) üst şerit renkleri */
export const KITAPCIK_OGM_TEMA = {
  YKS: {
    accent: '#e11d48',
    altEtiket: (yil: number) => `YKS'ye Doğru ${yil}`,
    footerSol: 'TYT · TÜR',
  },
  LGS: {
    accent: '#2563eb',
    altEtiket: (yil: number) => `LGS'ye Doğru ${yil}`,
    footerSol: 'LGS · TÜR',
  },
  KPSS: {
    accent: '#e11d48',
    altEtiket: (yil: number) => `KPSS'ye Doğru ${yil}`,
    footerSol: 'KPSS · TÜR',
  },
} as const;

export function yksMi(tur: string): boolean {
  return tur === 'TYT' || tur === 'AYT' || tur === 'AYT_TYT';
}

export function kpssTurMu(tur: string): boolean {
  return tur === 'KPSS' || tur.startsWith('KPSS_');
}

/** Wingo OGM tarzı kapak + iç sayfa şeridi (YKS, LGS, KPSS) */
export function ogmKapakMi(tur: string): boolean {
  return yksMi(tur) || tur === 'LGS' || kpssTurMu(tur);
}

export function kitapcikOgmTema(tur: string) {
  if (tur === 'LGS') return KITAPCIK_OGM_TEMA.LGS;
  if (kpssTurMu(tur)) return KITAPCIK_OGM_TEMA.KPSS;
  return KITAPCIK_OGM_TEMA.YKS;
}

export function denemeOrtamSinifi(tur: string): string {
  if (tur === 'LGS') return 'deneme-lgs-ortam';
  if (yksMi(tur) || kpssTurMu(tur)) return 'deneme-yks-ortam';
  return '';
}

export function denemeSayfaFiligranSinifi(tur: string): string {
  if (tur === 'LGS') return 'deneme-lgs-sayfa';
  if (yksMi(tur) || kpssTurMu(tur)) return 'deneme-yks-sayfa';
  return '';
}

/** YKS + LGS + KPSS kitapçığı: sorular iki sütunda (ÖSYM sayfa düzeni) */
export function kitapcikIkiSutunMu(tur: string): boolean {
  return ogmKapakMi(tur);
}

export const KITAPCIK_SAYFA_BASI_SORU = 8;
