'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePanelYolu } from '@/components/panel/PanelYolu';

/** Kod oluşturma yalnızca yöneticide; koç/kurum Kazançlarım sayfasına yönlendirilir */
export default function KurumIndirimKodlariYonlendir() {
  const router = useRouter();
  const panelYolu = usePanelYolu();
  useEffect(() => {
    router.replace(`${panelYolu}/kazancim`);
  }, [router, panelYolu]);
  return null;
}
