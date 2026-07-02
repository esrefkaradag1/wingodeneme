import * as Lucide from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const yedek: LucideIcon = Lucide.Circle;

export function lucideIkonAl(adi: string): LucideIcon {
  const I = (Lucide as unknown as Record<string, LucideIcon | undefined>)[adi];
  return I ?? yedek;
}
