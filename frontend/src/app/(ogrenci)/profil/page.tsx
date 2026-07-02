'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock, Save, User } from 'lucide-react';
import { authApi, kullaniciApi } from '@/lib/api';
import { OGRENCI_SINIF_SECENEKLERI, siniftanOgretimTuru } from '@/lib/ogrenciKademe';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';

type ProfilVeri = {
  ad: string;
  soyad: string;
  okul?: string | null;
  sehir?: string | null;
  ilce?: string | null;
  sinif?: string | null;
  ogretimTuru?: string;
  hedefUniversite?: string | null;
  hedefBolum?: string | null;
  kullanici?: { email: string; telefon?: string | null };
};

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition';

export default function ProfilSayfasi() {
  const qc = useQueryClient();
  const { kullanici, girisYap } = useAuthStore();

  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [telefon, setTelefon] = useState('');
  const [okul, setOkul] = useState('');
  const [sehir, setSehir] = useState('');
  const [ilce, setIlce] = useState('');
  const [sinif, setSinif] = useState('');
  const [hedefUniversite, setHedefUniversite] = useState('');
  const [hedefBolum, setHedefBolum] = useState('');

  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ogrenci', 'profil'],
    queryFn: () => kullaniciApi.profilGetir(),
  });

  const profil: ProfilVeri | null = data?.data?.veri ?? null;
  const kademe = useMemo(() => siniftanOgretimTuru(sinif) ?? 'YKS', [sinif]);
  const lgs = kademe === 'LGS';

  useEffect(() => {
    if (!profil) return;
    setAd(profil.ad || '');
    setSoyad(profil.soyad || '');
    setTelefon(profil.kullanici?.telefon || '');
    setOkul(profil.okul || '');
    setSehir(profil.sehir || '');
    setIlce(profil.ilce || '');
    setSinif(profil.sinif || '');
    setHedefUniversite(profil.hedefUniversite || '');
    setHedefBolum(profil.hedefBolum || '');
  }, [profil]);

  const profilMut = useMutation({
    mutationFn: () =>
      kullaniciApi.profilGuncelle({
        ad: ad.trim(),
        soyad: soyad.trim(),
        telefon: telefon.trim() || null,
        okul: okul.trim() || null,
        sehir: sehir.trim() || null,
        ilce: ilce.trim() || null,
        sinif: sinif || null,
        hedefUniversite: lgs ? null : hedefUniversite.trim() || null,
        hedefBolum: lgs ? null : hedefBolum.trim() || null,
      }),
    onSuccess: async () => {
      toast.basarili('Profiliniz güncellendi.');
      qc.invalidateQueries({ queryKey: ['ogrenci', 'profil'] });
      try {
        const me = await authApi.me();
        const v = me.data.veri;
        if (v?.kullanici) {
          girisYap({
            kullanici: {
              id: v.kullanici.id,
              email: v.kullanici.email,
              rol: v.kullanici.rol,
              ad: v.ogrenciProfil?.ad ?? ad,
              soyad: v.ogrenciProfil?.soyad ?? soyad,
              ogretimTuru: siniftanOgretimTuru(sinif) ?? v.ogrenciProfil?.ogretimTuru,
            },
          });
        }
      } catch {
        girisYap({ kullanici: { ...kullanici!, ad, soyad, ogretimTuru: kademe } });
      }
    },
    onError: (e: { response?: { data?: { mesaj?: string } } }) =>
      toast.hata(e?.response?.data?.mesaj || 'Profil güncellenemedi'),
  });

  const sifreMut = useMutation({
    mutationFn: () => kullaniciApi.sifreDegistir({ mevcutSifre, yeniSifre }),
    onSuccess: () => {
      toast.basarili('Şifreniz güncellendi.');
      setMevcutSifre('');
      setYeniSifre('');
      setYeniSifreTekrar('');
    },
    onError: (e: { response?: { data?: { mesaj?: string } } }) =>
      toast.hata(e?.response?.data?.mesaj || 'Şifre güncellenemedi'),
  });

  const sifreKaydet = () => {
    if (yeniSifre !== yeniSifreTekrar) {
      toast.hata('Yeni şifreler eşleşmiyor');
      return;
    }
    if (yeniSifre.length < 8 || !/[A-Z]/.test(yeniSifre) || !/[0-9]/.test(yeniSifre)) {
      toast.hata('Şifre en az 8 karakter, bir büyük harf ve bir rakam içermeli');
      return;
    }
    sifreMut.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <section className="card !p-6">
        <div className="flex items-center gap-3">
          <span
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${lgs ? 'bg-blue-600' : 'bg-indigo-600'}`}
          >
            <User className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-gray-900">Profilim</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Kişisel bilgilerinizi ve şifrenizi buradan güncelleyebilirsiniz.
            </p>
          </div>
        </div>
      </section>

      <section className="card !p-6 space-y-5">
        <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Hesap bilgileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Ad</label>
            <input className={inputCls} value={ad} onChange={(e) => setAd(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Soyad</label>
            <input className={inputCls} value={soyad} onChange={(e) => setSoyad(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1.5">E-posta</label>
            <input className={`${inputCls} bg-gray-50 text-gray-500`} value={profil?.kullanici?.email || ''} disabled />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Telefon</label>
            <input
              className={inputCls}
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="05xx xxx xx xx"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Sınıf</label>
            <select className={inputCls} value={sinif} onChange={(e) => setSinif(e.target.value)}>
              <option value="">Seçin</option>
              {OGRENCI_SINIF_SECENEKLERI.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.etiket}
                </option>
              ))}
            </select>
            {sinif ? (
              <p className="text-xs text-gray-500 mt-1.5">
                Panel: <span className="font-bold">{kademe === 'LGS' ? 'LGS' : 'YKS'}</span>
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Okul</label>
            <input className={inputCls} value={okul} onChange={(e) => setOkul(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Şehir</label>
            <input className={inputCls} value={sehir} onChange={(e) => setSehir(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">İlçe</label>
            <input className={inputCls} value={ilce} onChange={(e) => setIlce(e.target.value)} />
          </div>
          {!lgs ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Hedef üniversite</label>
                <input
                  className={inputCls}
                  value={hedefUniversite}
                  onChange={(e) => setHedefUniversite(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Hedef bölüm</label>
                <input className={inputCls} value={hedefBolum} onChange={(e) => setHedefBolum(e.target.value)} />
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          disabled={profilMut.isPending}
          onClick={() => profilMut.mutate()}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 ${
            lgs ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {profilMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </button>
      </section>

      <section className="card !p-6 space-y-5">
        <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Şifre değiştir
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Mevcut şifre</label>
            <input
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={mevcutSifre}
              onChange={(e) => setMevcutSifre(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Yeni şifre</label>
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={yeniSifre}
              onChange={(e) => setYeniSifre(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Yeni şifre (tekrar)</label>
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={yeniSifreTekrar}
              onChange={(e) => setYeniSifreTekrar(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">En az 8 karakter, bir büyük harf ve bir rakam.</p>
        <button
          type="button"
          disabled={sifreMut.isPending || !mevcutSifre || !yeniSifre}
          onClick={sifreKaydet}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
        >
          {sifreMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Şifreyi güncelle
        </button>
      </section>
    </div>
  );
}
