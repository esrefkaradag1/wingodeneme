'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, BookOpen, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';

const PIE_RENKLER = ['#4F46E5', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B'];

export default function AdminAnalitikSayfasi() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analitik', 'detay'],
    queryFn: () => adminApi.analitik(),
  });

  const { data: gruplarData } = useQuery({
    queryKey: ['gruplar'],
    queryFn: () => adminApi.gruplar(),
  });

  const analitik = data?.data?.veri;
  const gruplar = gruplarData?.data?.veri || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const grupPieVerisi = gruplar.map((g: { ad: string; _count: { uyeler: number } }) => ({
    name: g.ad,
    value: g._count.uyeler,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analitiği</h1>
        <p className="text-gray-500 mt-1">Genel platform istatistikleri</p>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { ikon: Users, label: 'Toplam Öğrenci', deger: analitik?.toplamKullanici?.toLocaleString('tr-TR'), renk: 'indigo' },
          { ikon: BookOpen, label: 'Toplam Sınav', deger: analitik?.toplamSinav, renk: 'violet' },
          { ikon: CheckCircle, label: 'Tamamlanan', deger: analitik?.toplamKatilim?.toLocaleString('tr-TR'), renk: 'green' },
          { ikon: TrendingUp, label: 'Aktif Sınav', deger: analitik?.aktifSinavlar, renk: 'orange' },
        ].map((kart, i) => {
          const KartIkon = kart.ikon;
          return (
          <div key={i} className="card">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3
              ${kart.renk === 'indigo' ? 'bg-indigo-100' : kart.renk === 'violet' ? 'bg-violet-100' : kart.renk === 'green' ? 'bg-green-100' : 'bg-orange-100'}`}>
              <KartIkon className={`w-4 h-4 ${kart.renk === 'indigo' ? 'text-indigo-600' : kart.renk === 'violet' ? 'text-violet-600' : kart.renk === 'green' ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kart.deger || 0}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kart.label}</div>
          </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grup dağılımı */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Grup Dağılımı</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={grupPieVerisi}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {grupPieVerisi.map((_: unknown, index: number) => (
                  <Cell key={index} fill={PIE_RENKLER[index % PIE_RENKLER.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} öğrenci`, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Son hafta katılım */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Haftalık Katılım Trendi</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analitik?.sonHaftaKatilimlar || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="olusturuldu" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="_count" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Katılım" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grup detayları */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Grup İstatistikleri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gruplar.map((g: { id: string; ad: string; tur: string; _count: { uyeler: number; sinavlar: number } }) => (
              <div key={g.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 text-sm">{g.ad}</h3>
                  <span className="badge bg-indigo-100 text-indigo-700 text-xs">{g.tur}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-gray-900">{g._count.uyeler}</div>
                    <div className="text-xs text-gray-500">Üye</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-gray-900">{g._count.sinavlar}</div>
                    <div className="text-xs text-gray-500">Sınav</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
