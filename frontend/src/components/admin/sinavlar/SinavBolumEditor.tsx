'use client';

import { BookOpen, CheckCircle, ListChecks, ListPlus, Loader2, Trash2 } from 'lucide-react';
import KonuSecici from '@/components/admin/KonuSecici';
import { soruListeOnMetin } from '@/lib/soruCozumYardim';
import { altBolumYerelSiraHaritasi } from '@/lib/kitapcikBolumleri';
import { altBolumDagilimMetni, type SinavBolumForm } from '@/lib/sinav-konu-dagilim';

type KonuKaynak = {
  id: string;
  ad: string;
  ders: string;
  uniteAdi?: string | null;
};

export interface SinavdakiSoruOzeti {
  id: string;
  konuId: string;
  siraNo: number;
  metinHtml: string;
  zorluk?: string;
  onayDurumu?: 'ONAY_BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | string;
  olusturanId?: string | null;
}

interface SinavBolumEditorProps {
  bolumler: SinavBolumForm[];
  konular: KonuKaynak[];
  havuzKonuSayilari: Record<string, number>;
  oncelikliKapsam: 'TYT' | 'AYT' | null;
  soruSecimBekleniyor: boolean;
  sinavdakiSorular: SinavdakiSoruOzeti[];
  soruKaldiriliyorId: string | null;
  /** Öğretmen: şablon/bölüm düzeni kilitli; yalnızca soru seçimi */
  yapiSaltOkunur?: boolean;
  /** Öğretmen branşına ait dersler — boşsa tüm konular */
  izinliDersler?: string[] | null;
  /** Admin: atama bekleyen soruyu onayla */
  adminOnaylayabilir?: boolean;
  soruOnaylaniyorId?: string | null;
  onBolumEkle: () => void;
  onBolumSil: (bolumId: string) => void;
  onBolumAdGuncelle: (bolumId: string, ad: string) => void;
  onAltBolumEkle: (bolumId: string) => void;
  onAltBolumSil: (bolumId: string, altBolumId: string) => void;
  onAltBolumGuncelle: (
    bolumId: string,
    altBolumId: string,
    patch: Partial<{ ad: string; aciklama: string; soruBas: number | null; soruBit: number | null }>,
  ) => void;
  onAltBolumSatirEkle: (bolumId: string, altBolumId: string) => void;
  onAltBolumSatirSil: (bolumId: string, altBolumId: string, satirIdx: number) => void;
  onAltBolumSatirGuncelle: (
    bolumId: string,
    altBolumId: string,
    satirIdx: number,
    patch: Partial<{ konuId: string; adet: number }>,
  ) => void;
  onSoruSec: (konuId: string, konuAd: string) => void | Promise<void>;
  onSoruKaldir: (soruId: string) => void | Promise<void>;
  onSoruOnayla?: (soruId: string) => void | Promise<void>;
}

function altBolumToplamSoru(altBolum: SinavBolumForm['altBolumler'][number]): number {
  return altBolum.satirlar.reduce((toplam, satir) => toplam + (satir.adet || 0), 0);
}

