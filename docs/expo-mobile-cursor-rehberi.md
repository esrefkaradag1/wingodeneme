---
description: >-
  Expo + React Native mobil uygulama mimarisi, klasör yapısı, auth/API kalıpları
  ve EAS store dağıtımı. WingoDeneme mobil stack'inin başka projeye taşınabilir
  rehberi. Use when creating or extending a mobile app with Expo, expo-router,
  Zustand, Axios, push notifications, TestFlight, or Google Play.
globs: mobile/**/*.{ts,tsx,json},**/app.json,**/eas.json
alwaysApply: false
---

# Expo Mobil Uygulama Rehberi (Cursor Agent)

Bu dosya başka bir projede Cursor’ın mobil uygulamayı **aynı stack ve kalıplarla** kurması / sürdürmesi içindir.

**Nasıl kullan:** Diğer projede şunu yap:
1. Bu dosyayı kopyala → `.cursor/rules/expo-mobile.mdc` (veya `AGENTS.md` içine ekle)
2. Gerekirse `globs` yolunu projendeki `mobile/` klasörüne göre güncelle
3. Agent’a “mobil uygulamayı bu kurala göre kur” de

---

## Stack (zorunlu tercihler)

| Katman | Teknoloji | Not |
|--------|-----------|-----|
| Runtime | Expo SDK 57+ (managed) | Native Swift/Kotlin yazma; EAS ile build |
| UI | React Native + React 19 | TypeScript zorunlu |
| Routing | `expo-router` | Dosya tabanlı; `main`: `expo-router/entry` |
| State | Zustand | Global auth / platform seçimi |
| Persistence | `@react-native-async-storage/async-storage` | Token + kullanıcı |
| HTTP | Axios | JWT + refresh interceptor |
| Push | `expo-notifications` | Expo Push Token → backend |
| Build / Store | EAS Build + EAS Submit | TestFlight + Play Console |

**Yapma:**
- Ayrı iOS/Android native proje ile başlama (managed Expo kullan)
- Mobilde iş kuralı / DB erişimi tutma — her şey mevcut REST API üzerinden
- `useMemo` / `useCallback` varsayılan ekleme (gerekmedikçe)

---

## Klasör yapısı (hedef)

```
mobile/
├── app/                          # Ekranlar (expo-router)
│   ├── _layout.tsx               # Root: splash, auth hydrate, push listeners
│   ├── index.tsx                 # Token’a göre yönlendir
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar
│   │   ├── index.tsx
│   │   └── ...
│   └── feature/[id].tsx          # Dinamik stack ekranlar
├── src/
│   ├── api/client.ts             # Axios instance + interceptors
│   ├── store/auth.ts             # Zustand + AsyncStorage
│   ├── lib/
│   │   ├── config.ts             # EXPO_PUBLIC_API_URL
│   │   ├── push.ts               # Token kayıt + dinleyiciler
│   │   └── types.ts
│   ├── components/
│   └── theme/colors.ts
├── assets/                       # icon, splash, adaptive icons
├── app.json                      # bundleId, permissions, plugins
├── eas.json                      # build + submit profilleri
├── package.json
├── babel.config.js
└── tsconfig.json
```

Monorepo ise mobil, web backend’ine **import etmeden** sadece HTTP ile konuşur.

---

## Kurulum komutları

```bash
npx create-expo-app@latest mobile
cd mobile
npx expo install expo-router expo-linking expo-constants expo-status-bar \
  expo-splash-screen expo-font expo-notifications expo-device \
  expo-image-picker expo-linear-gradient expo-web-browser \
  @react-native-async-storage/async-storage \
  react-native-safe-area-context react-native-screens \
  react-native-gesture-handler react-native-reanimated
npm install axios zustand
```

`package.json`:
```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "start:clear": "expo start -c"
  }
}
```

Geliştirme:
```bash
EXPO_PUBLIC_API_URL=https://api.ornek.com/api/v1 npx expo start
```

---

## Config kalıpları

### `src/lib/config.ts`
```ts
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://PRODUCTION_API/api/v1';
```

### `app.json` (özet alanlar)
- `expo.name`, `expo.slug`, `expo.scheme`
- `ios.bundleIdentifier` (örn. `com.sirket.app`)
- `android.package` (aynı reverse-DNS)
- `plugins`: `expo-router`, `expo-notifications`, `expo-image-picker`, `expo-splash-screen`
- iOS: `ITSAppUsesNonExemptEncryption: false` (şifreleme sorusu yoksa)
- Push için iOS `UIBackgroundModes: ["remote-notification"]`
- `extra.eas.projectId` → `eas init` sonrası

### `eas.json` profilleri
- `development` — dev client / simulator
- `preview` — internal APK (Android)
- `production` — App Store IPA + Play AAB, `autoIncrement: true`
- `submit.production.ios.ascAppId` — App Store Connect Apple ID (rakam)
- `submit.production.android` — service account JSON + `track` + `releaseStatus: "draft"`

