export type FiyatKademesi = {
  minAdet: number;
  indirimYuzde: number;
};

export type SinavSepetFiyatAyarlari = {
  aktif: boolean;
  tekDenemeFiyati: number;
  kademeler: FiyatKademesi[];
};

export type KademeliFiyatSonuc = {
  toplam: number;
  listeToplam: number;
  indirim: number;
  kademe?: FiyatKademesi;
  kademeAktif: boolean;
};

function yuvarlaTl(tutar: number): number {
  return Math.round(tutar * 100) / 100;
}

export function kademeliSepetToplamHesapla(
  adet: number,
  listeToplam: number,
  ayarlar: SinavSepetFiyatAyarlari | null | undefined
): KademeliFiyatSonuc {
  const liste = Math.max(0, listeToplam);
  if (adet <= 0) {
    return { toplam: 0, listeToplam: liste, indirim: 0, kademeAktif: false };
  }

  if (!ayarlar?.aktif) {
    return { toplam: liste, listeToplam: liste, indirim: 0, kademeAktif: false };
  }

  const kademeler = [...(ayarlar.kademeler || [])].sort((a, b) => b.minAdet - a.minAdet);
  const uygun = kademeler.find((k) => adet >= k.minAdet);

  if (uygun && uygun.indirimYuzde > 0) {
    const toplam = yuvarlaTl(liste * (1 - uygun.indirimYuzde / 100));
    return {
      toplam,
      listeToplam: liste,
      indirim: Math.max(0, yuvarlaTl(liste - toplam)),
      kademe: uygun,
      kademeAktif: true,
    };
  }

  if (ayarlar.tekDenemeFiyati > 0) {
    const toplam = yuvarlaTl(adet * ayarlar.tekDenemeFiyati);
    return {
      toplam,
      listeToplam: liste,
      indirim: Math.max(0, yuvarlaTl(liste - toplam)),
      kademeAktif: true,
    };
  }

  return { toplam: liste, listeToplam: liste, indirim: 0, kademeAktif: true };
}

export function kademeEtiketi(kademe: FiyatKademesi): string {
  return `${kademe.minAdet}+ deneme → %${kademe.indirimYuzde} indirim`;
}