export default function SinavBolumEditor({
  bolumler,
  konular,
  havuzKonuSayilari,
  oncelikliKapsam,
  soruSecimBekleniyor,
  sinavdakiSorular,
  soruKaldiriliyorId,
  yapiSaltOkunur = false,
  izinliDersler = null,
  adminOnaylayabilir = false,
  soruOnaylaniyorId = null,
  onBolumEkle,
  onBolumSil,
  onBolumAdGuncelle,
  onAltBolumEkle,
  onAltBolumSil,
  onAltBolumGuncelle,
  onAltBolumSatirEkle,
  onAltBolumSatirSil,
  onAltBolumSatirGuncelle,
  onSoruSec,
  onSoruKaldir,
  onSoruOnayla,
}: SinavBolumEditorProps) {
  const konuAdi = (kid: string) => konular.find((k) => k.id === kid);
  const dersIzinliMi = (ders?: string | null) => {
    if (!izinliDersler?.length) return true;
    if (!ders) return false;
    const d = ders.toLocaleLowerCase('tr-TR');
    return izinliDersler.some((x) => x.toLocaleLowerCase('tr-TR') === d);
  };

  return (
    <div className="space-y-4">
      {bolumler.map((bolum) => {
        const bolumToplam = bolum.altBolumler.reduce((toplam, altBolum) => toplam + altBolumToplamSoru(altBolum), 0);
        return (
          <div key={bolum.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bölüm adı</label>
                <input
                  value={bolum.ad}
                  onChange={(e) => onBolumAdGuncelle(bolum.id, e.target.value)}
                  className="input-field"
                  placeholder="Örn: Sözel Bölüm"
                  disabled={yapiSaltOkunur}
                  readOnly={yapiSaltOkunur}
                />
              </div>
              {!yapiSaltOkunur && (
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onAltBolumEkle(bolum.id)}
                  className="btn-secondary text-xs inline-flex items-center gap-1"
                >
                  <ListPlus className="w-4 h-4" /> Alt bölüm
                </button>
                <button
                  type="button"
                  onClick={() => onBolumSil(bolum.id)}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold"
                >
                  Bölümü sil
                </button>
              </div>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Bu bölümde <b>{bolumToplam}</b> soru planlandı.
            </p>

            {bolum.altBolumler.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 flex flex-col items-center gap-2">
                <BookOpen className="w-7 h-7 opacity-40" />
                Bu bölüm için henüz alt bölüm yok.
              </div>
            ) : (
              <div className="space-y-4">
                {bolum.altBolumler.map((altBolum) => {
                  const altToplam = altBolumToplamSoru(altBolum);
                  const onerilenAciklama = altBolumDagilimMetni(
                    altBolum.satirlar,
                    konular,
                    altBolum.soruBas ?? 1,
                  );
                  const aciklamaMetni = altBolum.aciklama.trim() || onerilenAciklama;
                  const yerelSiraHaritasi = altBolumYerelSiraHaritasi(altBolum.satirlar, sinavdakiSorular);

                  return (
                    <div
                      key={altBolum.id}
                      className="rounded-2xl border border-sky-100 bg-sky-50/30 p-4 space-y-4"
                    >
                      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                            Alt bölüm adı
                          </label>
                          <input
                            value={altBolum.ad}
                            onChange={(e) => onAltBolumGuncelle(bolum.id, altBolum.id, { ad: e.target.value })}
                            className="input-field"
                            placeholder="Örn: Türkçe Testi"
                            disabled={yapiSaltOkunur}
                            readOnly={yapiSaltOkunur}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full lg:w-56">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                              Soru başı
                            </label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={altBolum.soruBas ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                onAltBolumGuncelle(bolum.id, altBolum.id, {
                                  soruBas: raw === '' ? null : parseInt(raw, 10) || null,
                                });
                              }}
                              className="input-field"
                              placeholder="1"
                              disabled={yapiSaltOkunur}
                              readOnly={yapiSaltOkunur}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                              Soru sonu
                            </label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={altBolum.soruBit ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                onAltBolumGuncelle(bolum.id, altBolum.id, {
                                  soruBit: raw === '' ? null : parseInt(raw, 10) || null,
                                });
                              }}
                              className="input-field"
                              placeholder="40"
                              disabled={yapiSaltOkunur}
                              readOnly={yapiSaltOkunur}
                            />
                          </div>
                        </div>
                        {!yapiSaltOkunur && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onAltBolumSatirEkle(bolum.id, altBolum.id)}
                            className="btn-secondary text-xs inline-flex items-center gap-1"
                          >
                            <ListPlus className="w-4 h-4" /> Müfredat satırı
                          </button>
                          <button
                            type="button"
                            onClick={() => onAltBolumSil(bolum.id, altBolum.id)}
                            className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold"
                          >
                            Alt bölümü sil
                          </button>
                        </div>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-500">
                        Bu alt bölümde <b>{altToplam}</b> soru planlandı.
                        {altBolum.soruBas != null && altBolum.soruBit != null ? (
                          <>
                            {' '}
                            Kitapçıkta <b>{altBolum.soruBas}-{altBolum.soruBit}</b> aralığı.
                          </>
                        ) : null}
                      </p>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                          Bölüm açıklaması
                        </label>
                        <textarea
                          value={altBolum.aciklama}
                          onChange={(e) => onAltBolumGuncelle(bolum.id, altBolum.id, { aciklama: e.target.value })}
                          className="input-field min-h-[88px] resize-y"
                          placeholder={onerilenAciklama}
                          disabled={yapiSaltOkunur}
                          readOnly={yapiSaltOkunur}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          Kitapçık üst bilgisinde görünür. Boş bırakılırsa müfredat satırlarından otomatik üretilir.
                        </p>
                      </div>

                      <div className="rounded-xl border border-sky-200 bg-white p-3 text-[11px] leading-relaxed text-gray-800 font-serif">
                        <p>
                          <span className="font-sans font-bold">1.</span> {aciklamaMetni}
                        </p>
                      </div>

                      {altBolum.satirlar.length === 0 ? (
                        <div className="text-center py-6 rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
                          Bu alt bölüm için henüz müfredat satırı yok.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {altBolum.satirlar.map((row, satirIdx) => {
                            const kObj = konuAdi(row.konuId);
                            const bransUygun = dersIzinliMi(kObj?.ders);
                            const konuSorulari = sinavdakiSorular
                              .filter((soru) => soru.konuId === row.konuId)
                              .sort((a, b) => a.siraNo - b.siraNo);
                            const seciliSoruAdedi = konuSorulari.length;
                            const planAdet = row.adet > 0 ? row.adet : 0;
                            const adetUyumsuz = planAdet > 0 && seciliSoruAdedi > 0 && seciliSoruAdedi !== planAdet;

                            return (
                              <div
                                key={`${altBolum.id}-${satirIdx}-${row.konuId || 'empty'}`}
                                className={`rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-3 ${
                                  !bransUygun ? 'opacity-60' : ''
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                                  <div className="flex-1 min-w-0">
                                    {yapiSaltOkunur ? (
                                      <div className="input-field bg-gray-50 text-sm text-gray-700 py-2.5">
                                        {kObj ? `${kObj.ders} — ${kObj.ad}` : row.konuId || 'Konu seçilmedi'}
                                      </div>
                                    ) : (
                                      <KonuSecici
                                        konular={konular}
                                        value={row.konuId}
                                        onChange={(kid) =>
                                          onAltBolumSatirGuncelle(bolum.id, altBolum.id, satirIdx, { konuId: kid })
                                        }
                                        havuzSayilari={havuzKonuSayilari}
                                        oncelikliKapsam={oncelikliKapsam}
                                        placeholder="Konu seçin"
                                      />
                                    )}
                                    {kObj && (
                                      <p className="text-[10px] text-gray-400 mt-1 truncate">
                                        {kObj.ders}
                                        {kObj.uniteAdi ? ` · ${kObj.uniteAdi}` : ''}
                                        {!bransUygun ? ' · branşınız dışı' : ''}
                                      </p>
                                    )}
                                  </div>
                                  <div className="w-full sm:w-28">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                      Adet
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      step={1}
                                      value={row.adet > 0 ? row.adet : ''}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === '') {
                                          onAltBolumSatirGuncelle(bolum.id, altBolum.id, satirIdx, { adet: 0 });
                                          return;
                                        }
                                        const parsed = parseInt(raw, 10);
                                        if (!Number.isNaN(parsed)) {
                                          onAltBolumSatirGuncelle(bolum.id, altBolum.id, satirIdx, { adet: parsed });
                                        }
                                      }}
                                      onBlur={() => {
                                        if (row.adet < 1) {
                                          onAltBolumSatirGuncelle(bolum.id, altBolum.id, satirIdx, { adet: 1 });
                                        }
                                      }}
                                      className="input-field"
                                      disabled={yapiSaltOkunur}
                                      readOnly={yapiSaltOkunur}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2 items-end shrink-0">
                                    <button
                                      type="button"
                                      disabled={!row.konuId || soruSecimBekleniyor || !bransUygun}
                                      title={
                                        !bransUygun
                                          ? 'Bu konu branşınızın dışında.'
                                          : !row.konuId
                                            ? 'Önce konu seçin.'
                                            : soruSecimBekleniyor
                                              ? 'Sınav hazırlanıyor...'
                                              : 'Bu konudan soruları tek tek seçerek sınava ekleyin'
                                      }
                                      onClick={() => {
                                        if (!row.konuId || soruSecimBekleniyor || !bransUygun) return;
                                        void onSoruSec(row.konuId, kObj ? `${kObj.ders} — ${kObj.ad}` : 'Konu');
                                      }}
                                      className="px-3 py-2 rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                                    >
                                      {soruSecimBekleniyor ? (
                                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                                      ) : (
                                        <ListChecks className="w-3.5 h-3.5 shrink-0" />
                                      )}
                                      Soru seç
                                      {seciliSoruAdedi > 0 ? ` (${seciliSoruAdedi})` : ''}
                                    </button>
                                    {!yapiSaltOkunur && (
                                    <button
                                      type="button"
                                      onClick={() => onAltBolumSatirSil(bolum.id, altBolum.id, satirIdx)}
                                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold"
                                    >
                                      Sil
                                    </button>
                                    )}
                                  </div>
                                </div>

                                {row.konuId && (
                                  <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 p-3 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                                        Seçilen sorular
                                        {planAdet > 0 ? ` (${seciliSoruAdedi} / ${planAdet})` : ` (${seciliSoruAdedi})`}
                                      </p>
                                      {adetUyumsuz && (
                                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                          Planlanan adet ile seçim farklı
                                        </span>
                                      )}
                                    </div>
                                    {seciliSoruAdedi === 0 ? (
                                      <p className="text-xs text-gray-400">
                                        Bu konu için henüz soru seçilmedi. &quot;Soru seç&quot; ile ekleyin.
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {konuSorulari.map((soru) => {
                                          const kaldiriliyor = soruKaldiriliyorId === soru.id;
                                          const onayBekliyor = (soru.onayDurumu || 'ONAYLANDI') !== 'ONAYLANDI';
                                          const onaylaniyor = soruOnaylaniyorId === soru.id;
                                          return (
                                            <div
                                              key={soru.id}
                                              className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                                                onayBekliyor
                                                  ? 'border-amber-200 bg-amber-50/80'
                                                  : 'border-gray-100 bg-gray-50'
                                              }`}
                                            >
                                              <span className="text-[10px] font-mono text-gray-400 shrink-0 pt-0.5">
                                                #{yerelSiraHaritasi.get(soru.id) ?? soru.siraNo}
                                              </span>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-800 leading-snug line-clamp-2">
                                                  {soruListeOnMetin(soru.metinHtml, 140)}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                  {soru.zorluk && (
                                                    <span className="text-[10px] font-bold text-gray-500">
                                                      {soru.zorluk}
                                                    </span>
                                                  )}
                                                  {onayBekliyor && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                                      Onay bekliyor
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex flex-col gap-1 shrink-0">
                                                {adminOnaylayabilir && onayBekliyor && onSoruOnayla && (
                                                  <button
                                                    type="button"
                                                    disabled={onaylaniyor}
                                                    onClick={() => void onSoruOnayla(soru.id)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold disabled:opacity-50"
                                                  >
                                                    {onaylaniyor ? (
                                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                      <CheckCircle className="w-3.5 h-3.5" />
                                                    )}
                                                    Onayla
                                                  </button>
                                                )}
                                                {bransUygun && (
                                                <button
                                                  type="button"
                                                  disabled={kaldiriliyor}
                                                  onClick={() => void onSoruKaldir(soru.id)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold disabled:opacity-50"
                                                >
                                                  {kaldiriliyor ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                  ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  )}
                                                  Çıkar
                                                </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!yapiSaltOkunur && (
      <button type="button" onClick={onBolumEkle} className="btn-secondary text-xs inline-flex items-center gap-1">
        <ListPlus className="w-4 h-4" /> Bölüm ekle
      </button>
      )}
    </div>
  );
}
