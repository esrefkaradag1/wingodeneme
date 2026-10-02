# WingoDeneme Mobile

Cross-platform (iOS / Android / Web) Expo uygulaması. **Mevcut Wingo Deneme backend’ine dokunmaz**; canlı API’den veri çeker.

## API

Varsayılan üretim:

`https://api.wingodeneme.com/api/v1`

Değiştirmek için:

```bash
EXPO_PUBLIC_API_URL=https://.../api/v1 npx expo start
```

Dokümantasyon: `../docs/MOBIL_API.md`

## Çalıştırma

```bash
cd mobile
npm install
npx expo start
```

- `i` → iOS simülatör  
- `a` → Android emülatör  
- Expo Go ile QR kod

## Özellikler (MVP)

- Giriş + token yenileme
- YKS/LGS ↔ KPSS platform seçimi (`X-Platform-Mode`)
- Ana sayfa, sınav listesi, sınav çözme (taslak + bitir), sonuç
- Market (Wingolink dış link), analiz, profil

Ödeme (iyzico WebView) ve kayıt akışı sonraki fazda eklenebilir; market şu an web / Wingolink’e yönlendirir.
