'use client';

import { createContext, useContext } from 'react';

/** Aynı ekranların iki ayrı yüzeyde çalışması için kök yol: bireysel koç (/koc) veya kurum (/kurum) */
export type PanelYolu = '/koc' | '/kurum';

const PanelYoluContext = createContext<PanelYolu>('/koc');

export function PanelYoluSaglayici({
  deger,
  children,
}: {
  deger: PanelYolu;
  children: React.ReactNode;
}) {
  return <PanelYoluContext.Provider value={deger}>{children}</PanelYoluContext.Provider>;
}

export function usePanelYolu(): PanelYolu {
  return useContext(PanelYoluContext);
}
