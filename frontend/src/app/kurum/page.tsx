'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';

/** Aynı JWT için Strict Mode çift mount'ta tek istek */
const kurumSsoInFlight = new Map<string, Promise<unknown>>();

function KurumKokIcerik() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const girisYap = useAuthStore((s) => s.girisYap);
  const cikisYap = useAuthStore((s) => s.cikisYap);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const partner = (searchParams.get('partner') || '').trim().toLowerCase();
  const t = (searchParams.get('t') || '').trim();

  useEffect(() => {
    // SSO yoksa: oturum varsa panele, yoksa girişe
    if (partner !== 'kapya' || !t) {
      const { token, kullanici } = useAuthStore.getState();
      if (token && (kullanici?.rol === 'KOC' || kullanici?.kocTipi === 'KURUMSAL' || kullanici?.kocTipi === 'KURUM_OGRETMENI')) {
        router.replace('/kurum/dashboard');
      } else if (token) {
        router.replace('/kurum/dashboard');
      } else {
        router.replace('/giris');
      }
      return;
    }

    let iptal = false;

    void (async () => {
      setYukleniyor(true);
      setHata(null);
      // Eski oturumu temizle (effect deps'e token koyma — sonsuz döngü olmasın)
      cikisYap();
      try {
        let p = kurumSsoInFlight.get(t);
        if (!p) {
          // Başarıda Map'te bırak (Strict Mode remount aynı JWT'yi yeniden tüketmesin)
          p = authApi.partnerKurumGiris({ partner: 'kapya', t }).catch((e) => {
            kurumSsoInFlight.delete(t);
            throw e;
          });
          kurumSsoInFlight.set(t, p);
        }
        const res = (await p) as Awaited<ReturnType<typeof authApi.partnerKurumGiris>>;
        if (iptal) return;
        const v = res.data.veri as {
          token: string;
          refreshToken: string;
          kullanici: {
            id: string;
            email: string;
            rol: string;
            ad?: string;
            soyad?: string;
            referansKod?: string;
            kocTipi?: 'BIREYSEL' | 'KURUMSAL' | 'KURUM_OGRETMENI';
          };
          yonlendirme?: string;
          yeniHesap?: boolean;
        };
        if (!v?.token || !v?.refreshToken || !v?.kullanici) {
          throw new Error('Kurum oturumu açılamadı');
        }
        girisYap({ kullanici: v.kullanici, token: v.token, refreshToken: v.refreshToken });
        toast.basarili(
          v.yeniHesap ? 'Kurum hesabınız oluşturuldu' : 'Kapya ile kurum girişi',
          `${v.kullanici.ad || ''} · ${v.kullanici.email}`,
        );
        router.replace(v.yonlendirme || '/kurum/dashboard');
      } catch (err) {
        if (iptal) return;
        const mesaj =
          (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
          (err as { message?: string })?.message ||
          'Kapya kurum bağlantısı doğrulanamadı. Panelden tekrar deneyin.';
        setHata(mesaj);
        toast.hata(mesaj);
        setYukleniyor(false);
      }
    })();

    return () => {
      iptal = true;
    };
  }, [partner, t, router, girisYap, cikisYap]);

  if (hata) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Kurum girişi başarısız</h1>
          <p className="mt-2 text-sm text-slate-600">{hata}</p>
          <p className="mt-3 text-xs text-slate-400">
            Kapya panelinden Wingo Kurum’a tekrar tıklayın (bağlantı 5 dk geçerli).
          </p>
          <button
            type="button"
            onClick={() => router.replace('/giris')}
            className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Giriş sayfasına git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-slate-600">
        {yukleniyor ? 'Kapya ile kurum paneline bağlanılıyor…' : 'Yönlendiriliyor…'}
      </p>
    </div>
  );
}

export default function KurumKokSayfasi() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <KurumKokIcerik />
    </Suspense>
  );
}
