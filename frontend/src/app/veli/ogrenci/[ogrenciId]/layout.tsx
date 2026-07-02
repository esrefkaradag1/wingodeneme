import { VeliOgrenciKoruyucu } from '@/components/veli/VeliOgrenciShell';

export default function VeliOgrenciLayout({ children }: { children: React.ReactNode }) {
  return <VeliOgrenciKoruyucu>{children}</VeliOgrenciKoruyucu>;
}
