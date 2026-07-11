'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Brain,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Settings,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';

type YardimBolumu = {
  baslik: string;
  maddeler: string[];
};

type YardimIcerigi = {
  sayfa: string;
  ozet: string;
  ikon: LucideIcon;
  rozet: string;
  bolumler: YardimBolumu[];
};

type YardimKaydi = {
  eslesir: (pathname: string) => boolean;
  icerik: YardimIcerigi;
};

const YARDIM_KAYITLARI: YardimKaydi[] = [
  {
    eslesir: (pathname) => pathname === '/panel/paketler',
    icerik: {
      sayfa: 'Paket Yönetimi',
      ozet:
        'Bu ekranda paket oluşturur, gruba göre sınav seçer, tanıtım sınavlarını ayırır ve paket bazlı fiyatlandırmayı yönetirsiniz.',
      ikon: CreditCard,
      rozet: 'Paket Akışı',
      bolumler: [
        {
          baslik: 'Bu Sayfada Ne Yapılır?',
          maddeler: [
            'Mevcut paketleri kategoriye göre filtreleyebilir, yeni paket açabilir veya var olan paketi düzenleyebilirsiniz.',
            'Paketi bir üst/alt gruba bağlayarak sadece o havuza ait sınavların listelenmesini sağlayabilirsiniz.',
            'Ücretli sınavlar ile herkese açık tanıtım sınavlarını ayrı ayrı seçebilir, paketin vitrin davranışını netleştirebilirsiniz.',
          ],
        },
        {
          baslik: 'Önerilen Kullanım Sırası',
          maddeler: [
            'Önce kategori ve grup seçin; grup seçimi sınav listesini daraltır ve yanlış havuzdan sınav eklemenizi engeller.',
            'Ardından pakete dahil ücretli sınavları işaretleyin, gerekiyorsa herkese açık tanıtım sınavlarını ayrı bölümden seçin.',
            'Son aşamada normal fiyat, indirimli fiyat ve gerekiyorsa pakete özel kademeli fiyat alanlarını doldurup kaydedin.',
          ],
        },
        {
          baslik: 'Dikkat Edilecek Noktalar',
          maddeler: [
            'Tanıtım sınavları paketi satın almadan görünür; bu alanı ücretli sınav listesiyle karıştırmayın.',
            'Pakete özel kademe ayarı açılırsa, bu kurallar genel sınav marketi kademelerinden bağımsız çalışır.',
            'Takvim filtresi açıkken bazı sınavlar görünmeyebilir; eski veya pasif kayıtları görmek için sınav filtresini genişletin.',
          ],
        },
      ],
    },
  },
  {
    eslesir: (pathname) => pathname === '/panel/ai',
    icerik: {
      sayfa: 'AI Soru Üretimi',
      ozet:
        'Bu ekranda serbest üretim veya referans tabanlı akışla soru üretebilir, müfredat seçip sonucu soru bankasına kaydedebilirsiniz.',
      ikon: Brain,
      rozet: 'AI Üretim',
      bolumler: [
        {
          baslik: 'İki Temel Akış',
          maddeler: [
            'Serbest Üretim sekmesi, seçtiğiniz grup ve konuya göre sıfırdan soru üretir.',
            'Referans Tabanlı sekmesi ise PDF, görsel veya URL analiz edip benzer yapıda özgün soru üretir.',
            'Hangi akışta olursanız olun, doğru grup ve müfredat filtresi seçimi konu havuzunu doğrudan etkiler.',
          ],
        },
        {
          baslik: 'Önerilen Kullanım Sırası',
          maddeler: [
            'Önce grup seçin; gerekiyorsa YKS, LGS veya KPSS müfredat filtresini doğru seviyeye getirin.',
            'Sonra ders/konu, soru sayısı, zorluk, model ve görsel mod ayarlarını belirleyip üretimi başlatın.',
            'Üretim tamamlandıktan sonra sağ panelde soruları kontrol edin ve uygun olanları soru bankasına kaydedin.',
          ],
        },
        {
          baslik: 'Verimli Kullanım İpuçları',
          maddeler: [
            'Fizik, geometri, grafik veya tablo ağırlıklı sorularda görsel modu kapatmak yerine otomatik ya da SVG tercih edin.',
            'Referans analizinden sonra otomatik konu eşleşmesini mutlaka gözden geçirin; yanlış ders eşleşmesi bankaya hatalı kayıt açabilir.',
            'Öğretmen talimatı alanını sadece gerçekten gereken stil, zorluk veya format notları için kullanın; çok uzun yönlendirmeler kaliteyi düşürebilir.',
          ],
        },
      ],
    },
  },
  {
    eslesir: (pathname) => pathname === '/panel/sinavlar',
    icerik: {
      sayfa: 'Sınav Yönetimi',
      ozet:
        'Bu ekran sınav listesini yönetmek içindir; yeni sınav açabilir, yayın durumunu değiştirebilir ve her sınav için öğrenci, sonuç ve önizleme işlemlerine geçebilirsiniz.',
      ikon: BookOpen,
      rozet: 'Sınav Listesi',
      bolumler: [
        {
          baslik: 'Bu Sayfada Ne Yapılır?',
          maddeler: [
            'Sınav veya grup adıyla arama yapabilir, var olan sınavların tarihini, soru sayısını ve durumunu görebilirsiniz.',
            'Her satırdan önizleme, öğrenci atama, düzenleme, süre analizi ve sonuç ekranlarına hızlı geçiş yapılır.',
            'Taslak ve yayında durumları burada yönetilir; sınav hazır olmadan yayına almak yerine önce içerik kontrolü yapın.',
          ],
        },
        {
          baslik: 'Önerilen Kullanım Sırası',
          maddeler: [
            'Yeni sınav açtıktan sonra önce sınavın grup, tür ve zaman bilgilerini tamamlayın.',
            'Ardından soru ekleme ve önizleme kontrolünü yapın; kitapçık düzeni ve soru dağılımı oturduktan sonra öğrencileri atayın.',
            'Son aşamada sınavı yayına alın ve katılım başladıktan sonra sonuç ve süre analizi ekranlarını kullanın.',
          ],
        },
        {
          baslik: 'Pratik İpuçları',
          maddeler: [
            'Öğrenci sayısı butonu atanan öğrenci listesini açar; toplu kontrol için bunu düzenli kullanın.',
            'Önizleme ekranı, yayın öncesi en güvenli son kontroldür; özellikle LGS ve KPSS çoklu oturumlarda bu adıma atlamayın.',
            'Sınav silme işlemi geri alınmaz; eski bir sınavı korumak istiyorsanız silmek yerine taslakta bırakmayı düşünün.',
          ],
        },
      ],
    },
  },
  {
    eslesir: (pathname) => pathname === '/panel/sinavlar/yeni',
    icerik: {
      sayfa: 'Yeni Sınav Oluşturma',
      ozet:
        'Bu form yeni sınav kurmak içindir; grup seçimi, sınav türü, oturum planı, kitapçık ayarları ve soru atama akışını tek yerde toplar.',
      ikon: GraduationCap,
      rozet: 'Yeni Sınav',
      bolumler: [
        {
          baslik: 'Formu Nasıl Doldurmalısınız?',
          maddeler: [
            'Önce üst grup, gerekiyorsa alt grup seçin; sınavın erişeceği öğrenci havuzu bu seçimden belirlenir.',
            'Sonra sınav türünü seçin; LGS ve KPSS gibi çoklu oturumlu türlerde zaman alanları tek başlangıç-bitiş yerine oturum bazında düzenlenir.',
            'Kitapçık üst bilgileri ve kapak alanları opsiyoneldir ama baskı/önizleme kalitesi için mümkünse doldurulmalıdır.',
          ],
        },
        {
          baslik: 'Soru Ekleme Mantığı',
          maddeler: [
            'Şablondan doldur seçeneği hızlı başlangıç sağlar; özellikle standart LGS dağılımlarında zaman kazandırır.',
            'Banka havuzundan soru seçerken doğru grup ve konu havuzunda olduğunuzdan emin olun; yanlış grup sınava uygunsuz soru taşıyabilir.',
            'Soruları ekledikten sonra önizleme ve soru sayısı kontrolü yapmadan kaydetmeyin.',
          ],
        },
        {
          baslik: 'Yayın Öncesi Kontrol',
          maddeler: [
            'Başlangıç zamanı, bitiş zamanı veya oturum süreleri eksikse öğrenci tarafında sorun çıkar; kaydetmeden önce zaman bloklarını tek tek kontrol edin.',
            'Çoklu oturumlu sınavlarda oturum sırası ve ara süreleri özellikle tekrar gözden geçirilmelidir.',
            'Formu kapatmadan önce taslak olarak kaydedip liste ekranından önizleme yapmak güvenli bir akıştır.',
          ],
        },
      ],
    },
  },
  {
    eslesir: (pathname) => /^\/panel\/sinavlar\/[^/]+\/duzenle$/.test(pathname),
    icerik: {
      sayfa: 'Sınav Düzenleme',
      ozet:
        'Bu sayfada mevcut bir sınavın zamanlamasını, oturumlarını, kitapçık bilgilerini ve soru yapısını güncellersiniz.',
      ikon: Settings,
      rozet: 'Sınav Düzenleme',
      bolumler: [
        {
          baslik: 'Ne Zaman Bu Ekranı Kullanmalısınız?',
          maddeler: [
            'Sınav tarihi değiştiyse, oturum süreleri revize edildiyse veya kitapçık düzeni güncellenecekse bu ekranı kullanın.',
            'Yayın öncesi son kontrol veya müşteri geri bildirimi sonrası düzeltmeler için en doğru yer burasıdır.',
            'Yayında olan sınavlarda değişiklik yaparken öğrenci erişimini etkileyebilecek alanları dikkatli güncelleyin.',
          ],
        },
        {
          baslik: 'Güncelleme Akışı',
          maddeler: [
            'Önce grup ve sınav türünün doğru kaldığını doğrulayın; sonra zaman ve oturum bilgilerini güncelleyin.',
            'Soru dağılımı veya şablon değişecekse sınav içindeki soru yapısını tekrar gözden geçirin.',
            'Kaydettikten sonra önizleme sayfasını açarak kitapçık görünümünü ve soru sıralamasını yeniden kontrol edin.',
          ],
        },
        {
          baslik: 'Dikkat Edilecek Noktalar',
          maddeler: [
            'Yayınlanmış bir sınavda tarih veya süre değişikliği yaptıysanız, ilgili ekiplerin ve öğrencilerin bilgilendirildiğinden emin olun.',
            'Çoklu oturumlarda tek bir oturumu değiştirirken bağlantılı oturumların süre zincirini bozmayın.',
            'Eski veriyi tamamen silmek yerine düzenleme mantığıyla ilerleyin; sınav geçmişi için bu daha güvenlidir.',
          ],
        },
      ],
    },
  },
  {
    eslesir: (pathname) => pathname === '/panel/sorular',
    icerik: {
      sayfa: 'Soru Bankası',
      ozet:
        'Bu ekran onay, filtre, toplu işlem ve sınava/gruba atama gibi soru bankası operasyonlarını merkezi olarak yönetir.',
      ikon: FileText,
      rozet: 'Soru Havuzu',
      bolumler: [
        {
          baslik: 'Temel İşlemler',
          maddeler: [
            'Müfredat, ders, konu, onay durumu ve arama alanlarıyla soru havuzunu daraltabilirsiniz.',
            'AI ile üretilen sorular burada incelenir; yalnızca onaylanan sorular öğrenci sınavlarında kullanılmalıdır.',
            'Tekil düzenleme yanında toplu onay, toplu silme, toplu kazanım ekleme ve gruba atama işlemleri de yapılabilir.',
          ],
        },
        {
          baslik: 'Önerilen Kullanım Şekli',
          maddeler: [
            'Önce doğru müfredat ve konu filtresini seçin; sonra bekleyen AI sorularını kalite açısından gözden geçirin.',
            'Seçilen soruları uygunsa toplu onaylayın, gerekirse uygun grup veya sınav havuzuna bağlayın.',
            'Büyük veri temizliği yapacaksanız önce filtreyi daraltın; yanlış toplu işlem riskini bu şekilde azaltırsınız.',
          ],
        },
        {
          baslik: 'Kalite Kontrol İpuçları',
          maddeler: [
            'AI etiketi taşıyan sorularda şık, doğru cevap ve çözüm tutarlılığına özellikle bakın.',
            'Toplu silme yerine önce filtreyle küçük bir alt küme üzerinde çalışmak daha güvenlidir.',
            'Sınavlarda görünmeyen bir soruda ilk kontrol edilmesi gereken alan genellikle onay durumu ve uygun grup bilgisidir.',
          ],
        },
      ],
    },
  },
  {
    eslesir: (pathname) => pathname === '/panel/gruplar',
    icerik: {
      sayfa: 'Gruplar',
      ozet:
        'Gruplar ekranı öğrenci havuzlarını ve bunların üst/alt yapısını yönetir; sınav, paket ve soru ilişkilendirmesi bu yapıya dayanır.',
      ikon: FolderOpen,
      rozet: 'Grup Yapısı',
      bolumler: [
        {
          baslik: 'Grup Mantığı',
          maddeler: [
            'Üst grup genel kademe veya ana kategori içindir; alt grup ise daha dar öğrenci havuzu için kullanılır.',
            'Sınav, paket ve bazı banka işlemleri grup ilişkisine göre filtrelendiği için grup yapısı düzgün kurulmalıdır.',
            'Yanlış grup eşleşmesi, içeriklerin farklı platform veya müfredat havuzlarında görünmesine neden olabilir.',
          ],
        },
        {
          baslik: 'Kullanım Önerisi',
          maddeler: [
            'Önce ana grubu oluşturun, ardından gerçekten ihtiyaç varsa alt grupları ekleyin.',
            'İsimlendirmede net ve tekrar etmeyen yapılar kullanın; paket ve sınav sayfaları bu etiketleri doğrudan gösterir.',
            'Bir grubu silmeden önce o gruba bağlı sınav, paket veya kullanıcı ilişkilerini kontrol edin.',
          ],
        },
        {
          baslik: 'Dikkat',
          maddeler: [
            'Grup pasifleştirme ile silme aynı şey değildir; geçmiş kayıtları korumak istiyorsanız önce pasife alma yaklaşımını düşünün.',
            'Platformlar arası karışıklık yaşamamak için KPSS ve YKS/LGS havuzlarını isimlendirmede açık tutun.',
            'Havuz özetini kullanarak grubun ne kadar içerik taşıdığını hızlıca görebilirsiniz.',
          ],
        },
      ],
    },
  },
  {
    eslesir: (pathname) => pathname === '/panel/egitim-materyali',
    icerik: {
      sayfa: 'Eğitim Materyali',
      ozet:
        'Bu ekran kaynak doküman, PDF ve bağlantıları sisteme besleyerek AI üretim ve RAG tabanlı akışların daha iyi çalışmasını sağlar.',
      ikon: Sparkles,
      rozet: 'Kaynak Besleme',
      bolumler: [
        {
          baslik: 'Bu Sayfa Ne İçin Kullanılır?',
          maddeler: [
            'Ders, konu ve öğretim türüne bağlı materyalleri sisteme ekleyip indekslenmesini sağlarsınız.',
            'AI soru üretimi ve referans akışları bu materyallerden faydalanabilir; kaliteli kaynak girişi sonuç kalitesini yükseltir.',
            'Dosya yükleme, URL ile besleme ve yeniden işleme gibi işlemler bu ekranda toplanır.',
          ],
        },
        {
          baslik: 'Önerilen Akış',
          maddeler: [
            'Önce doğru öğretim türü ve dersi seçin; sonra belge başlığı ve kaynak bilgisini net girin.',
            'Yükleme sonrası dokümanın işlendiğini ve beklenen konu altında listelendiğini kontrol edin.',
            'Güncel olmayan veya yanlış etiketlenmiş içerikleri silmek yerine gerekiyorsa yeniden işleyin ya da doğru metadata ile güncelleyin.',
          ],
        },
        {
          baslik: 'Kalite İpuçları',
          maddeler: [
            'Net konu adı ve kademe bilgisi girilmeyen belgeler AI tarafında yanlış eşleşmelere yol açabilir.',
            'Aynı dokümanın çok sayıda kopyasını eklemek yerine tek temiz sürüm kullanmak daha iyi arama sonucu üretir.',
            'Büyük dosyalarda yükleme tamamlandıktan sonra birkaç saniye bekleyip indeks durumunu tekrar kontrol edin.',
          ],
        },
      ],
    },
  },
];

