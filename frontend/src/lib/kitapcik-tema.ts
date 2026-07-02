/** YKS (pembe/kırmızı) ve LGS (mavi) kitapçık üst şerit renkleri */
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
} as const;

export function yksMi(tur: string): boolean {
  return tur === 'TYT' || tur === 'AYT' || tur === 'AYT_TYT';
}

/** Wingo OGM tarzı kapak + iç sayfa şeridi (YKS ve LGS) */
export function ogmKapakMi(tur: string): boolean {
  return yksMi(tur) || tur === 'LGS';
}

export function kitapcikOgmTema(tur: string) {
  if (tur === 'LGS') return KITAPCIK_OGM_TEMA.LGS;
  return KITAPCIK_OGM_TEMA.YKS;
}

export function denemeOrtamSinifi(tur: string): string {
  if (tur === 'LGS') return 'deneme-lgs-ortam';
  if (yksMi(tur)) return 'deneme-yks-ortam';
  return '';
}

export function denemeSayfaFiligranSinifi(tur: string): string {
  if (tur === 'LGS') return 'deneme-lgs-sayfa';
  if (yksMi(tur)) return 'deneme-yks-sayfa';
  return '';
}

/** YKS + LGS kitapçığı: sorular iki sütunda (ÖSYM sayfa düzeni) */
export function kitapcikIkiSutunMu(tur: string): boolean {
  return ogmKapakMi(tur);
}

export const KITAPCIK_SAYFA_BASI_SORU = 8;
