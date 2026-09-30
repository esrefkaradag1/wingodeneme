export type Kullanici = {
  id: string;
  email: string;
  rol: string;
  ad?: string;
  soyad?: string;
  avatarUrl?: string | null;
  ogretimTuru?: string;
  kocTipi?: string | null;
};

export type ApiEnvelope<T> = {
  basarili: boolean;
  mesaj?: string;
  veri: T;
};

export type SinavOzet = {
  id: string;
  baslik: string;
  tur?: string;
  sureDakika?: number;
  baslangicZamani?: string;
  bitisZamani?: string;
  durum?: string;
  katilimId?: string;
  katilimDurum?: string;
};

export type PaketOzet = {
  id: string;
  ad: string;
  aciklama?: string | null;
  fiyat?: number | null;
  indirimliFiyat?: number | null;
  disUrl?: string | null;
  kapakUrl?: string | null;
  sinavSayisi?: number;
};

export type Soru = {
  id: string;
  siraNo: number;
  metinHtml?: string;
  gorselUrl?: string | null;
  secenekler: Record<string, string>;
  zorluk?: string;
  konu?: { ad?: string; ders?: string };
};

export type KatilimCevap = {
  soruId: string;
  secilen: string | null;
  sureMs?: number;
};
