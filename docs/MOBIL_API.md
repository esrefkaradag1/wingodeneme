# Wingo Deneme — Mobil Uygulama API Dokümantasyonu

Bu doküman, Wingo Deneme backend’inden veri çeken **mobil uygulamanın** (React Native / Flutter / native) geliştirilmesi için hazırlanmıştır.

| | |
|---|---|
| API prefix | `/api/v1` |
| Yerel örnek | `http://localhost:4000/api/v1` |
| Prod örnek | `https://<API_HOST>/api/v1` |
| Protokol | HTTPS (prod), JSON |
| Auth | `Authorization: Bearer <access_token>` |
| Platform | `X-Platform-Mode: kpss` veya `yks_lgs` |

Kaynak kod: `backend/src/server.ts`, `backend/src/routes/*`, web istemci referansı: `frontend/src/lib/api.ts`.

---

## 1. Temel kavramlar

### 1.1 Yanıt zarfı

Başarılı:

```json
{
  "basarili": true,
  "veri": { },
  "mesaj": "opsiyonel"
}
```

Hatalı:

```json
{
  "basarili": false,
  "mesaj": "İnsan okunabilir hata",
  "veri": {}
}
```

- Ayrı bir `errorCode` alanı **yoktur**. Mobilde **HTTP status + `mesaj`** kullanın.
- Tipik status: `400` validasyon, `401` auth, `403` yetki, `404` yok, `409` çakışma, `429` rate limit, `500` sunucu.

### 1.2 Zorunlu header’lar

```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...
X-Platform-Mode: kpss
```

| Header | Açıklama |
|--------|----------|
| `Authorization` | Giriş sonrası access JWT |
| `X-Platform-Mode` | `kpss` → KPSS içerik filtresi; `yks_lgs` (veya boş) → YKS/LGS |

**Önemli:** Aynı kullanıcı hesabı her iki platformda da çalışabilir; sınav/paket listeleri bu header’a göre filtrelenir. Uygulamada platform seçimi (veya ayrı build / flavor) yapıp header’ı her istekte gönderin.

### 1.3 Token’lar

| Token | Kullanım | Varsayılan süre |
|-------|----------|-----------------|
| `token` (access) | Tüm korumalı istekler | ~7 gün (`JWT_EXPIRES_IN`) |
| `refreshToken` | Access yenileme | ~30 gün |

401 alınca:

1. `POST /auth/token-yenile` `{ "refreshToken": "..." }`
2. Yeni `token` + `refreshToken` kaydet
3. Orijinal isteği tekrarla  
Başarısızsa oturumu kapat → login ekranı.

### 1.4 Roller

```
OGRENCI | VELI | TEACHER | KOC | ADMIN | SUPER_ADMIN
```

Mobil MVP için öncelik: **OGRENCI**. İsteğe bağlı ikinci faz: **VELI**, **KOC**.

---

## 2. Ortam / base URL

| Değişken | Anlam |
|----------|--------|
| `NEXT_PUBLIC_API_URL` / `API_URL` | Web’de kullanılan public API (mobilde kendi config) |
| `API_PORT` | Backend port (lokal `4000`) |

Mobil config örneği:

```json
{
  "apiBaseUrl": "https://api.ornek.com/api/v1",
  "platformMode": "yks_lgs"
}
```

`/api/v1` path’inin sonunda olduğundan emin olun.

---

## 3. Öğrenci uygulaması — önerilen ekran → API eşlemesi

| Ekran | Endpoint’ler |
|-------|----------------|
| Splash / oturum | `GET /auth/me`, `POST /auth/token-yenile` |
| Giriş | `POST /auth/giris` |
| Kayıt | `POST /auth/kayit` |
| Ana sayfa / rozetler | `GET /kullanicilar/nav-sayaclari`, `GET /duyurular/benim`, `GET /bildirimler` |
| Sınav listem | `GET /sinavlar/` |
| Takvim | `GET /sinavlar/takvim?yil=&ay=` veya `GET /public/sinav-takvim` |
| Sınav çöz | `POST /sinavlar/:id/katil` → taslak → gönder |
| Sonuç / karne | `GET /sinavlar/katilim/:id/sonuc`, `.../karnesi` |
| Analiz | `GET /analiz/benim`, `GET /analiz/oneriler` |
| Market | `GET /paketler/aktif`, `GET /paketler/aktif/:id` |
| Satın alma | `POST /paketler/satin-al`, siparişler |
| Profil | `GET/PUT /kullanicilar/profil` |
| Destek | `GET/POST /destek/benim` |
| Bildirimler | `GET /bildirimler`, `PATCH .../oku` |