const GENEL_YARDIM: YardimIcerigi = {
  sayfa: 'Yönetim Paneli',
  ozet:
    'Bu yardım penceresi bulunduğunuz ekrana göre kullanım rehberi gösterir. Sayfa özel anlatım olmayan bölümlerde genel panel çalışma mantığını özetler.',
  ikon: HelpCircle,
  rozet: 'Genel Yardım',
  bolumler: [
    {
      baslik: 'Paneli Verimli Kullanmak İçin',
      maddeler: [
        'Önce soldaki menüden doğru modüle geçin; çoğu içerik ekranı grup, müfredat veya durum filtreleriyle çalışır.',
        'Kayıt açmadan önce platformın YKS/LGS mi yoksa KPSS mi olduğuna dikkat edin; üst bardaki platform geçişi bunun içindir.',
        'Listelerde işlem yapmadan önce arama ve filtre alanlarını kullanmak yanlış kayıt üzerinde çalışma riskini azaltır.',
      ],
    },
    {
      baslik: 'Ortak Çalışma Mantığı',
      maddeler: [
        'Yeni kayıtlar genellikle taslak ya da pasif mantığıyla açılır; kontrol etmeden hemen yayına almak yerine önce önizleme yapın.',
        'Grup, müfredat ve onay durumu birçok ekranda birbirine bağlı çalışır; bir yerde görünmeyen veri çoğunlukla bu üç alandan dolayı kaybolur.',
        'Toplu işlemler güçlüdür; çok kayıt seçmeden önce filtreyi daraltmak güvenli bir çalışma alışkanlığıdır.',
      ],
    },
  ],
};

