'use client';

interface KitapcikKapakSayfasiProps {
  url: string;
  sayfaNo?: number;
  toplamSayfa?: number;
}

export function KitapcikKapakSayfasi({ url, sayfaNo, toplamSayfa }: KitapcikKapakSayfasiProps) {
  if (!url.trim()) return null;

  return (
    <section className="deneme-a4-sayfa flex flex-col bg-white border border-gray-300 rounded-sm shadow-md print:shadow-none print:rounded-none overflow-hidden">
      <div className="deneme-a4-ic flex flex-col flex-1 min-h-0 p-0">
        <img src={url} alt="Deneme kitapçığı kapağı" className="w-full h-full min-h-[280mm] object-contain bg-white" />
      </div>
      {sayfaNo != null && toplamSayfa != null ? (
        <div className="px-[10mm] pb-[6mm] print:px-[12mm]">
          <p className="text-center text-[12px] font-semibold text-gray-900 tabular-nums">{sayfaNo}</p>
        </div>
      ) : null}
    </section>
  );
}