---

## 4. Auth

### 4.1 Giriş

`POST /auth/giris`

```json
{ "email": "ogrenci@mail.com", "sifre": "Sifre123" }
```

Başarı `veri`:

```json
{
  "token": "<jwt>",
  "refreshToken": "<jwt>",
  "kullanici": {
    "id": "cuid",
    "email": "...",
    "rol": "OGRENCI",
    "ad": "...",
    "soyad": "...",
    "avatarUrl": null,
    "ogretimTuru": "YKS",
    "referansKod": null,
    "kocTipi": null
  }
}
```

Hatalar: `401` yanlış bilgi, `403` pasif / onay bekleyen hesap.

### 4.2 Öğrenci kayıt

`POST /auth/kayit`

Zorunlu alanlar (özet):

| Alan | Kural |
|------|--------|
| `email` | Geçerli e-posta |
| `sifre` | ≥8, 1 büyük harf, 1 rakam |
| `ad`, `soyad` | string |
| `telefon` | zorunlu, benzersiz |
| `tcKimlikNo` | zorunlu, geçerli TC |

Opsiyonel: `okul`, `sehir`, `ilce`, `sinif`, `ogretimTuru`, `hedefUniversite`, `hedefBolum`, `veli*`, `kocReferansKod`.

### 4.3 Diğer auth

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/auth/token-yenile` | `{ refreshToken }` → yeni token çifti |
| POST | `/auth/cikis` | Bearer; refresh temizlenir |
| GET | `/auth/me` | Bearer; tam kullanıcı + profil |
| POST | `/auth/sifremi-unuttum` | Kod iste |
| POST | `/auth/sifremi-unuttum/onayla` | Kod + yeni şifre |

Veli / öğretmen / koç / kurum kayıt endpoint’leri de `/auth/*` altında vardır; mobil öğrenci app’inde gerekmez.

---

## 5. Profil & navigasyon

| Method | Path | Body / not |
|--------|------|------------|
| GET | `/kullanicilar/profil` | Profil |
| PUT | `/kullanicilar/profil` | `ad,soyad,telefon,okul,sehir,ilce,adres,tcKimlikNo,sinif,hedefUniversite,hedefBolum` |
| PUT | `/kullanicilar/profil/sifre` | Şifre değiştir |
| POST | `/kullanicilar/koc-referans-bagla` | `{ kod }` |
| GET | `/kullanicilar/nav-sayaclari` | `{ duyurular, destek, arkadaslar, duello }` |
| GET | `/kullanicilar/study-planlar` | Çalışma planı |
| PATCH | `/kullanicilar/study-planlar/gorev/:gorevId` | `{ tamamlandi: true }` |

---

## 6. Sınav akışı (kritik)

### 6.1 Liste

`GET /sinavlar/`  
Öğrencinin erişebildiği sınavlar (grup / atama / paket hakkı). Platform header’a göre filtrelenir.

### 6.2 Takvim

`GET /sinavlar/takvim?yil=2026&ay=9`  
veya public: `GET /public/sinav-takvim?yil=&ay=`

### 6.3 Sınava katıl (başlat / devam)

`POST /sinavlar/:sinavId/katil`  
Body yok.

`veri` özeti:

```json
{
  "katilim": { "id": "...", "durum": "DEVAM_EDIYOR", "baslangicZamani": "..." },
  "sorular": [
    {
      "id": "...",
      "siraNo": 1,
      "metinHtml": "<p>...</p>",
      "gorselUrl": null,
      "secenekler": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "zorluk": "ORTA",
      "konuId": "...",
      "konu": { "ad": "...", "ders": "Matematik" }
    }
  ],
  "sureDakika": 120,
  "sinav": { "baslik": "...", "tur": "TYT" },
  "kayitliCevaplar": [{ "soruId": "...", "secilen": "A" }],
  "incelemeModu": false
}
```

- Çözüm sırasında **`dogruCevap` gelmez**.
- Süre bittiyse / erişim yoksa `400` / `403`.
- Daha önce tamamlandıysa `incelemeModu: true` olabilir.

### 6.4 Cevap taslağı (otomatik kayıt)

`POST /sinavlar/katilim/:katilimId/cevaplar/taslak`

```json
{
  "cevaplar": [
    { "soruId": "...", "secilen": "B", "sureMs": 15000 }
  ]
}
```

`secilen`: `"A"|"B"|"C"|"D"|"E"|null`  
Öneri: 20–30 sn’de bir veya sayfa değişiminde gönder.

### 6.5 Sınavı bitir

`POST /sinavlar/katilim/:katilimId/cevaplar`  
Aynı body formatı.

Başarı örneği:

```json
{
  "basarili": true,
  "veri": { "dogru": 80, "yanlis": 15, "bos": 5, "net": 76.25, "ham": 80 }
}
```

### 6.6 Sonuç & karne

| Method | Path |
|--------|------|
| GET | `/sinavlar/katilim/:katilimId/sonuc` |
| GET | `/sinavlar/katilim/:katilimId/karnesi` |
| GET | `/sinavlar/katilimlarim` |

### 6.7 Optik form (opsiyonel)

`POST /sinavlar/katilim/:katilimId/optik-form`  
`multipart/form-data`, alan adı: `form`, max ~10 MB.

### 6.8 Tek sınav / sepet satın alma

| Method | Path | Body |
|--------|------|------|
| POST | `/sinavlar/:id/satin-al` | ödeme alanları (öğrenci) |
| POST | `/sinavlar/sepet-satin-al` | seçili sınav sepeti |
| GET | `/sinavlar/fiyat-kademeleri` | Public kademe fiyatları |

---

## 7. Analiz

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/analiz/benim` | Net trendi, ders/konu performans, zayıf konular, süre analizi |
| GET | `/analiz/oneriler` | Öneri listesi (kurs/paket etiket eşleşmesi) |
| POST | `/analiz/net-simulasyon` | Net simülasyonu |
| GET | `/analiz/ulusal/:sinavId` | Ulusal karşılaştırma |

`/analiz/benim` çıktısı web’deki Analiz ekranının kaynağıdır; grafik için `dersPerformanslari`, `sinavGecmisi`, `zayifKonular` alanlarını kullanın.

---

## 8. Market / paket / ödeme

### 8.1 Liste & detay (public)

| Method | Path |
|--------|------|
| GET | `/paketler/kategoriler/aktif` |
| GET | `/paketler/aktif` |
| GET | `/paketler/aktif/:id` |

**Wingolink notu:** `disUrl` dolu paketler Wingo içinde satılmaz; kullanıcıyı dış linke yönlendirin (`Wingolink'te Satın Al`).

### 8.2 İndirim doğrula

`POST /paketler/indirim-kodu/dogrula` (Bearer)

```json
{ "kod": "INDIRIM10", "tutar": 999 }
```

### 8.3 Paket satın al

`POST /paketler/satin-al` (Bearer)

```json
{
  "paketId": "...",
  "odemeYontemi": "KREDI_KARTI",
  "indirimKodu": "opsiyonel",
  "notlar": "opsiyonel"
}
```

`odemeYontemi`: `KREDI_KARTI` | `HAVALE`

Yanıt senaryoları:

| Durum | Mobil aksiyon |
|-------|----------------|
| Ücretsiz | Hak anında açılır |
| Kredi kartı | `checkoutFormContent` / `paymentPageUrl` → **WebView** ile iyzico |
| Havale | `havale` objesini göster; sonra ödeme bildirimi |

Paket içi seçili deneme satın alma:

`POST /paketler/:id/sinavlar/satin-al`  
`{ "sinavIds": ["..."], "odemeYontemi": "KREDI_KARTI" }`

### 8.4 Siparişlerim

| Method | Path |
|--------|------|
| GET | `/kullanicilar/siparisler` |
| POST | `/kullanicilar/siparisler/:id/odeme-baslat` |
| POST | `/kullanicilar/siparisler/:id/odeme-bildirim` |
| POST | `/kullanicilar/siparisler/:id/iptal` |

Alternatif checkout: `POST /odeme/checkout` `{ "paketId" }`.

---

## 9. Bildirim, duyuru, destek

### Bildirim

| Method | Path |
|--------|------|
| GET | `/bildirimler?sayfa=1` |
| PATCH | `/bildirimler/:id/oku` |
| PATCH | `/bildirimler/tumunu-oku` |

Sayfalama: `sayfa` (boyut genelde 20). Yanıtta `toplam`, `sayfa`, `sayfaBoyutu`, `toplamSayfa`.

### Duyuru

| Method | Path |
|--------|------|
| GET | `/duyurular/benim` |
| PATCH | `/duyurular/benim/:id/oku` |

### Destek

| Method | Path |
|--------|------|
| GET | `/destek/benim` |
| POST | `/destek/benim` | Yeni talep |
| GET | `/destek/benim/:id` |
| POST | `/destek/benim/:id/mesaj` | Yanıt yaz |

---

## 10. Sosyal & üniversite (opsiyonel MVP+)

### Sosyal (`/sosyal/*`, OGRENCI)

Arkadaşlık, düello, kullanıcı arama. Web’deki sosyal özelliklerle aynı.

### Üniversite (`/universiteler/*`)

| Path | Açıklama |
|------|----------|
| `/ara`, `/tahmin` | Arama / tahmin |
| `/hedef`, `/hedeflerim` | Hedef bölüm |
| `DELETE /hedef/:bolumId` | Hedef sil |

---

## 11. Public (girişsiz)

| Method | Path | Amaç |
|--------|------|------|
| GET | `/public/site-icerik` | Landing / marka CMS |
| GET | `/public/sinav-takvim` | Takvim |
| GET | `/public/osym-ozet` | ÖSYM özet |
| POST | `/iletisim` | İletişim formu |
| GET | `/health` | Sağlık (prefix’siz: `GET /health`) |

---

## 12. Diğer roller (özet)

Mobilde ikinci uygulama veya aynı app’te role göre menü:

| Rol | Base |
|-----|------|
| VELI | `/veli/ozet`, `/veli/ogrenci/:id/{analiz,sinavlar,sonuc,...}` |
| KOC | `/koc/ozet`, `/koc/toplu-analiz`, `/koc/ogrenci/:id/...` |
| Kurum (KOC + kurumsal) | `/kurum/siniflar`, `/ogretmenler`, `/ogrenciler` |
| TEACHER / ADMIN | `/admin/*` — ağır panel; mobil admin genelde gerekmez |

Koç toplu analiz: `GET /koc/toplu-analiz?sinifId=opsiyonel`

---

## 13. Sayfalama & filtre kalıpları

| Parametre | Kullanım |
|-----------|----------|
| `sayfa` | 1-based sayfa |
| `boyut` | Sayfa boyutu (soru bankasında 1–100) |
| `yil`, `ay` | Takvim |
| `q` | Arama (bazı listeler) |
| `durum` | Filtre (destek, sipariş admin) |

Türkçe isimler: **`sayfa` / `boyut`** — `page` / `limit` değil (admin’de ara sıra `limit` olabilir).

---

## 14. Dosya yükleme

| Endpoint | Alan | Limit |
|----------|------|-------|
| `POST /sinavlar/katilim/:id/optik-form` | `form` | ~10 MB |
| `POST /referans/analiz` | `dosya` | ~30 MB (öğretmen) |
| `POST /ogretmen-onerileri/` | `gorseller` | 5×5 MB |

Öğrenci app’te pratikte optik form yeterlidir.

---

## 15. Socket.IO (opsiyonel)

- Aynı host üzerinde Socket.IO
- Auth: `io({ auth: { token: accessJwt } })`
- Oda: otomatik `kullanici:{userId}`
- Client event’ler: `sinava_katil`, `duello_odasina_katil`, `siralama_iste`
- Server: `siralama_guncellendi`

**Mobil not:** Serverless (Vercel) ortamda WebSocket güvenilir olmayabilir. Rozet/sonuç için önce **REST polling** (ör. 30–60 sn) tercih edin; Socket’i native uzun ömürlü Node deploy’da açın.

---

## 16. Rate limit & boyut

- `/api/`: ~500 istek / 15 dk (`RATE_LIMIT_MAX`)
- JSON body: max ~10 MB
- `429` → kullanıcıya “çok fazla istek” göster, geri çekil

---

## 17. CORS / mobil

Native mobil uygulama tarayıcı CORS’una tabi değildir; `Authorization` header serbestçe gönderilir.  
Expo Web / Capacitor WebView kullanırsanız API CORS listesine origin eklenmeli (`CORS_ORIGINS`).

---

## 18. Önerilen mobil mimari

```
[App]
  ├─ Config (apiBaseUrl, platformMode)
  ├─ AuthStore (token, refreshToken, kullanici)
  ├─ ApiClient
  │    ├─ intercept: Authorization + X-Platform-Mode
  │    └─ 401 → refresh → retry
  ├─ Features
  │    ├─ Auth / Profil
  │    ├─ Sinav (liste, çözücü WebView veya native HTML render)
  │    ├─ Analiz (grafik)
  │    ├─ Market (paket + iyzico WebView + havale)
  │    ├─ Destek / Duyuru / Bildirim
  │    └─ (opsiyonel) Sosyal, Üniversite
  └─ Offline
       └─ Cevap taslağını lokal kuyrukla; online olunca /taslak
```

### Soru metni (`metinHtml`)

Soru gövdesi HTML (+ MathJax / KaTeX ihtimali). Mobilde:

- **WebView** ile render, veya
- HTML → native rich text dönüştürücü

Görseller: `gorselUrl` absolute URL olabilir; HTTPS yükleyin.

### Ödeme (iyzico)

Kart ödemesinde dönen HTML/URL’yi **güvenli WebView**’de açın; callback sonrası sipariş durumunu `GET /kullanicilar/siparisler` ile doğrulayın.

---

## 19. Endpoint envanteri (öğrenci odaklı)

Tam mount listesi (`/api/v1` altında):

```
/public  /auth  /kullanicilar  /sinavlar  /analiz
/paketler  /odeme  /bildirimler  /duyurular  /destek
/sosyal  /universiteler  /ai
/veli  /koc  /kurum  /sorular  /admin  /referans
/iletisim  /ogretmen-onerileri  /soru-yazari-basvuru
```

Öğrenci MVP için yeterli minimum set:

1. Auth: kayit, giris, me, token-yenile, cikis  
2. Profil + nav-sayaclari  
3. Sinavlar: liste, katil, taslak, cevaplar, sonuc  
4. Analiz: benim  
5. Paketler: aktif, aktif/:id, satin-al  
6. Siparisler  
7. Bildirim + duyuru + destek  

---

## 20. Hızlı test checklist

- [ ] `X-Platform-Mode: yks_lgs` ile login → sınav listesi YKS/LGS  
- [ ] `X-Platform-Mode: kpss` ile aynı token → KPSS paket/sınav  
- [ ] Access expire → refresh çalışıyor  
- [ ] Sınav: katil → 2 taslak → bitir → sonuc  
- [ ] Ücretsiz paket / ücretli havale / kart WebView  
- [ ] `disUrl` paket → uygulama içi ödeme yok, dış link  
- [ ] Destek talebi oluştur + mesaj  
- [ ] Offline cevap kuyruğu (isteğe bağlı)

---

## 21. İletişim / genişletme

- Admin panel endpoint’leri (`/admin/*`) bu dokümanda özetlenmiştir; mobil admin gerekirse ayrı bir “Admin API” eki çıkarılmalıdır.
- Web istemci örnekleri: `frontend/src/lib/api.ts` (axios interceptor, platform header).
- Backend route tanımları: `backend/src/routes/*.ts`.

**Son güncelleme:** 2026-09-10 — mevcut `wingodeneme` backend’ine göre.