function yardimIcerigiSec(pathname: string): YardimIcerigi {
  return YARDIM_KAYITLARI.find((kayit) => kayit.eslesir(pathname))?.icerik ?? GENEL_YARDIM;
}

export function AdminPageHelp({ pathname }: { pathname: string }) {
  const [acik, setAcik] = useState(false);
  const icerik = useMemo(() => yardimIcerigiSec(pathname), [pathname]);
  const Ikon = icerik.ikon;

  useEffect(() => {
    setAcik(false);
  }, [pathname]);

  useEffect(() => {
    if (!acik) return;

    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const tusDinleyici = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAcik(false);
    };

    window.addEventListener('keydown', tusDinleyici);
    return () => {
      document.body.style.overflow = oncekiOverflow;
      window.removeEventListener('keydown', tusDinleyici);
    };
  }, [acik]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-label={`${icerik.sayfa} yardımını aç`}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Sayfa Yardımı</span>
      </button>

      {acik && typeof document !== 'undefined'
        ? createPortal(
        <div className="fixed inset-0 z-[220] flex items-start justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm sm:px-6 sm:py-10">
          <div
            className="absolute inset-0"
            onClick={() => setAcik(false)}
            role="presentation"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-page-help-title"
            className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Ikon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700">
                      {icerik.rozet}
                    </span>
                    <h2 id="admin-page-help-title" className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                      {icerik.sayfa}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                      {icerik.ozet}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAcik(false)}
                  aria-label="Yardım penceresini kapat"
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <div className="space-y-4">
                {icerik.bolumler.map((bolum) => (
                  <section
                    key={bolum.baslik}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      {bolum.baslik}
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {bolum.maddeler.map((madde) => (
                        <li key={madde} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                          <span>{madde}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  );
}