---

## Auth (zorunlu kalıp)

1. Login API → `{ token, refreshToken, kullanici }`
2. Zustand store’a yaz + AsyncStorage’a persist et
3. App açılışında `authHydrate()` çalıştır; bitmeden ana UI gösterme
4. Token yoksa `(auth)/login`, varsa `(tabs)`

### Axios interceptor kuralları
- Request: `Authorization: Bearer <token>` (+ proje özel header varsa ekle)
- Response 401: refresh endpoint’e git; başarılıysa orijinal isteği retry
- Refresh de 401/fail → `cikisYap()` ve login’e yönlendir
- FormData gönderirken `Content-Type` header’ını sil (boundary otomatik)

API hata mesajı: backend `mesaj` alanını kullanıcıya göster.

---

## Navigasyon kuralları

- Tab’lar: `app/(tabs)/_layout.tsx`
- Modal / detay: `app/` altında stack (tabs grubunun dışında)
- Push / deep link tıklanınca `router.push(...)` ile ilgili ekrana git
- Typed routes: `experiments.typedRoutes: true` (opsiyonel)

---

## Push bildirim kuralları

1. Kullanıcı login olduktan **sonra** (UI oturunca, ~1s) izin iste
2. Expo Push Token al → backend’e kaydet (`kullaniciId` + token + platform)
3. `bildirimDinleyicileriKur`: notification response → ekran yönlendir
4. Backend Expo Push API veya kendi push servisinle gönderir

Expo Go’da bazı native özellikler sınırlı olabilir; store build’de test et.

---

## UI / stil

- Ortak renkler: `src/theme/colors.ts`
- Paylaşılan bileşenler: `src/components/` (Button, ScreenHeader, Avatar…)
- Stil: `StyleSheet.create` (NativeWind yoksa bu stack’i bozma)
- Splash: native `expo-splash-screen` + kısa markalı React splash (min süre)

---

## Backend sözleşmesi

Mobil **ince client**tır. Beklenen endpoint örnekleri:
- `POST /auth/giris` → token + refresh + kullanıcı
- `POST /auth/token-yenile` → yeni token çifti
- `POST /kullanicilar/push-token` (veya eşdeğeri)
- Domain endpoint’leri: liste / detay / aksiyon

Response zarfı (bu projede):
```json
{ "basarili": true, "veri": {}, "mesaj": "opsiyonel hata" }
```

Yeni projede farklıysa `api/client.ts` ve type’ları ona göre uyarla; kalıp aynı kalsın.

---

## Store dağıtımı (EAS)

```bash
npm i -g eas-cli
cd mobile
eas login
eas init

# iOS → TestFlight
EAS_BUILD_NO_EXPO_GO_WARNING=true eas build --platform ios --profile production --auto-submit

# Android → Play (AAB, genelde draft)
EAS_BUILD_NO_EXPO_GO_WARNING=true eas build --platform android --profile production --auto-submit
```

**iOS checklist:** Apple Developer, App Store Connect app, bundle ID eşleşmesi, `ascAppId`, credentials (`eas credentials -p ios`)

**Android checklist:** Play Console app, aynı `applicationId`, service account JSON (git’e koyma), internal/production track + draft

---

## Agent’a görev verirken şablon prompt

```
mobile/ klasöründe Expo managed uygulama kur.
Stack: Expo + expo-router + TypeScript + Zustand + AsyncStorage + Axios.
Kurallar: .cursor/rules/expo-mobile.mdc dosyasındaki mimariyi birebir uygula.
API: EXPO_PUBLIC_API_URL; auth login + token yenileme interceptor.
Ekranlar: (auth)/login + (tabs) ana akış.
Push: expo-notifications, login sonrası token kaydı.
eas.json ve app.json production’a hazır olsun.
Native Swift/Kotlin yazma; backend’e dokunma (sadece HTTP client).
```

---

## Yeni özellik eklerken checklist

- [ ] Ekran `app/` altında doğru grupta mı?
- [ ] API çağrısı `src/api/client.ts` üzerinden mi?
- [ ] Auth gerektiriyorsa token interceptor’a güvenildi mi?
- [ ] Tipler `src/lib/types.ts` veya feature type dosyasında mı?
- [ ] iOS/Android izin metni `app.json` / plugin’de var mı?
- [ ] Push ile açılıyorsa deep-link handler güncellendi mi?

---

## Referans (WingoDeneme)

Kaynak repo yapısı: `mobile/`  
Örnek dosyalar: `src/api/client.ts`, `src/store/auth.ts`, `app/_layout.tsx`, `eas.json`, `TESTFLIGHT.md`, `GOOGLE_PLAY.md`

Bu rehber WingoDeneme mobil uygulamasının taşınabilir özetidir; domain ekranları (sınav, analiz vb.) projeye özeldir — **stack ve auth/API/EAS kalıpları** sabittir.
