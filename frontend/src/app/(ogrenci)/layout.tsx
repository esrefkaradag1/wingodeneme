import { OgrenciShell } from './OgrenciShell';

export const dynamic = 'force-dynamic';

export default function OgrenciLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <OgrenciShell>{children}</OgrenciShell>;
}
