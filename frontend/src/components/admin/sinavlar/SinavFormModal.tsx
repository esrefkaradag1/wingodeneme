'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, soruApi } from '@/lib/api';
import { datetimeLocalEkleDakika, isoToDatetimeLocal } from '@/lib/tarih';
import {
  bosLgsOturumlari,
  bosKpssOturumlari,
  oturumlarApiToForm,
  lgsOturumlariSenkronize,
  kpssOturumlariSenkronize,
  oturumlardanUstZaman,
  oturumlarApiGovdesi,
  LGS_OTURUM_ARA_DK,
  KPSS_OTURUM_ARA_DK,
  type SinavOturumForm,
} from '@/lib/sinav-oturum';
import { Loader2, Sparkles, X, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { toast } from '@/store/toast.store';
import SinavBolumEditor, { type SinavdakiSoruOzeti } from '@/components/admin/sinavlar/SinavBolumEditor';
import KitapcikKapakEditor from '@/components/admin/sinavlar/KitapcikKapakEditor';
import Link from 'next/link';
import {
  tytOsymSablonSatirlari,
  lgsSablonSatirlari,
  kpssSablonSatirlari,
  aytOsym160SablonSatirlari,
  AYT_OSYM_TOPLAM_SORU,
  AYT_OSYM_SURE_DK,
  sablonToplamSoru,
  aytOsym160EksikBlokEtiketleri,
} from '@/lib/sinav-konu-sablon';
import {
  bolumlerFromKonuDagilimi,
  bolumlerToKonuDagilimi,
  bosKonuDagilimSatiri,
  bosSinavAltBolum,
  bosSinavBolum,
  dagilimSatirSayisi,
  dagilimToplamSoru,
  lgsKitapcikBolumAdi,
  kpssKitapcikBolumAdi,
  satirlariBolumlereAyir,
  aytKitapcikBolumAdi,
  tytKitapcikBolumAdi,
  type SinavBolumForm,
} from '@/lib/sinav-konu-dagilim';
import {
  type SinavTur,
  isAytSinav,
  konuSeciciOncelikliKapsam,
  yksAytKonulariBirlestir,
} from '@/lib/sinav-tur';
import { grupKonuOgretimTuru, kpssOgretimTuruMu } from '@/lib/grupOgretimTuru';

const SoruSecimModalLazy = dynamic(() => import('./SoruSecimModal'), { ssr: false });

interface SinavFormModalProps {
  id?: string | null;
  onClose: () => void;
  gruplar: any[];
  /** Varsayılan: popup. "page" = tam sayfa (liste yerine route). */
  layout?: 'modal' | 'page';
}

const bosForm = () => ({
  baslik: '',
  tur: 'TYT' as string,
  grupId: '',
  baslangicZamani: '',
  bitisZamani: '',
  sureDakika: 120,
  kitapcikBolumAdi: '',
  kitapcikTarihMetni: '',
  kitapcikUrl: '',
  bolumler: [bosSinavBolum()] as SinavBolumForm[],
  oturumlar: [] as SinavOturumForm[],
});

/** mutate() çağrısı anında form anlık görüntüsü — titreşim/isolate closure karmaşasına karşı */
type SinavFormAnlik = ReturnType<typeof bosForm>;

function sinavApiGovdesi(f: SinavFormAnlik, grupId: string) {
  const baslangic =
    f.baslangicZamani?.trim() || isoToDatetimeLocal(new Date().toISOString());
  const sureDakika = f.sureDakika || 120;
  const bitis = f.bitisZamani?.trim() || datetimeLocalEkleDakika(baslangic, sureDakika);

  const govde: Record<string, unknown> = {
    baslik: String(f.baslik ?? '').trim(),
    tur: f.tur,
    grupId,
    sureDakika,
    kitapcikBolumAdi: f.kitapcikBolumAdi?.trim() || null,
    kitapcikTarihMetni: f.kitapcikTarihMetni?.trim() || null,
    kitapcikUrl: f.kitapcikUrl?.trim() || null,
    konuDagilimi: bolumlerToKonuDagilimi(f.bolumler),
  };

  if ((f.tur === 'LGS' || f.tur === 'KPSS') && f.oturumlar.length > 0) {
    const ozet = oturumlardanUstZaman(f.oturumlar);
    govde.oturumlar = oturumlarApiGovdesi(f.oturumlar);
    if (ozet) {
      govde.baslangicZamani = new Date(ozet.baslangicZamani).toISOString();
      govde.bitisZamani = new Date(ozet.bitisZamani).toISOString();
      govde.sureDakika = ozet.sureDakika;
    } else {
      govde.baslangicZamani = new Date(baslangic).toISOString();
      govde.bitisZamani = new Date(bitis).toISOString();
    }
  } else {
    govde.baslangicZamani = new Date(baslangic).toISOString();
    govde.bitisZamani = new Date(bitis).toISOString();
    govde.oturumlar = null;
  }

  return govde;
}

export default function SinavFormModal({ id, onClose, gruplar, layout = 'modal' }: SinavFormModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(bosForm());
  const [seciliUstGrupId, setSeciliUstGrupId] = useState('');
  const [seciliAltGrupId, setSeciliAltGrupId] = useState('');
  const [mevcutSorular, setMevcutSorular] = useState<any[]>([]);
  const [sablonPanelAcik, setSablonPanelAcik] = useState(false);
  const [manuelSoruSecim, setManuelSoruSecim] = useState<{ konuId: string; konuAd: string } | null>(null);
  const [yerelSinavId, setYerelSinavId] = useState<string | null>(null);
  const [soruSecimHazirlaniyor, setSoruSecimHazirlaniyor] = useState(false);
  const [soruKaldiriliyorId, setSoruKaldiriliyorId] = useState<string | null>(null);
  const aktifSinavId = id ?? yerelSinavId;
  const hydratedSinavIdRef = useRef<string | null>(null);

  const effectiveGrupId = seciliAltGrupId || seciliUstGrupId;

  const seciliGrup = useMemo(() => {
    if (!effectiveGrupId) return null;
    return gruplar.find((g) => g.id === effectiveGrupId) ?? null;
  }, [effectiveGrupId, gruplar]);

  const kpssSablonOgretimTuru = useMemo(() => {
    if (form.tur !== 'KPSS') return undefined;
    const fromGrup = grupKonuOgretimTuru(seciliGrup);
    return fromGrup && kpssOgretimTuruMu(fromGrup) ? fromGrup : undefined;
  }, [form.tur, seciliGrup]);

  const { data: detayRes, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['admin-sinav-detay', id],
    queryFn: () => adminApi.sinavDetay(id!),
    enabled: !!id,
  });

  const { data: sinavSorularRes } = useQuery({
    queryKey: ['admin-sinav-sorular', aktifSinavId],
    queryFn: () => adminApi.sinavSorulari(aktifSinavId!),
    enabled: !!aktifSinavId,
  });

  const konuQueryParams = useMemo(() => {
    if (form.tur === 'LGS') return { ogretimTuru: 'LGS' as const };
    if (form.tur === 'TYT') return { ogretimTuru: 'YKS' as const, yksKapsam: 'TYT' as const };
    if (isAytSinav(form.tur)) return { ogretimTuru: 'YKS' as const, yksKapsam: 'AYT' as const };
    if (form.tur === 'KPSS') {
      const kpssTur = grupKonuOgretimTuru(seciliGrup);
      return { ogretimTuru: (kpssTur && kpssOgretimTuruMu(kpssTur) ? kpssTur : 'KPSS') as string };
    }
    return { ogretimTuru: 'YKS' as const };
  }, [form.tur, seciliGrup]);

  const { data: konularRes, isLoading: konularYukleniyor } = useQuery({
    queryKey: ['admin-konular-sinav-form', konuQueryParams],
    queryFn: () =>
      soruApi.konular(konuQueryParams.ogretimTuru, {
        ...(konuQueryParams as { yksKapsam?: string }).yksKapsam
          ? { yksKapsam: (konuQueryParams as { yksKapsam: string }).yksKapsam }
          : {},
      }),
  });

  const { data: aytUyumTytDestekKonularRes, isLoading: aytUyumTytDestekKonularLoading } = useQuery({
    queryKey: ['admin-konular-sinav-form-ayt-tyt-merge'],
    queryFn: () => soruApi.konular('YKS', { yksKapsam: 'TYT' }),
    enabled: isAytSinav(form.tur),
  });

  const { data: havuzOzetRes } = useQuery({
    queryKey: ['admin-grup-havuz-ozet', effectiveGrupId],
    queryFn: () => adminApi.grupHavuzOzet(effectiveGrupId),
    enabled: !!effectiveGrupId,
  });

  const { data: globalKonuSayiRes } = useQuery({
    queryKey: ['admin-konu-soru-sayilari'],
    queryFn: () => adminApi.konuSoruSayilari(),
  });

  const konular = konularRes?.data?.veri || [];
  const aytySablonIcınKonular = useMemo(
    () =>
      isAytSinav(form.tur)
        ? yksAytKonulariBirlestir(
            konular as Parameters<typeof yksAytKonulariBirlestir>[0],
            (aytUyumTytDestekKonularRes?.data?.veri || []) as Parameters<typeof yksAytKonulariBirlestir>[1],
            form.tur,
          )
        : konular,
    [form.tur, konular, aytUyumTytDestekKonularRes?.data?.veri]
  );
  const konularListeGorunu = isAytSinav(form.tur) ? aytySablonIcınKonular : konular;
  const konularYuku =
    konularYukleniyor || (isAytSinav(form.tur) ? aytUyumTytDestekKonularLoading : false);

  const havuzKonuSayilari = useMemo(() => {
    const globalMap = (globalKonuSayiRes?.data?.veri || {}) as Record<string, number>;
    const grupMap = (havuzOzetRes?.data?.veri || {}) as Record<string, number>;
    const merged = { ...globalMap };
    for (const [konuId, adet] of Object.entries(grupMap)) {
      merged[konuId] = Math.max(merged[konuId] ?? 0, adet);
    }
    return merged;
  }, [havuzOzetRes?.data?.veri, globalKonuSayiRes?.data?.veri]);

  const sinavdakiSorular = useMemo<SinavdakiSoruOzeti[]>(() => {
    const kaynak =
      (sinavSorularRes?.data?.veri as Array<Record<string, unknown>> | undefined) ||
      (detayRes?.data?.veri?.sorular as Array<Record<string, unknown>> | undefined) ||
      (mevcutSorular as Array<Record<string, unknown>>);
    return (kaynak || []).map((soru) => ({
      id: String(soru.id ?? ''),
      konuId: String(soru.konuId ?? ''),
      siraNo: Number(soru.siraNo) || 0,
      metinHtml: String(soru.metinHtml ?? ''),
      zorluk: soru.zorluk ? String(soru.zorluk) : undefined,
    }));
  }, [sinavSorularRes?.data?.veri, detayRes?.data?.veri?.sorular, mevcutSorular]);

  useEffect(() => {
    if (!id || !detayRes?.data?.veri) return;
    const s = detayRes.data.veri;
    if (String(s.id) !== id) return;
    if (hydratedSinavIdRef.current === id) return;
    hydratedSinavIdRef.current = id;
    const apiOturumlar = oturumlarApiToForm(s.oturumlar);
    setForm({
      baslik: s.baslik || '',
      tur: s.tur || 'TYT',
      grupId: s.grupId || '',
      baslangicZamani: isoToDatetimeLocal(s.baslangicZamani),
      bitisZamani: isoToDatetimeLocal(s.bitisZamani),
      sureDakika: s.sureDakika || 120,
      kitapcikBolumAdi: s.kitapcikBolumAdi || '',
      kitapcikTarihMetni: s.kitapcikTarihMetni || '',
      kitapcikUrl: s.kitapcikUrl || '',
      bolumler: bolumlerFromKonuDagilimi(s.konuDagilimi),
      oturumlar:
        s.tur === 'LGS'
          ? apiOturumlar && apiOturumlar.length > 0
            ? apiOturumlar
            : bosLgsOturumlari()
          : s.tur === 'KPSS'
            ? apiOturumlar && apiOturumlar.length > 0
              ? apiOturumlar
              : bosKpssOturumlari()
            : [],
    });
    setMevcutSorular(s.sorular || []);
  }, [id, detayRes?.data?.veri]);

  useEffect(() => {
    if (!id || !detayRes?.data?.veri || gruplar.length === 0) return;
    const s = detayRes.data.veri;
    if (String(s.id) !== id) return;
    const grup = gruplar.find((g) => g.id === s.grupId);
    if (grup?.parentId) {
      setSeciliUstGrupId(grup.parentId);
      setSeciliAltGrupId(grup.id);
    } else if (s.grupId) {
      setSeciliUstGrupId(s.grupId);
      setSeciliAltGrupId('');
    }
  }, [id, detayRes?.data?.veri?.grupId, gruplar]);

  const ustGruplar = gruplar.filter((g) => !g.parentId);
  const altGruplar = gruplar.filter((g) => g.parentId === seciliUstGrupId);

  const sinavOlustur = useMutation({
    mutationFn: (anlik: { form: SinavFormAnlik; grupId: string }) =>
      adminApi.sinavOlustur(sinavApiGovdesi(anlik.form, anlik.grupId)),
    onSuccess: () => {
      toast.basarili('Sınav oluşturuldu.');
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
      onClose();
    },
    onError: () => toast.hata('Sınav oluşturulamadı.'),
  });

  const sinavGuncelle = useMutation({
    mutationFn: (anlik: { form: SinavFormAnlik; grupId: string; sinavId: string }) =>
      adminApi.sinavGuncelle(anlik.sinavId, sinavApiGovdesi(anlik.form, anlik.grupId)),
    onSuccess: () => {
      toast.basarili('Sınav güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
      onClose();
    },
    onError: () => toast.hata('Sınav güncellenemedi.'),
  });

  const sinavSoruKaldir = useMutation({
    mutationFn: ({ sinavId, soruId }: { sinavId: string; soruId: string }) =>
      adminApi.sinavSoruKaldir(sinavId, soruId),
    onSuccess: () => {
      toast.basarili('Soru sınavdan çıkarıldı.');
      if (aktifSinavId) {
        queryClient.invalidateQueries({ queryKey: ['admin-sinav-sorular', aktifSinavId] });
        queryClient.invalidateQueries({ queryKey: ['admin-sinav-detay', aktifSinavId] });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-konu-sorulari'] });
    },
    onError: () => toast.hata('Soru sınavdan çıkarılamadı.'),
    onSettled: () => setSoruKaldiriliyorId(null),
  });

  const tytSablonUygula = () => {
    if (form.tur !== 'TYT') {
      toast.uyari('TYT şablonu için sınav türünü TYT seçin.');
      return;
    }
    const satirlar = tytOsymSablonSatirlari(konular);
    if (satirlar.length === 0) {
      toast.hata('TYT konuları yüklenemedi veya veritabanında eşleşen ünite yok.');
      return;
    }
    const bolumler = satirlariBolumlereAyir(satirlar, konular, tytKitapcikBolumAdi, 'TYT');
    setForm((f) => ({ ...f, bolumler }));
    toast.basarili(`TYT şablonu uygulandı (${sablonToplamSoru(satirlar)} soru, sözel/sayısal bölümlere ayrıldı).`);
  };

  const lgsSablonUygula = () => {
    if (form.tur !== 'LGS') {
      toast.uyari('LGS şablonu için sınav türünü LGS seçin.');
      return;
    }
    const satirlar = lgsSablonSatirlari(konular);
    if (satirlar.length === 0) {
      toast.hata('LGS konuları yüklenemedi veya eşleşen ders yok.');
      return;
    }
    const bolumler = satirlariBolumlereAyir(satirlar, konular, lgsKitapcikBolumAdi, 'LGS');
    setForm((f) => ({ ...f, bolumler }));
    toast.basarili(`LGS şablonu uygulandı (${sablonToplamSoru(satirlar)} soru).`);
  };

  const kpssSablonUygula = () => {
    if (form.tur !== 'KPSS') {
      toast.uyari('KPSS şablonu için sınav türünü KPSS seçin.');
      return;
    }
    const satirlar = kpssSablonSatirlari(konular, kpssSablonOgretimTuru);
    if (satirlar.length === 0) {
      toast.hata(
        'KPSS şablonu için konu havuzunda eşleşen ders bulunamadı. Veritabanında KPSS konularının yüklü olduğundan emin olun (backend: npx prisma db seed).',
      );
      return;
    }
    const bolumler = satirlariBolumlereAyir(satirlar, konular, kpssKitapcikBolumAdi, 'KPSS');
    const oturumlar = form.oturumlar.length > 0 ? form.oturumlar : bosKpssOturumlari();
    setForm((prev) => ({
      ...prev,
      bolumler,
      oturumlar,
      sureDakika: oturumlar.reduce((t, o) => t + o.sureDakika, 0) + KPSS_OTURUM_ARA_DK,
    }));
    toast.basarili(
      `KPSS şablonu uygulandı (${sablonToplamSoru(satirlar)} soru, Genel Yetenek / Genel Kültür bölümlerine ayrıldı).`,
    );
  };

  const aytOsymSablonUygula = () => {
    if (!isAytSinav(form.tur)) {
      toast.uyari('AYT şablonu için sınav türünü AYT veya AYT + TYT seçin.');
      return;
    }
    const sablonKonuKaynagi = aytySablonIcınKonular as Parameters<typeof aytOsym160SablonSatirlari>[0];
    const satirlar = aytOsym160SablonSatirlari(sablonKonuKaynagi);
    const toplam = sablonToplamSoru(satirlar);
    if (satirlar.length === 0 || toplam < AYT_OSYM_TOPLAM_SORU) {
      const eksik = aytOsym160EksikBlokEtiketleri(sablonKonuKaynagi).join('; ');
      toast.hata(
        `AYT şablonu tamamlanamadı (${toplam}/${AYT_OSYM_TOPLAM_SORU} soru).` +
          (eksik ? ` Eksik bloklar: ${eksik}.` : '') +
          ' Veritabanını güncellemek için backend dizininde npx prisma db seed çalıştırın; backend ve enum SQL yamalarının uygulanmış olduğundan emin olun.'
      );
      return;
    }
    setForm((f) => ({
      ...f,
      bolumler: satirlariBolumlereAyir(satirlar, sablonKonuKaynagi, aytKitapcikBolumAdi, 'AYT'),
      sureDakika: AYT_OSYM_SURE_DK,
      ...(f.baslangicZamani
        ? { bitisZamani: datetimeLocalEkleDakika(f.baslangicZamani, AYT_OSYM_SURE_DK) }
        : {}),
    }));
    toast.basarili(
      `AYT ÖSYM şablonu: ${toplam} soru, süre ${AYT_OSYM_SURE_DK} dk. (TD+SB-1: 40, SB-2: 40, Mat: 40, Fen: 40)`
    );
  };

  const bolumEkle = () => {
    setForm((f) => ({ ...f, bolumler: [...f.bolumler, bosSinavBolum()] }));
  };

  const bolumSil = (bolumId: string) => {
    setForm((f) => {
      const kalan = f.bolumler.filter((b) => b.id !== bolumId);
      return { ...f, bolumler: kalan.length > 0 ? kalan : [bosSinavBolum()] };
    });
  };

  const bolumAdGuncelle = (bolumId: string, ad: string) => {
    setForm((f) => ({
      ...f,
      bolumler: f.bolumler.map((b) => (b.id === bolumId ? { ...b, ad } : b)),
    }));
  };

  const altBolumEkle = (bolumId: string) => {
    setForm((f) => ({
      ...f,
      bolumler: f.bolumler.map((b) =>
        b.id === bolumId ? { ...b, altBolumler: [...b.altBolumler, bosSinavAltBolum()] } : b,
      ),
    }));
  };

  const altBolumSil = (bolumId: string, altBolumId: string) => {
    setForm((f) => ({
      ...f,
      bolumler: f.bolumler.map((b) => {
        if (b.id !== bolumId) return b;
        const kalan = b.altBolumler.filter((alt) => alt.id !== altBolumId);
        return { ...b, altBolumler: kalan.length > 0 ? kalan : [bosSinavAltBolum()] };
      }),
    }));
  };

  const altBolumGuncelle = (
    bolumId: string,
    altBolumId: string,
    patch: Partial<{ ad: string; aciklama: string; soruBas: number | null; soruBit: number | null }>,
  ) => {
    setForm((f) => ({
      ...f,
      bolumler: f.bolumler.map((b) =>
        b.id === bolumId
          ? {
              ...b,
              altBolumler: b.altBolumler.map((alt) => (alt.id === altBolumId ? { ...alt, ...patch } : alt)),
            }
          : b,
      ),
    }));
  };

  const altBolumSatirEkle = (bolumId: string, altBolumId: string) => {
    setForm((f) => ({
      ...f,
      bolumler: f.bolumler.map((b) =>
        b.id === bolumId
          ? {
              ...b,
              altBolumler: b.altBolumler.map((alt) =>
                alt.id === altBolumId ? { ...alt, satirlar: [...alt.satirlar, bosKonuDagilimSatiri()] } : alt,
              ),
            }
          : b,
      ),
    }));
  };

  const altBolumSatirSil = (bolumId: string, altBolumId: string, satirIdx: number) => {
    setForm((f) => ({
      ...f,
      bolumler: f.bolumler.map((b) =>
        b.id === bolumId
          ? {
              ...b,
              altBolumler: b.altBolumler.map((alt) =>
                alt.id === altBolumId ? { ...alt, satirlar: alt.satirlar.filter((_, i) => i !== satirIdx) } : alt,
              ),
            }
          : b,
      ),
    }));
  };

  const altBolumSatirGuncelle = (
    bolumId: string,
    altBolumId: string,
    satirIdx: number,
    patch: Partial<{ konuId: string; adet: number }>,
  ) => {
    setForm((f) => ({
      ...f,
      bolumler: f.bolumler.map((b) =>
        b.id === bolumId
          ? {
              ...b,
              altBolumler: b.altBolumler.map((alt) =>
                alt.id === altBolumId
                  ? {
                      ...alt,
                      satirlar: alt.satirlar.map((row, i) => (i === satirIdx ? { ...row, ...patch } : row)),
                    }
                  : alt,
              ),
            }
          : b,
      ),
    }));
  };

  const oncelikliKapsam = konuSeciciOncelikliKapsam(form.tur);

  const cokluOturumMu = form.tur === 'LGS' || form.tur === 'KPSS';
  const cokluOturumHazir =
    !cokluOturumMu ||
    (form.oturumlar.length > 0 &&
      form.oturumlar.every((o) => o.baslangicZamani && o.bitisZamani && o.sureDakika > 0));

  const kaydetDisabled =
    !form.baslik?.trim() ||
    !effectiveGrupId ||
    (cokluOturumMu ? !cokluOturumHazir : !form.baslangicZamani || !form.bitisZamani) ||
    sinavOlustur.isPending ||
    sinavGuncelle.isPending;

  const soruSecimIcinGrupId = (): string | null => {
    if (effectiveGrupId) return effectiveGrupId;
    if (ustGruplar.length === 1 && altGruplar.length === 0) return ustGruplar[0].id;
    if (seciliUstGrupId && altGruplar.length === 1 && !seciliAltGrupId) return altGruplar[0].id;
    return null;
  };

  const sinavFormuSoruSecimiIcin = (): SinavFormAnlik => {
    const baslik = form.baslik?.trim() || 'Taslak sınav';
    if (cokluOturumMu) {
      return { ...form, baslik };
    }
    const baslangicZamani = form.baslangicZamani || isoToDatetimeLocal(new Date().toISOString());
    const sureDakika = form.sureDakika || 120;
    const bitisZamani = form.bitisZamani || datetimeLocalEkleDakika(baslangicZamani, sureDakika);
    return { ...form, baslik, baslangicZamani, bitisZamani, sureDakika };
  };

  const sinavKaydiGerekliyseOlustur = async (): Promise<string | null> => {
    if (aktifSinavId) return aktifSinavId;

    const grupId = soruSecimIcinGrupId();
    if (!grupId) {
      toast.uyari('Soru seçmek için üst grup seçin.');
      return null;
    }
    if (cokluOturumMu && !cokluOturumHazir) {
      toast.uyari(`${form.tur} sınavında oturum başlangıç, bitiş ve süre bilgilerini doldurun.`);
      return null;
    }

    const hazirForm = sinavFormuSoruSecimiIcin();
    setForm(hazirForm);
    if (!seciliUstGrupId) {
      const grup = gruplar.find((g) => g.id === grupId);
      if (grup?.parentId) {
        setSeciliUstGrupId(grup.parentId);
        setSeciliAltGrupId(grup.id);
      } else {
        setSeciliUstGrupId(grupId);
      }
    } else if (!seciliAltGrupId && altGruplar.length === 1 && grupId === altGruplar[0].id) {
      setSeciliAltGrupId(grupId);
    }

    setSoruSecimHazirlaniyor(true);
    try {
      const res = await adminApi.sinavOlustur(sinavApiGovdesi(hazirForm, grupId));
      const yeniId = res?.data?.veri?.id as string | undefined;
      if (!yeniId) {
        throw new Error('Sınav kimliği alınamadı');
      }
      setYerelSinavId(yeniId);
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
      return yeniId;
    } catch (err: unknown) {
      const axiosMsg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { mesaj?: string } } }).response?.data?.mesaj;
      toast.hata(
        typeof axiosMsg === 'string' && axiosMsg.trim()
          ? axiosMsg
          : 'Sınav kaydedilemedi; soru seçimi açılamadı.',
      );
      return null;
    } finally {
      setSoruSecimHazirlaniyor(false);
    }
  };

  const soruSecimineBasla = async (konuId: string, konuAd: string) => {
    const sinavId = await sinavKaydiGerekliyseOlustur();
    if (!sinavId) return;
    setManuelSoruSecim({ konuId, konuAd });
  };

  const sinavdanSoruKaldir = async (soruId: string) => {
    if (!aktifSinavId) {
      toast.uyari('Soru çıkarmak için önce sınav kaydını oluşturun.');
      return;
    }
    setSoruKaldiriliyorId(soruId);
    await sinavSoruKaldir.mutateAsync({ sinavId: aktifSinavId, soruId });
  };

  const panelBasligi = id ? 'Sınav Düzenle' : 'Yeni Sınav';

  const formIcerik = (
    <>
      {detayYukleniyor ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sınav Başlığı</label>
            <input
              value={form.baslik}
              onChange={(e) => setForm({ ...form, baslik: e.target.value })}
              className="input-field"
              placeholder="Örn: TYT Genel Deneme #1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Üst Grup</label>
            <select
              value={seciliUstGrupId}
              onChange={(e) => {
                setSeciliUstGrupId(e.target.value);
                setSeciliAltGrupId('');
              }}
              className="input-field"
            >
              <option value="">Seçin...</option>
              {ustGruplar.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alt Grup (isteğe bağlı)</label>
            <select
              value={seciliAltGrupId}
              onChange={(e) => setSeciliAltGrupId(e.target.value)}
              className="input-field"
              disabled={!seciliUstGrupId || altGruplar.length === 0}
            >
              <option value="">— Yok —</option>
              {altGruplar.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sınav Türü</label>
            <select
              value={form.tur}
              onChange={(e) => {
                const tur = e.target.value;
                setForm((f) => ({
                  ...f,
                  tur,
                  oturumlar:
                    tur === 'LGS' && f.oturumlar.length === 0
                      ? bosLgsOturumlari()
                      : tur === 'LGS'
                        ? f.oturumlar
                        : tur === 'KPSS' && f.oturumlar.length === 0
                          ? bosKpssOturumlari()
                          : tur === 'KPSS'
                            ? f.oturumlar
                            : [],
                }));
              }}
              className="input-field"
            >
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
              <option value="AYT_TYT">AYT + TYT (TYT soru/konu havuzu dahil)</option>
              <option value="LGS">LGS</option>
              <option value="KPSS">KPSS</option>
            </select>
            {form.tur === 'AYT_TYT' ? (
              <p className="mt-1.5 text-xs text-indigo-700 leading-relaxed">
                TYT konu ve soru bankası bu sınava dahildir; ÖSYM AYT kitapçığına uygun TD+SB-1 soruları için TYT
                ünitelerinden seçim yapabilirsiniz.
              </p>
            ) : null}
          </div>

          {form.tur === 'LGS' || form.tur === 'KPSS' ? (
            <div className="col-span-2 space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-950">
                {form.tur === 'KPSS' ? (
                  <>
                    KPSS iki oturumla uygulanır: önce <b>Genel Yetenek</b>, ardından ara verilmeden (0 dakika) <b>Genel Kültür</b> başlar. Her oturum için başlangıç, bitiş ve süreyi girin.
                  </>
                ) : (
                  <>
                    LGS iki ayrı kitapçıkla uygulanır: önce <b>sözel</b>, ardından yaklaşık{' '}
                    <b>{LGS_OTURUM_ARA_DK} dakika</b> ara, sonra <b>sayısal</b> bölüm. Her oturum için başlangıç, bitiş
                    ve süreyi ayrı girin; genel sınav penceresi bu oturumlardan otomatik hesaplanır.
                  </>
                )}
              </div>
              {form.oturumlar.map((oturum, idx) => (
                <div
                  key={oturum.kod}
                  className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{oturum.ad}</p>
                    {oturum.soruSayisi ? (
                      <span className="text-xs font-medium text-gray-500">{oturum.soruSayisi} soru</span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dk)</label>
                      <input
                        type="number"
                        min={1}
                        value={oturum.sureDakika}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          const sureDakika = Math.max(1, Number.isFinite(raw) && raw > 0 ? raw : 1);
                          setForm((f) => {
                            const oturumlar =
                              form.tur === 'KPSS'
                                ? kpssOturumlariSenkronize(f.oturumlar, idx, { sureDakika })
                                : lgsOturumlariSenkronize(f.oturumlar, idx, { sureDakika });
                            const ozet = oturumlardanUstZaman(oturumlar);
                            return {
                              ...f,
                              oturumlar,
                              ...(ozet
                                ? {
                                    baslangicZamani: ozet.baslangicZamani,
                                    bitisZamani: ozet.bitisZamani,
                                    sureDakika: ozet.sureDakika,
                                  }
                                : {}),
                            };
                          });
                        }}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
                      <input
                        type="datetime-local"
                        value={oturum.baslangicZamani}
                        onChange={(e) => {
                          const baslangicZamani = e.target.value;
                          setForm((f) => {
                            const oturumlar =
                              form.tur === 'KPSS'
                                ? kpssOturumlariSenkronize(f.oturumlar, idx, { baslangicZamani })
                                : lgsOturumlariSenkronize(f.oturumlar, idx, { baslangicZamani });
                            const ozet = oturumlardanUstZaman(oturumlar);
                            return {
                              ...f,
                              oturumlar,
                              ...(ozet
                                ? {
                                    baslangicZamani: ozet.baslangicZamani,
                                    bitisZamani: ozet.bitisZamani,
                                    sureDakika: ozet.sureDakika,
                                  }
                                : {}),
                            };
                          });
                        }}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
                      <input
                        type="datetime-local"
                        value={oturum.bitisZamani}
                        onChange={(e) => {
                          const bitisZamani = e.target.value;
                          setForm((f) => {
                            const oturumlar = f.oturumlar.map((o, i) => (i === idx ? { ...o, bitisZamani } : o));
                            const ozet = oturumlardanUstZaman(oturumlar);
                            return {
                              ...f,
                              oturumlar,
                              ...(ozet
                                ? {
                                    baslangicZamani: ozet.baslangicZamani,
                                    bitisZamani: ozet.bitisZamani,
                                    sureDakika: ozet.sureDakika,
                                  }
                                : {}),
                            };
                          });
                        }}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {form.baslangicZamani && form.bitisZamani ? (
                <p className="text-xs text-gray-500">
                  Genel sınav penceresi: {form.baslangicZamani.replace('T', ' ')} –{' '}
                  {form.bitisZamani.replace('T', ' ')} • Toplam sınav süresi: <b>{form.sureDakika}</b> dk
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dk)</label>
                <input
                  type="number"
                  min={1}
                  value={form.sureDakika}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    const sureDakika = Math.max(1, Number.isFinite(raw) && raw > 0 ? raw : 120);
                    setForm((f) => ({
                      ...f,
                      sureDakika,
                      ...(f.baslangicZamani
                        ? { bitisZamani: datetimeLocalEkleDakika(f.baslangicZamani, sureDakika) }
                        : {}),
                    }));
                  }}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
                <input
                  type="datetime-local"
                  value={form.baslangicZamani}
                  onChange={(e) => {
                    const baslangicZamani = e.target.value;
                    setForm((f) => ({
                      ...f,
                      baslangicZamani,
                      ...(baslangicZamani
                        ? { bitisZamani: datetimeLocalEkleDakika(baslangicZamani, f.sureDakika) }
                        : {}),
                    }));
                  }}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
                <input
                  type="datetime-local"
                  value={form.bitisZamani}
                  onChange={(e) => setForm({ ...form, bitisZamani: e.target.value })}
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Başlangıç ve süre değişince bitiş otomatik hesaplanır; gerekirse elle düzenleyebilirsiniz.
                </p>
              </div>
            </>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Kitapçık bölüm başlığı (opsiyonel)</label>
            <input
              value={form.kitapcikBolumAdi}
              onChange={(e) => setForm({ ...form, kitapcikBolumAdi: e.target.value })}
              className="input-field"
              placeholder="Örn: TESTLER"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Kitapçık tarih metni (opsiyonel)</label>
            <input
              value={form.kitapcikTarihMetni}
              onChange={(e) => setForm({ ...form, kitapcikTarihMetni: e.target.value })}
              className="input-field"
              placeholder="Örn: 2026"
            />
          </div>

          <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-800">Kitapçık kapak tasarımı</p>
              <p className="text-xs text-gray-500 mt-1">
                Deneme kitapçığının ilk sayfasında görünecek kapak görselini yükleyin veya bağlantı verin.
              </p>
            </div>
            <KitapcikKapakEditor
              value={form.kitapcikUrl}
              onChange={(kitapcikUrl) => setForm((f) => ({ ...f, kitapcikUrl }))}
            />
          </div>

          {aktifSinavId && sinavdakiSorular.length > 0 && (
            <div className="col-span-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
              Bu sınavda <b>{sinavdakiSorular.length}</b> soru tanımlı. Konu dağılımını değiştirmek havuzdan çekilen yeni
              otomatik atamayı etkiler.
            </div>
          )}

          <div className="col-span-2 pt-4 border-t border-gray-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800">Sınav bölümleri ve müfredat</p>
                <p className="text-xs text-gray-500 mt-1">
                  Kitapçıktaki gibi bölüm ve alt bölüm tanımlayın; her alt bölümde soru aralığı, açıklama ve müfredat satırlarını girin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSablonPanelAcik((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 text-violet-800 border border-violet-100 text-xs font-bold hover:bg-violet-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Şablondan doldur
                {sablonPanelAcik ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {konularYuku && (
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Konular yükleniyor…
              </p>
            )}

            {sablonPanelAcik && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => setSablonPanelAcik(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-violet-100 text-violet-700"
                  aria-label="Şablon panelini kapat"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="pr-10">
                  <p className="text-sm font-bold text-violet-900">Hazır dağılımlar</p>
                  {isAytSinav(form.tur) ? (
                    <div className="text-xs text-violet-800/90 mt-1 leading-relaxed space-y-2">
                      {form.tur === 'AYT_TYT' ? (
                        <p className="rounded-lg bg-violet-100/80 px-2.5 py-2 text-violet-950">
                          <b>AYT + TYT:</b> Kitapçık düzeni AYT ile aynıdır; konu ve soru seçiminde{' '}
                          <b>tüm TYT havuzu</b> da listelenir (Tarih-1, Coğrafya-1, Türkçe vb.).
                        </p>
                      ) : null}
                      <p>
                        <b>ÖSYM AYT (2. oturum):</b> Tek kitapçıkta <b>TD + Sosyal Bilimler-1</b> (40),{' '}
                        <b>Sosyal Bilimler-2</b> (40), <b>Matematik</b> (40), <b>Fen Bilimleri</b> (40) —{' '}
                        <b>toplam 160 soru</b>, süre <b>180 dakika</b>. SAY/SÖZ/EA için gereken testleri adaylar kendi
                        puan türüne göre çözerek işaretler; hepsini hesaplatan adaylar tüm testleri cevaplayabilir.
                      </p>
                      <p className="text-violet-900/80">
                        Dağılım (yaklaşık resmî tablo): TD 24 + Tarih-1 10 + Coğrafya-1 6; Tarih-2 11 + Coğrafya-2 11 +
                        Felsefe Grubu 12 + Din 6; Mat 40; Fiz 14 + Kim 13 + Bio 13. Aşağıdaki düğme bu sayıları konu
                        satırlarına ünite içi eşit bölerek yazar; isterseniz sonra satırları elle düzenlersiniz.
                      </p>
                    </div>
                  ) : form.tur === 'LGS' ? (
                    <p className="text-xs text-violet-800/90 mt-1 leading-relaxed">
                      <b>LGS</b>: Yaygın <b>90 soru</b> ders dağılımını ünite bazında paylaştıran hazır şablonu aşağıdan
                      tek tıkla uygulayabilirsiniz.
                    </p>
                  ) : form.tur === 'KPSS' ? (
                    <p className="text-xs text-violet-800/90 mt-1 leading-relaxed">
                      <b>KPSS</b>: Genel Yetenek (Türkçe 30, Mat+Geo 30) + Genel Kültür (Tarih 27, Coğrafya 18,
                      Vatandaşlık 9, Güncel 6) — <b>toplam 120 soru</b>, oturumlar 65+65 dk. Konular seçili
                      grubun kademesine (Lisans / Önlisans / Ortaöğretim) göre KPSS havuzundan eşleştirilir.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-violet-800/90 mt-1 leading-relaxed">
                        <b>TYT</b>: ÖSYM&apos;ye yakın <b>120 soru</b> (Türkçe 40, Mat+Geo 40, Fen 20, Sosyal 20). Her ders için
                        soru sayısı, o dersteki <b>tüm ünite konularına eşit</b> bölünür — böylece Fizik, Kimya, Felsefe,
                        Din vb. tek üniteye sıkışmaz.
                      </p>
                      <p className="text-xs text-violet-800/90 mt-2 leading-relaxed">
                        <b>LGS</b>: Üstten sınav türünü <b>LGS</b> seçerek 90 soruluk hazır dağılımı uygulayın.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.tur === 'TYT' && (
                    <button
                      type="button"
                      onClick={tytSablonUygula}
                      disabled={konularYuku}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      TYT (120) şablonunu uygula
                    </button>
                  )}
                  {form.tur === 'LGS' && (
                    <button
                      type="button"
                      onClick={lgsSablonUygula}
                      disabled={konularYuku}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      LGS (90) şablonunu uygula
                    </button>
                  )}
                  {form.tur === 'KPSS' && (
                    <button
                      type="button"
                      onClick={kpssSablonUygula}
                      disabled={konularYuku}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      KPSS (120) şablonunu uygula
                    </button>
                  )}
                  {isAytSinav(form.tur) && (
                    <button
                      type="button"
                      onClick={aytOsymSablonUygula}
                      disabled={konularYuku}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      AYT (160) ÖSYM şablonu + {AYT_OSYM_SURE_DK} dk süre
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSablonPanelAcik(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-violet-800 hover:bg-violet-100"
                  >
                    Paneli kapat
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500">
                Toplam planlanan: <b>{dagilimToplamSoru(form.bolumler)}</b> soru (
                {dagilimSatirSayisi(form.bolumler)} müfredat satırı, {form.bolumler.length} bölüm)
              </p>
            </div>

            <SinavBolumEditor
              bolumler={form.bolumler}
              konular={konularListeGorunu as any[]}
              havuzKonuSayilari={havuzKonuSayilari}
              oncelikliKapsam={oncelikliKapsam}
              soruSecimBekleniyor={soruSecimHazirlaniyor}
              sinavdakiSorular={sinavdakiSorular}
              soruKaldiriliyorId={soruKaldiriliyorId}
              onBolumEkle={bolumEkle}
              onBolumSil={bolumSil}
              onBolumAdGuncelle={bolumAdGuncelle}
              onAltBolumEkle={altBolumEkle}
              onAltBolumSil={altBolumSil}
              onAltBolumGuncelle={altBolumGuncelle}
              onAltBolumSatirEkle={altBolumSatirEkle}
              onAltBolumSatirSil={altBolumSatirSil}
              onAltBolumSatirGuncelle={altBolumSatirGuncelle}
              onSoruSec={soruSecimineBasla}
              onSoruKaldir={sinavdanSoruKaldir}
            />
          </div>
        </div>
      )}
    </>
  );

  const altButonlar = (
    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
      <button type="button" onClick={onClose} className="btn-secondary">
        İptal
      </button>
      <button
        type="button"
        disabled={kaydetDisabled}
        onClick={() =>
          aktifSinavId
            ? sinavGuncelle.mutate({ form, grupId: effectiveGrupId, sinavId: aktifSinavId })
            : sinavOlustur.mutate({ form, grupId: effectiveGrupId })
        }
        className="btn-primary disabled:opacity-50"
      >
        {(sinavOlustur.isPending || sinavGuncelle.isPending) && (
          <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
        )}
        {aktifSinavId ? 'Güncelle' : 'Oluştur'}
      </button>
    </div>
  );

  const soruSecimOverlay =
    manuelSoruSecim && aktifSinavId ? (
      <SoruSecimModalLazy
        sinavId={aktifSinavId}
        konuId={manuelSoruSecim.konuId}
        konuAd={manuelSoruSecim.konuAd}
        sinavdakiKonuSoruIds={sinavdakiSorular
          .filter((soru) => soru.konuId === manuelSoruSecim.konuId)
          .map((soru) => soru.id)}
        onClose={() => {
          setManuelSoruSecim(null);
          queryClient.invalidateQueries({ queryKey: ['admin-sinav-detay', aktifSinavId] });
          queryClient.invalidateQueries({ queryKey: ['admin-sinav-sorular', aktifSinavId] });
        }}
      />
    ) : null;

  if (layout === 'page') {
    return (
      <>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Link
              href="/panel/sinavlar"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Sınav listesine dön
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{panelBasligi}</h1>
            <p className="text-gray-500 text-sm">
              Sınav bilgileri, zamanlar ve konu dağılımını buradan düzenleyebilirsiniz.
            </p>
          </div>
          <div className="card p-6">
            {formIcerik}
            {altButonlar}
          </div>
        </div>
        {soruSecimOverlay}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 p-6 animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{panelBasligi}</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Kapat">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {formIcerik}

          {altButonlar}
        </div>
      </div>
      {soruSecimOverlay}
    </>
  );
}
