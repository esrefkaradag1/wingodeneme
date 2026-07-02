import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminOturumKoruyucu } from '@/components/layout/AdminOturumKoruyucu';

export const dynamic = 'force-dynamic';

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AdminOturumKoruyucu>
      <AdminLayout>{children}</AdminLayout>
    </AdminOturumKoruyucu>
  );
}
