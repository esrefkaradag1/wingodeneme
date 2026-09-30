# WingoDeneme — TestFlight

## Yapılanlar
- EAS proje: `@lim10medya/wingo-sinav` (`e341a9f1-59e7-42be-9214-9c1cc779de24`)
- `eas.json` — production iOS profili (`autoIncrement`)
- Bundle ID: `com.wingodeneme.mobile`
- Push + encryption export compliance (`ITSAppUsesNonExemptEncryption: false`)

## Senin yapman gereken (Apple girişi interaktif)

Terminalde `mobile` klasöründe:

```bash
cd mobile

# 1) iOS sertifika / profil (Apple ID + 2FA sorar) — bir kez yeterli
npx eas-cli@latest credentials -p ios

# 2) Build + TestFlight’a gönder
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli@latest build --platform ios --profile production --auto-submit
```

### App Store Connect App ID (`ascAppId`) — non-interactive submit için zorunlu
1. https://appstoreconnect.apple.com → **My Apps** → WingoDeneme  
2. **App Information** → **Apple ID** (sadece rakamlar, örn. `6751234567`)  
3. `eas.json` içine ekle:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "BURAYA_APPLE_ID"
    }
  }
}
```

4. Hazır build’i gönder:

```bash
npx eas-cli@latest submit -p ios --id e172f376-7468-46d8-b664-0dab410c48bb --profile production --non-interactive
```

### App Store Connect
1. https://appstoreconnect.apple.com → **My Apps** → **+** → iOS App  
2. Bundle ID: `com.wingodeneme.mobile`  
3. İsim: WingoDeneme  

İlk uygulamayı Connect’te oluşturmadan submit başarısız olabilir.

### ASC API Key (opsiyonel, CI için)
App Store Connect → Users and Access → Integrations → App Store Connect API  
Key indirdikten sonra:

```bash
eas credentials -p ios
# → App Store Connect API Key yükle
```

## Not
`--non-interactive` build, Apple credentials olmadan **çalışmaz**. İlk kurulum mutlaka interaktif Apple girişi ister.
