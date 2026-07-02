'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { DenemeKitapcikSayfalari } from '@/components/exam/DenemeKitapcikSayfalari';
import { kitapcikHtmlDosyaIndir } from '@/lib/kitapcikHtml';
import { denemeOrtamSinifi } from '@/lib/kitapcik-tema';
import { Printer, ArrowLeft, Loader2, FileText, Download } from 'lucide-react';

type SinavOzet = {
  id?: string;
  baslik: string;
  tur: string;
  baslangicZamani: string;
  kitapcikBolumAdi?: string | null;
  kitapcikTarihMetni?: string | null;
  kitapcikUrl?: string | null;
  konuDagilimi?: unknown;
};

type SoruSatir = {
  id: string;
  konuId?: string;
  siraNo: number;
  metinHtml: string;
  gorselUrl?: string | null;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string };
};

function baslangicIsoString(s: unknown): string {
  if (typeof s === 'string') return s;
  if (s instanceof Date) return s.toISOString();
  return new Date(s as string).toISOString();
}

async function sinavVerisiYukle(id: string): Promise<SinavOzet & { sorular: SoruSatir[] }> {
  try {
    const r = await adminApi.sinavDetay(id);
    const v = r.data.veri as SinavOzet & { sorular: SoruSatir[] };
    return {
      ...v,
      baslangicZamani: baslangicIsoString(v.baslangicZamani),
      sorular: v.sorular || [],
    };
  } catch (e) {
    const status =
      e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { status?: number } }).response?.status
        : undefined;
    if (status === 404) {
      const listR = await adminApi.sinavlar();
      const rows = listR.data.veri as Array<
        SinavOzet & { id: string; baslangicZamani: string | Date }
      >;
      const sinav = rows.find((s) => s.id === id);
      if (!sinav) throw e;

      let sorular: SoruSatir[] = [];
      try {
        const soruR = await adminApi.sinavSorulari(id);
        sorular = (soruR.data.veri as SoruSatir[]) || [];
      } catch {
        sorular = [];
      }

      return {
        ...sinav,
        baslangicZamani: baslangicIsoString(sinav.baslangicZamani),
        sorular,
      };
    }
    throw e;
  }
}

export default function KitapcikOnizlemeSayfasi() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['admin-sinav-onizleme', id],
    queryFn: () => sinavVerisiYukle(id),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const htmlIndir = () => {
    if (!data) return;
    kitapcikHtmlDosyaIndir(
      {
        baslik: data.baslik,
        tur: data.tur,
        baslangicZamani: data.baslangicZamani,
        kitapcikBolumAdi: data.kitapcikBolumAdi,
        kitapcikTarihMetni: data.kitapcikTarihMetni,
        kitapcikUrl: data.kitapcikUrl,
        konuDagilimi: data.konuDagilimi,
      },
      data.sorular
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-red-700 font-medium">Sınav yüklenemedi (404)</p>
        <p className="text-sm text-gray-600 mt-2">
          Backend sürümü eskiyse <code className="bg-gray-100 px-1 rounded text-xs">GET /admin/sinavlar/:id</code> ve{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">/sorular</code> rotaları yoktur. Proje kökünde:{' '}
          <code className="block mt-2 bg-gray-100 p-2 rounded text-xs">
            docker compose build backend &amp;&amp; docker compose up -d backend
          </code>
        </p>
        <Link href="/panel/sinavlar" className="inline-block mt-4 text-indigo-600 text-sm font-medium">
          ← Sınav listesine dön
        </Link>
      </div>
    );
  }

  const sorular = data.sorular || [];
  const baslangicIso = data.baslangicZamani;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border-b border-gray-200 print:hidden">
        <Link
          href="/panel/sinavlar"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Sınav listesi
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-gray-500 hidden sm:block max-w-md truncate">{data.baslik}</p>
          <button
            type="button"
            onClick={htmlIndir}
            className={`btn-secondary flex items-center gap-2 text-sm ${
              data.tur === 'LGS'
                ? 'border-blue-200 text-blue-800'
                : 'border-indigo-200 text-indigo-800'
            }`}
          >
            <Download className="w-4 h-4" /> HTML indir (ÖSYM görünümü)
          </button>
          <button type="button" onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" /> Yazdır / PDF
          </button>
        </div>
      </div>

      <p className="px-4 py-2 text-xs text-amber-900 bg-amber-50 border-b border-amber-100 print:hidden">
        <FileText className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        <strong>HTML indir</strong> aynı kapak ve soru düzenini tek dosyada verir; tarayıcıda açıp yazdırarak PDF de
        alabilirsiniz. <strong>Yazdır / PDF</strong> bu sayfayı PDF yapar. Liste API’si ile yedek yükleme kullanıldıysa
        üstte uyarı çıkmaz.
      </p>

      <div
        className={`deneme-kitapcik-sayfa px-3 py-6 sm:px-6 print:p-0 print:bg-white ${denemeOrtamSinifi(data.tur)}`}
      >
        <div className="osym-kitapcik font-serif text-gray-900 max-w-[210mm] mx-auto border-0 shadow-none bg-transparent">
          <DenemeKitapcikSayfalari
            tur={data.tur}
            baslangicZamani={baslangicIso}
            kitapcikBolumAdi={data.kitapcikBolumAdi}
            kitapcikTarihMetni={data.kitapcikTarihMetni}
            kitapcikUrl={data.kitapcikUrl}
            konuDagilimi={data.konuDagilimi}
            sorular={sorular}
            ilkKonuDers={sorular[0]?.konu?.ders}
            sinavBaslik={data.baslik}
          />
        </div>
      </div>
    </div>
  );
}
