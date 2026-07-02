'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { 
  CreditCard, Plus, Loader2, Edit2, Trash2, 
  Check, X, Star, ShoppingBag, ClipboardList, Users, Tag, Layers, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from '@/store/toast.store';
import { confirmAsk } from '@/store/confirm-dialog.store';
import {
  kademeliSepetToplamHesapla,
  type SinavSepetFiyatAyarlari,
} from '@/lib/sinavFiyatKademe';
import {
  kategoriHaritasi,
  paketKategoriEtiket,
  paketKategoriRenk,
  slugOnizle,
  VARSAYILAN_KATEGORI_RENKLERI,
  type PaketKategoriKayit,
} from '@/lib/paketKategori';
import {
  altGrupListesi,
  grupIddenSecim,
  grupIdIcinEtiket,
  ustGrupListesi,
  type GrupSecim,
} from '@/lib/grupSinavSecim';

interface Paket {
  id: string;
  ad: string;
  aciklama: string | null;
  kategori?: string;
  fiyat: number;
  indirimliFiyat: number | null;
  sinavSayisi: number;
  ozellikler: string[] | null;
  aktif: boolean;
  populer: boolean;
  oneCikan: boolean;
  etiketler: string[] | null;
  disUrl: string | null;
  sinavIds?: string[];
  grupIds?: string[];
}

interface SinavOzet {
  id: string;
  baslik: string;
  tur?: string;
  baslangicZamani?: string;
  ucret?: number | null;
  indirimliUcret?: number | null;
  satinAlinabilir?: boolean;
  takvimdeGoster?: boolean;
  grup?: { id?: string; ad: string };
}

function sinavGosterilenFiyat(s: SinavOzet): number | null {
  if (s.indirimliUcret != null && s.indirimliUcret > 0) return s.indirimliUcret;
  if (s.ucret != null && s.ucret > 0) return s.ucret;
  return null;
}

interface GrupOzet extends GrupSecim {
  tur?: string;
}

function grupIdleriniGenisletClient(grupIds: string[], gruplar: GrupOzet[]): Set<string> {
  const set = new Set(grupIds.filter(Boolean));
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const g of gruplar) {
      if (g.parentId && set.has(g.parentId) && !set.has(g.id)) {
        set.add(g.id);
        degisti = true;
      }
    }
  }
  return set;
}

