import { redirect } from 'next/navigation';

/** Eski /panel/sinavlar/[id] bağlantıları önizleme sayfasına yönlendirilir */
export default function SinavIdKokYonlendir({ params }: { params: { id: string } }) {
  redirect(`/panel/sinavlar/${params.id}/onizleme`);
}