export default function PaketYonetimiSayfasi() {
  const [modalAcik, setModalAcik] = useState(false);
  const [denemeFiltre, setDenemeFiltre] = useState<'TAKVIM' | 'TUMU'>('TAKVIM');
  const [duzenlenenPaket, setDuzenlenenPaket] = useState<Paket | null>(null);
  const [kategoriFiltre, setKategoriFiltre] = useState<string | 'TUMU'>('TUMU');
  const [kategoriPanelAcik, setKategoriPanelAcik] = useState(true);
  const [kademePanelAcik, setKademePanelAcik] = useState(true);
  const [duzenlenenKategoriId, setDuzenlenenKategoriId] = useState<string | null>(null);
  const [kategoriForm, setKategoriForm] = useState({
    ad: '',
    slug: '',
    sira: 0,
    renk: VARSAYILAN_KATEGORI_RENKLERI[0].renk,
  });
  const [form, setForm] = useState({
    ad: '',
    aciklama: '',
    kategori: 'GENEL',
    fiyat: 0,
    indirimliFiyat: '',
    sinavSayisi: 0,
    aktif: true,
    populer: false,
    ozellik: '',
    ozellikler: [] as string[],
    etiketler: [] as string[],
    etiket: '',
    disUrl: '',
    oneCikan: false,
    sinavIds: [] as string[],
    grupIds: [] as string[],
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-paketler'],
    queryFn: () => adminApi.paketler(),
  });

  const { data: kategorilerData, refetch: kategorileriYenile } = useQuery({
    queryKey: ['admin-paket-kategorileri'],
    queryFn: () => adminApi.paketKategorileri(),
  });

  const { data: fiyatKademeData, refetch: fiyatKademeleriYenile } = useQuery({
    queryKey: ['admin-sinav-fiyat-kademeleri'],
    queryFn: () => adminApi.sinavFiyatKademeleri(),
  });

  const [kademeForm, setKademeForm] = useState<SinavSepetFiyatAyarlari>({
    aktif: false,
    tekDenemeFiyati: 0,
    kademeler: [],
  });

  useEffect(() => {
    const veri = fiyatKademeData?.data?.veri as SinavSepetFiyatAyarlari | undefined;
    if (veri) {
      setKademeForm({
        aktif: veri.aktif === true,
        tekDenemeFiyati: Number(veri.tekDenemeFiyati) || 0,
        kademeler: Array.isArray(veri.kademeler)
          ? veri.kademeler.map((k) => ({
              minAdet: k.minAdet,
              indirimYuzde: k.indirimYuzde ?? 0,
            }))
          : [],
      });
    }
  }, [fiyatKademeData?.data?.veri]);

  const kategoriler: PaketKategoriKayit[] = kategorilerData?.data?.veri || [];
  const kategoriHarita = useMemo(() => kategoriHaritasi(kategoriler), [kategoriler]);
  const varsayilanKategoriSlug = kategoriler.find((k) => k.slug === 'GENEL')?.slug
    || kategoriler.find((k) => k.aktif !== false)?.slug
    || 'GENEL';

  const { data: sinavlarRes } = useQuery({
    queryKey: ['admin-sinavlar-paket-form'],
    queryFn: () => adminApi.sinavlar(),
    enabled: modalAcik,
  });

  const { data: gruplarRes } = useQuery({
    queryKey: ['admin-gruplar-paket-form'],
    queryFn: () => adminApi.gruplar(),
    enabled: modalAcik,
  });

  const paketler: Paket[] = data?.data?.veri || [];
  const filtreliPaketler = useMemo(() => {
    if (kategoriFiltre === 'TUMU') return paketler;
    return paketler.filter((p) => (p.kategori || 'GENEL') === kategoriFiltre);
  }, [paketler, kategoriFiltre]);

  const kategoriSayilari = useMemo(() => {
    const say: Record<string, number> = {};
    for (const p of paketler) {
      const k = p.kategori || 'GENEL';
      say[k] = (say[k] || 0) + 1;
    }
    return say;
  }, [paketler]);

  const kategoriOlusturMutation = useMutation({
    mutationFn: () =>
      adminApi.paketKategoriOlustur({
        ad: kategoriForm.ad.trim(),
        slug: kategoriForm.slug.trim() || slugOnizle(kategoriForm.ad),
        sira: kategoriForm.sira,
        renk: kategoriForm.renk,
      }),
    onSuccess: () => {
      toast.basarili('Kategori eklendi');
      setKategoriForm({ ad: '', slug: '', sira: kategoriler.length + 1, renk: VARSAYILAN_KATEGORI_RENKLERI[0].renk });
      kategorileriYenile();
    },
    onError: (e: { response?: { data?: { mesaj?: string } } }) =>
      toast.hata(e?.response?.data?.mesaj || 'Kategori eklenemedi'),
  });

  const kategoriGuncelleMutation = useMutation({
    mutationFn: ({ id, veri }: { id: string; veri: Record<string, unknown> }) =>
      adminApi.paketKategoriGuncelle(id, veri),
    onSuccess: () => {
      toast.basarili('Kategori güncellendi');
      setDuzenlenenKategoriId(null);
      kategorileriYenile();
    },
    onError: (e: { response?: { data?: { mesaj?: string } } }) =>
      toast.hata(e?.response?.data?.mesaj || 'Güncelleme başarısız'),
  });

  const kategoriSilMutation = useMutation({
    mutationFn: (id: string) => adminApi.paketKategoriSil(id),
    onSuccess: () => {
      toast.basarili('Kategori silindi');
      kategorileriYenile();
      refetch();
    },
    onError: (e: { response?: { data?: { mesaj?: string } } }) =>
      toast.hata(e?.response?.data?.mesaj || 'Silinemedi'),
  });

  const kademeKaydetMutation = useMutation({
    mutationFn: () =>
      adminApi.sinavFiyatKademeleriKaydet({
        aktif: kademeForm.aktif,
        tekDenemeFiyati: kademeForm.tekDenemeFiyati,
        kademeler: kademeForm.kademeler,
      }),
    onSuccess: () => {
      toast.basarili('Kademeli fiyatlandırma kaydedildi');
      fiyatKademeleriYenile();
    },
    onError: (e: { response?: { data?: { mesaj?: string } } }) =>
      toast.hata(e?.response?.data?.mesaj || 'Kaydedilemedi'),
  });

  const kademeOnizleme = useMemo(() => {
    const ornekAdetler = [1, 2, 3, 5, 6, 10, 12];
    return ornekAdetler.map((adet) => {
      const liste = adet * (kademeForm.tekDenemeFiyati || 74.9);
      return { adet, ...kademeliSepetToplamHesapla(adet, liste, kademeForm) };
    });
  }, [kademeForm]);
  const sinavlarListe: SinavOzet[] = sinavlarRes?.data?.veri || [];
  const gruplarListe: GrupOzet[] = gruplarRes?.data?.veri || [];

  useEffect(() => {
    if (!modalAcik || !duzenlenenPaket || form.grupIds.length > 0 || !gruplarListe.length) return;
    const slug = (duzenlenenPaket.kategori || '').toUpperCase();
    if (!slug || slug === 'GENEL') return;
    const ust = ustGrupListesi(gruplarListe).find(
      (g) => slugOnizle(g.ad) === slug || g.ad.trim().toLocaleUpperCase('tr-TR') === slug
    );
    if (ust) {
      setForm((f) => ({ ...f, grupIds: [ust.id], kategori: slugOnizle(ust.ad) }));
    }
  }, [modalAcik, duzenlenenPaket, gruplarListe, form.grupIds.length]);

  const seciliGrupSecim = useMemo(() => {
    const gid = form.grupIds[0] || '';
    if (!gid || !gruplarListe.length) return { ustGrupId: '', altGrupId: '' };
    return grupIddenSecim(gid, gruplarListe);
  }, [form.grupIds, gruplarListe]);

  const genisletilmisGrupSet = useMemo(() => {
    if (!form.grupIds.length || !gruplarListe.length) return null;
    return grupIdleriniGenisletClient(form.grupIds, gruplarListe);
  }, [form.grupIds, gruplarListe]);

  const gosterilecekSinavlar = useMemo(() => {
    let liste =
      denemeFiltre === 'TAKVIM'
        ? sinavlarListe.filter((s) => s.takvimdeGoster && s.satinAlinabilir)
        : sinavlarListe;
    if (genisletilmisGrupSet) {
      liste = liste.filter((s) => s.grup?.id && genisletilmisGrupSet.has(s.grup.id));
    }
    return [...liste].sort((a, b) => {
      const ta = a.baslangicZamani ? new Date(a.baslangicZamani).getTime() : 0;
      const tb = b.baslangicZamani ? new Date(b.baslangicZamani).getTime() : 0;
      return ta - tb;
    });
  }, [sinavlarListe, denemeFiltre, genisletilmisGrupSet]);

  const seciliSinavlar = useMemo(
    () => sinavlarListe.filter((s) => form.sinavIds.includes(s.id)),
    [sinavlarListe, form.sinavIds]
  );

  const seciliListeToplam = useMemo(
    () => seciliSinavlar.reduce((t, s) => t + (sinavGosterilenFiyat(s) ?? 0), 0),
    [seciliSinavlar]
  );

  const seciliKademeFiyat = useMemo(
    () =>
      kademeliSepetToplamHesapla(
        seciliSinavlar.length,
        seciliListeToplam,
        kademeForm.aktif ? kademeForm : null
      ),
    [seciliSinavlar.length, seciliListeToplam, kademeForm]
  );

  const kaydetMutation = useMutation({
    mutationFn: (veri: any) => 
      duzenlenenPaket 
        ? adminApi.paketGuncelle(duzenlenenPaket.id, veri)
        : adminApi.paketOlustur(veri),
    onSuccess: () => {
      toast.basarili(duzenlenenPaket ? 'Paket güncellendi' : 'Paket oluşturuldu');
      setModalAcik(false);
      setDuzenlenenPaket(null);
      refetch();
    },
    onError: () => toast.hata('İşlem başarısız'),
  });

  const silMutation = useMutation({
    mutationFn: (id: string) => adminApi.paketSil(id),
    onSuccess: () => {
      toast.basarili('Paket silindi');
      refetch();
    },
  });

  const modalAc = (paket?: Paket) => {
    if (paket) {
      setDuzenlenenPaket(paket);
      setForm({
        ad: paket.ad,
        aciklama: paket.aciklama || '',
        kategori: (paket.kategori || varsayilanKategoriSlug) as string,
        fiyat: paket.fiyat,
        indirimliFiyat: paket.indirimliFiyat?.toString() || '',
        sinavSayisi: paket.sinavSayisi,
        aktif: paket.aktif,
        populer: paket.populer,
        ozellik: '',
        ozellikler: Array.isArray(paket.ozellikler) ? paket.ozellikler : [],
        etiketler: Array.isArray(paket.etiketler) ? paket.etiketler : [],
        etiket: '',
        disUrl: paket.disUrl || '',
        oneCikan: paket.oneCikan || false,
        sinavIds: Array.isArray(paket.sinavIds) ? [...paket.sinavIds] : [],
        grupIds: Array.isArray(paket.grupIds) ? [...paket.grupIds] : [],
      });
    } else {
      setDuzenlenenPaket(null);
      setForm({
        ad: '',
        aciklama: '',
        kategori: varsayilanKategoriSlug,
        fiyat: 0,
        indirimliFiyat: '',
        sinavSayisi: 0,
        aktif: true,
        populer: false,
        ozellik: '',
        ozellikler: [],
        etiketler: [],
        etiket: '',
        disUrl: '',
        oneCikan: false,
        sinavIds: [],
        grupIds: [],
      });
    }
    setModalAcik(true);
  };

  const ozellikEkle = () => {
    if (form.ozellik.trim()) {
      setForm({
        ...form,
        ozellikler: [...form.ozellikler, form.ozellik.trim()],
        ozellik: '',
      });
    }
  };

  const ozellikSil = (index: number) => {
    setForm({
      ...form,
      ozellikler: form.ozellikler.filter((_, i) => i !== index),
    });
  };

  const etiketEkle = () => {
    if (form.etiket.trim()) {
      setForm({
        ...form,
        etiketler: [...form.etiketler, form.etiket.trim().toLowerCase()],
        etiket: '',
      });
    }
  };

  const etiketSil = (index: number) => {
    setForm({
      ...form,
      etiketler: form.etiketler.filter((_, i) => i !== index),
    });
  };

  const sinavSecimiToggle = (id: string) => {
    setForm((f) => {
      const sinavIds = f.sinavIds.includes(id)
        ? f.sinavIds.filter((x) => x !== id)
        : [...f.sinavIds, id];
      return {
        ...f,
        sinavIds,
        sinavSayisi: sinavIds.length > 0 ? sinavIds.length : f.sinavSayisi,
      };
    });
  };

  const fiyatlariTakvimdenDoldur = (kademeli = false) => {
    if (seciliSinavlar.length === 0) {
      toast.uyari('Önce pakete dahil denemeleri seçin');
      return;
    }
    if (seciliListeToplam <= 0) {
      toast.uyari('Seçili denemelerde fiyat tanımlı değil. Sınav takviminden ücret girin.');
      return;
    }
    if (kademeli && kademeForm.aktif && seciliKademeFiyat.indirim > 0) {
      setForm((f) => ({
        ...f,
        fiyat: seciliListeToplam,
        indirimliFiyat: String(seciliKademeFiyat.toplam),
        sinavSayisi: seciliSinavlar.length,
      }));
      toast.basarili('Kademeli paket fiyatı uygulandı');
    } else {
      setForm((f) => ({
        ...f,
        fiyat: seciliListeToplam,
        indirimliFiyat: '',
        sinavSayisi: seciliSinavlar.length,
      }));
      toast.basarili('Takvim fiyatları pakete aktarıldı');
    }
  };

  const ustGrupDegistir = (ustGrupId: string) => {
    const ust = gruplarListe.find((g) => g.id === ustGrupId);
    const altlar = altGrupListesi(gruplarListe, ustGrupId);
    const altGrupId = altlar.length === 1 ? altlar[0].id : '';
    const grupId = altGrupId || ustGrupId;
    setForm((f) => ({
      ...f,
      grupIds: grupId ? [grupId] : [],
      kategori: ust ? slugOnizle(ust.ad) : varsayilanKategoriSlug,
      sinavIds: [],
    }));
  };

  const altGrupDegistir = (altGrupId: string) => {
    const ust = gruplarListe.find((g) => g.id === seciliGrupSecim.ustGrupId);
    const grupId = altGrupId || seciliGrupSecim.ustGrupId;
    setForm((f) => ({
      ...f,
      grupIds: grupId ? [grupId] : [],
      kategori: ust ? slugOnizle(ust.ad) : f.kategori,
      sinavIds: [],
    }));
  };

  const paketKayitPayload = () => ({
    ad: form.ad,
    aciklama: form.aciklama,
    kategori: form.kategori,
    fiyat: form.fiyat,
    indirimliFiyat: form.indirimliFiyat === '' ? null : form.indirimliFiyat,
    sinavSayisi: form.sinavSayisi,
    ozellikler: form.ozellikler,
    etiketler: form.etiketler,
    disUrl: form.disUrl,
    oneCikan: form.oneCikan,
    aktif: form.aktif,
    populer: form.populer,
    sinavIds: form.sinavIds,
    grupIds: form.grupIds,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paket Yönetimi</h1>
          <p className="text-gray-500 mt-1">Öğrencilere sunulan deneme sınavı paketleri</p>
        </div>
        <button onClick={() => modalAc()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Paket Ekle
        </button>
      </div>

      {/* Kategori filtreleri */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKategoriFiltre('TUMU')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            kategoriFiltre === 'TUMU'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
          }`}
        >
          Tümü ({paketler.length})
        </button>
        {kategoriler.filter((k) => k.aktif !== false && (kategoriSayilari[k.slug] || 0) > 0).map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKategoriFiltre(k.slug)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              kategoriFiltre === k.slug
                ? 'bg-indigo-600 text-white border-indigo-600'
                : `${paketKategoriRenk(k.slug, kategoriHarita)} hover:opacity-90`
            }`}
          >
            {k.ad} ({kategoriSayilari[k.slug]})
          </button>
        ))}
      </div>

      {/* Kategori yönetimi */}
      <div className="card border border-indigo-100">
        <button
          type="button"
          onClick={() => setKategoriPanelAcik((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-gray-900">Paket Kategorileri</h2>
              <p className="text-xs text-gray-500">Market ve ana sayfada görünen kategori etiketleri</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600">{kategoriPanelAcik ? 'Gizle' : 'Göster'}</span>
        </button>

        {kategoriPanelAcik && (
          <div className="mt-6 space-y-6 border-t border-gray-100 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori adı</label>
                <input
                  value={kategoriForm.ad}
                  onChange={(e) =>
                    setKategoriForm({
                      ...kategoriForm,
                      ad: e.target.value,
                      slug: duzenlenenKategoriId ? kategoriForm.slug : slugOnizle(e.target.value),
                    })
                  }
                  className="input-field"
                  placeholder="Örn: TYT Denemeleri"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug (kod)</label>
                <input
                  value={kategoriForm.slug}
                  onChange={(e) => setKategoriForm({ ...kategoriForm, slug: e.target.value.toUpperCase() })}
                  className="input-field font-mono text-sm"
                  placeholder="TYT"
                  disabled={!!duzenlenenKategoriId}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Renk</label>
                <select
                  value={kategoriForm.renk}
                  onChange={(e) => setKategoriForm({ ...kategoriForm, renk: e.target.value })}
                  className="input-field"
                >
                  {VARSAYILAN_KATEGORI_RENKLERI.map((r) => (
                    <option key={r.id} value={r.renk}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                {duzenlenenKategoriId ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        kategoriGuncelleMutation.mutate({
                          id: duzenlenenKategoriId,
                          veri: {
                            ad: kategoriForm.ad.trim(),
                            sira: kategoriForm.sira,
                            renk: kategoriForm.renk,
                          },
                        })
                      }
                      className="btn-primary flex-1"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDuzenlenenKategoriId(null);
                        setKategoriForm({ ad: '', slug: '', sira: kategoriler.length + 1, renk: VARSAYILAN_KATEGORI_RENKLERI[0].renk });
                      }}
                      className="btn-secondary px-3"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => kategoriOlusturMutation.mutate()}
                    disabled={!kategoriForm.ad.trim() || kategoriOlusturMutation.isPending}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {kategoriOlusturMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Kategori Ekle
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100">
                    <th className="pb-2 pr-4">Kategori</th>
                    <th className="pb-2 pr-4">Slug</th>
                    <th className="pb-2 pr-4">Paket</th>
                    <th className="pb-2 pr-4">Durum</th>
                    <th className="pb-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {kategoriler.map((k) => (
                    <tr key={k.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${paketKategoriRenk(k.slug, kategoriHarita)}`}>
                          {k.ad}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{k.slug}</td>
                      <td className="py-3 pr-4 text-gray-600">{k._count?.paketler ?? kategoriSayilari[k.slug] ?? 0}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium ${k.aktif !== false ? 'text-green-600' : 'text-gray-400'}`}>
                          {k.aktif !== false ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDuzenlenenKategoriId(k.id);
                              setKategoriForm({
                                ad: k.ad,
                                slug: k.slug,
                                sira: k.sira,
                                renk: k.renk || VARSAYILAN_KATEGORI_RENKLERI[0].renk,
                              });
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {k.slug !== 'GENEL' && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  await confirmAsk({
                                    title: 'Kategoriyi sil',
                                    message: `"${k.ad}" kategorisi silinsin mi?`,
                                    variant: 'destructive',
                                    onayMetni: 'Sil',
                                  })
                                ) {
                                  kategoriSilMutation.mutate(k.id);
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Kademeli deneme fiyatlandırma */}
      <div className="card border border-emerald-100">
        <button
          type="button"
          onClick={() => setKademePanelAcik((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-gray-900">Deneme Kademeli Fiyatlandırma</h2>
              <p className="text-xs text-gray-500">
                Takvim sepetinde birden fazla deneme alındığında liste fiyatına yüzde indirim uygulanır
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600">{kademePanelAcik ? 'Gizle' : 'Göster'}</span>
        </button>

        {kademePanelAcik && (
          <div className="mt-6 space-y-5 border-t border-gray-100 pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={kademeForm.aktif}
                onChange={(e) => setKademeForm((f) => ({ ...f, aktif: e.target.checked }))}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-gray-800">Kademeli fiyatlandırmayı aktif et</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tek deneme fiyatı (₺)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={kademeForm.tekDenemeFiyati || ''}
                  onChange={(e) =>
                    setKademeForm((f) => ({ ...f, tekDenemeFiyati: parseFloat(e.target.value) || 0 }))
                  }
                  className="input-field"
                  placeholder="74.9"
                />
                <p className="text-xs text-gray-500 mt-1">Kademe eşleşmezse adet × bu fiyat uygulanır.</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-500 uppercase">Toplu alım indirim kademeleri</label>
                <button
                  type="button"
                  onClick={() =>
                    setKademeForm((f) => ({
                      ...f,
                      kademeler: [
                        ...f.kademeler,
                        {
                          minAdet: f.kademeler.length ? f.kademeler[f.kademeler.length - 1].minAdet + 3 : 3,
                          indirimYuzde: f.kademeler.length ? Math.min(100, (f.kademeler[f.kademeler.length - 1].indirimYuzde || 0) + 5) : 10,
                        },
                      ],
                    }))
                  }
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Kademe Ekle
                </button>
              </div>

              {kademeForm.kademeler.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-xl">
                  Örn: 3 deneme ve üzeri → %10, 6 deneme ve üzeri → %15, 12 deneme ve üzeri → %25 indirim
                </p>
              ) : (
                <div className="space-y-2">
                  {kademeForm.kademeler.map((k, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 whitespace-nowrap">Min. adet</span>
                        <input
                          type="number"
                          min={1}
                          value={k.minAdet}
                          onChange={(e) => {
                            const minAdet = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setKademeForm((f) => ({
                              ...f,
                              kademeler: f.kademeler.map((row, i) => (i === idx ? { ...row, minAdet } : row)),
                            }));
                          }}
                          className="input-field w-20 py-2"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                        <span className="text-sm text-gray-600 whitespace-nowrap">İndirim (%)</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={k.indirimYuzde || ''}
                          onChange={(e) => {
                            const indirimYuzde = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                            setKademeForm((f) => ({
                              ...f,
                              kademeler: f.kademeler.map((row, i) => (i === idx ? { ...row, indirimYuzde } : row)),
                            }));
                          }}
                          className="input-field flex-1 py-2"
                          placeholder="10"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setKademeForm((f) => ({
                            ...f,
                            kademeler: f.kademeler.filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {kademeForm.aktif && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase mb-2">Önizleme</p>
                <div className="flex flex-wrap gap-3">
                  {kademeOnizleme.map(({ adet, toplam, indirim, kademe }) => (
                    <div key={adet} className="text-sm bg-white rounded-lg px-3 py-2 border border-emerald-100">
                      <span className="font-bold text-gray-900">{adet} deneme:</span>{' '}
                      <span className="text-emerald-700 font-black">{toplam.toLocaleString('tr-TR')} ₺</span>
                      {kademe && (
                        <span className="text-xs text-emerald-600 font-semibold ml-1">
                          (%{kademe.indirimYuzde} indirim)
                        </span>
                      )}
                      {indirim > 0 && (
                        <span className="text-xs text-gray-400 line-through ml-1">
                          {(adet * (kademeForm.tekDenemeFiyati || 74.9)).toLocaleString('tr-TR')} ₺
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => kademeKaydetMutation.mutate()}
              disabled={kademeKaydetMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {kademeKaydetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Kademeli Fiyatları Kaydet
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtreliPaketler.map((paket) => (
            <div key={paket.id} className={`card border-2 transition-all ${paket.populer ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-transparent'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${paketKategoriRenk(paket.kategori, kategoriHarita)}`}>
                      <Tag className="w-3 h-3" />
                      {paketKategoriEtiket(paket.kategori, kategoriHarita)}
                    </span>
                    {paket.populer && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                        <Star className="w-3 h-3 fill-current" /> En Popüler
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{paket.ad}</h3>
                  <p className="text-sm text-gray-500 mt-1">{paket.aciklama}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => modalAc(paket)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        await confirmAsk({
                          title: 'Paketi sil',
                          message: 'Bu paketi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
                          variant: 'destructive',
                          onayMetni: 'Sil',
                          iptalMetni: 'İptal',
                        })
                      ) {
                        silMutation.mutate(paket.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {paket.indirimliFiyat || paket.fiyat} ₺
                  </span>
                  {paket.indirimliFiyat && (
                    <span className="text-sm text-gray-400 line-through">{paket.fiyat} ₺</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {paket.sinavSayisi === 0 ? 'Sınırsız Sınav' : `${paket.sinavSayisi} Adet Sınav`}
                </p>
                {((paket.sinavIds?.length ?? 0) > 0 || (paket.grupIds?.length ?? 0) > 0) && (
                  <p className="text-xs text-indigo-600/80 mt-1">
                    {(paket.sinavIds?.length ?? 0) > 0 && `${paket.sinavIds?.length} deneme`}
                    {(paket.sinavIds?.length ?? 0) > 0 && (paket.grupIds?.length ?? 0) > 0 && ' · '}
                    {(paket.grupIds?.length ?? 0) > 0 && `${paket.grupIds?.length} grup`}
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
                {Array.isArray(paket.ozellikler) && paket.ozellikler.map((ozellik, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 shrink-0" /> {ozellik}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${paket.aktif ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-gray-500">{paket.aktif ? 'Aktif' : 'Pasif'}</span>
                </div>
                <div className="text-xs text-gray-400">
                  <ShoppingBag className="w-3 h-3 inline mr-1" /> 0 Satış
                </div>
              </div>
            </div>
          ))}

          {filtreliPaketler.length === 0 && (
            <div className="col-span-full card py-12 text-center text-gray-400 italic">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Henüz tanımlanmış bir paket bulunmuyor.</p>
              {kategoriFiltre !== 'TUMU' && paketler.length > 0 && (
                <button type="button" onClick={() => setKategoriFiltre('TUMU')} className="mt-3 text-indigo-600 text-sm font-medium">
                  Tüm paketleri göster
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalAcik(false)} />
          <div className="card w-full max-w-lg relative z-10 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {duzenlenenPaket ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket Adı</label>
                <input 
                  type="text" 
                  value={form.ad}
                  onChange={e => setForm({...form, ad: e.target.value})}
                  className="input-field" 
                  placeholder="Örn: VIP Başlangıç Paketi" 
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Üst Grup (Kategori)</label>
                  <select
                    value={seciliGrupSecim.ustGrupId}
                    onChange={(e) => ustGrupDegistir(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Grup seçin…</option>
                    {ustGrupListesi(gruplarListe).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.ad}
                      </option>
                    ))}
                  </select>
                </div>
                {seciliGrupSecim.ustGrupId && altGrupListesi(gruplarListe, seciliGrupSecim.ustGrupId).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alt Grup</label>
                    <select
                      value={seciliGrupSecim.altGrupId}
                      onChange={(e) => altGrupDegistir(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Tüm alt gruplar (üst grup)</option>
                      {altGrupListesi(gruplarListe, seciliGrupSecim.ustGrupId).map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.ad}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Paket detay sayfasında seçilen gruba ait sınav takvimindeki denemeler otomatik listelenir.
                  {form.grupIds[0] && gruplarListe.length > 0 && (
                    <span className="block mt-1 text-indigo-700 font-medium">
                      Seçili: {grupIdIcinEtiket(form.grupIds[0], gruplarListe)}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea 
                  value={form.aciklama}
                  onChange={e => setForm({...form, aciklama: e.target.value})}
                  className="input-field" 
                  rows={2}
                  placeholder="Paketin kısa özeti..." 
                />
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-950 space-y-2">
                <p className="font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Takvim denemeleri nasıl satılır?
                </p>
                <ul className="text-xs space-y-1.5 text-indigo-900/90 list-disc pl-4">
                  <li><strong>Tek tek:</strong> Öğrenci <em>/takvim</em> sayfasından sepete ekler (sınav takvimindeki fiyat + kademeli indirim).</li>
                  <li><strong>Paket:</strong> Burada seçtiğiniz denemeleri markette toplu satarsınız; ödeme sonrası tüm denemelere erişim açılır.</li>
                  <li>Fiyatları sınav takviminden otomatik çekmek için denemeleri seçip aşağıdaki butonları kullanın.</li>
                </ul>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    Pakete dahil denemeler
                  </label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDenemeFiltre('TAKVIM')}
                      className={`px-3 py-1.5 ${denemeFiltre === 'TAKVIM' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
                    >
                      Takvimde satılan
                    </button>
                    <button
                      type="button"
                      onClick={() => setDenemeFiltre('TUMU')}
                      className={`px-3 py-1.5 ${denemeFiltre === 'TUMU' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
                    >
                      Tümü
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {form.grupIds.length > 0
                    ? 'Seçili gruba ait takvim denemeleri. Boş bırakırsanız grubun tüm takvim denemeleri otomatik gelir.'
                    : 'Önce üst grup seçin; denemeler gruba göre filtrelenir.'}
                </p>
                {!sinavlarRes && modalAcik ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Denemeler yükleniyor…
                  </div>
                ) : gosterilecekSinavlar.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">
                    {denemeFiltre === 'TAKVIM'
                      ? 'Takvimde satışa açık deneme yok. Önce sınav takviminden fiyat ve «Satın alınabilir» ayarlayın.'
                      : 'Henüz tanımlı sınav yok.'}
                  </p>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {gosterilecekSinavlar.map((s) => {
                      const fiyat = sinavGosterilenFiyat(s);
                      return (
                        <label
                          key={s.id}
                          className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.sinavIds.includes(s.id)}
                            onChange={() => sinavSecimiToggle(s.id)}
                            className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300"
                          />
                          <span className="flex-1 min-w-0 text-sm text-gray-800">
                            <span className="font-medium block">{s.baslik}</span>
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                              {s.grup?.ad && <span>{s.grup.ad}</span>}
                              {s.baslangicZamani && (
                                <span>
                                  {format(new Date(s.baslangicZamani), 'd MMM yyyy', { locale: tr })}
                                </span>
                              )}
                              {s.takvimdeGoster && s.satinAlinabilir && (
                                <span className="text-indigo-600 font-semibold">Takvimde</span>
                              )}
                            </span>
                          </span>
                          <span className="text-sm font-black text-emerald-700 shrink-0">
                            {fiyat != null ? `${fiyat.toLocaleString('tr-TR')} ₺` : '—'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {form.sinavIds.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {form.sinavIds.length} deneme seçili
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Takvim liste fiyatı:{' '}
                        <strong>{seciliListeToplam.toLocaleString('tr-TR')} ₺</strong>
                        {kademeForm.aktif && seciliKademeFiyat.indirim > 0 && (
                          <>
                            {' '}→ Kademeli:{' '}
                            <strong className="text-emerald-700">
                              {seciliKademeFiyat.toplam.toLocaleString('tr-TR')} ₺
                            </strong>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fiyatlariTakvimdenDoldur(false)}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                      >
                        Liste fiyatından doldur
                      </button>
                      {kademeForm.aktif && seciliKademeFiyat.indirim > 0 && (
                        <button
                          type="button"
                          onClick={() => fiyatlariTakvimdenDoldur(true)}
                          className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Kademeli paket fiyatı
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Normal Fiyat (₺)</label>
                  <input 
                    type="number" 
                    value={form.fiyat}
                    onChange={e => setForm({...form, fiyat: parseFloat(e.target.value) || 0})}
                    className="input-field" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İndirimli Fiyat (₺)</label>
                  <input 
                    type="number" 
                    value={form.indirimliFiyat}
                    onChange={e => setForm({...form, indirimliFiyat: e.target.value})}
                    className="input-field" 
                    placeholder="Opsiyonel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sınav Sayısı (0=Sınırsız)</label>
                <input 
                  type="number" 
                  value={form.sinavSayisi}
                  onChange={e => setForm({...form, sinavSayisi: parseInt(e.target.value) || 0})}
                  className="input-field" 
                />
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-xs text-violet-900">
                <p className="font-bold flex items-center gap-2 mb-1">
                  <Users className="w-3.5 h-3.5" /> Grup → Takvim bağlantısı
                </p>
                <p>
                  Deneme seçmeden kaydederseniz paket detayında o gruba ait takvimdeki tüm denemeler (Temmuz dahil) otomatik görünür.
                  Belirli denemeleri sabitlemek için yukarıdan işaretleyin.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Özellikler</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={form.ozellik}
                    onChange={e => setForm({...form, ozellik: e.target.value})}
                    onKeyPress={e => e.key === 'Enter' && ozellikEkle()}
                    className="input-field" 
                    placeholder="Yeni özellik ekle..." 
                  />
                  <button onClick={ozellikEkle} className="btn-secondary px-4">Ekle</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.ozellikler.map((oz, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-xs text-gray-700 border border-gray-200">
                      {oz}
                      <button onClick={() => ozellikSil(i)} className="text-gray-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dış Bağlantı (WingoLink URL)</label>
                <input 
                  type="text" 
                  value={form.disUrl}
                  onChange={e => setForm({...form, disUrl: e.target.value})}
                  className="input-field" 
                  placeholder="https://wingolink.com.tr/..." 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arama Etiketleri (Öneri Eşleşmesi İçin)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={form.etiket}
                    onChange={e => setForm({...form, etiket: e.target.value})}
                    onKeyPress={e => e.key === 'Enter' && etiketEkle()}
                    className="input-field" 
                    placeholder="Örn: türev, matematik" 
                  />
                  <button onClick={etiketEkle} className="btn-secondary px-4">Ekle</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.etiketler.map((et, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-xs text-indigo-700 border border-indigo-100">
                      {et}
                      <button onClick={() => etiketSil(i)} className="text-indigo-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.aktif}
                    onChange={e => setForm({...form, aktif: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                  />
                  <span className="text-sm font-medium text-gray-700">Satışa Açık</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.populer}
                    onChange={e => setForm({...form, populer: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                  />
                  <span className="text-sm font-medium text-gray-700">Popüler Etiketi</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.oneCikan}
                    onChange={e => setForm({...form, oneCikan: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                  />
                  <span className="text-sm font-medium text-gray-700">Dashboard Öne Çıkar</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalAcik(false)} className="btn-secondary flex-1">İptal</button>
                <button 
                  type="button"
                  onClick={() => kaydetMutation.mutate(paketKayitPayload())} 
                  disabled={kaydetMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {kaydetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
