# WingoDeneme — Google Play

## Package
- Application ID: `com.wingodeneme.mobile`
- EAS: `@lim10medya/wingo-sinav`

## Play Console (bir kez)
1. https://play.google.com/console → **Create app** → **WingoDeneme**
2. Package name: `com.wingodeneme.mobile`
3. API erişimi: **Setup → API access → Link Google Cloud project**
4. Service account oluştur → **Play Console’da Invite user** (Admin / Release to production yetkisi)
5. JSON key indir → örn. `mobile/google-play-service-account.json` (git’e ekleme)

## eas.json
```json
"android": {
  "serviceAccountKeyPath": "./google-play-service-account.json",
  "track": "internal",
  "releaseStatus": "draft"
}
```

## Telefon ekran görüntüleri (Play Console)
Klasör: `store/google-play/screenshots/`

| Dosya | Ekran |
|-------|--------|
| `gp-01-login.png` | Giriş |
| `gp-02-home.png` | Ana sayfa |
| `gp-03-sinavlar.png` | Sınavlar |
| `gp-04-analiz.png` | Analiz |
| `gp-05-profil.png` | Profil |
| `gp-06-sonuc.png` | Deneme sonucu |

Hepsi **1080×1920** (9:16), PNG, &lt; 2 MB — Google Play telefon gereksinimlerine uygun.

## Play Console geri bildirimleri (DEX / UX)

`app.json` içinde:
- **Kod karartma (R8):** `expo-build-properties` → `enableMinifyInReleaseBuilds` + `enableShrinkResourcesInReleaseBuilds`
- **Edge-to-edge:** `android.edgeToEdgeEnabled: true`
- **Büyük ekran:** `orientation: "default"` (yalnızca portrait kilidi kaldırıldı)

Bu değişiklikler **yeni production AAB** gerektirir; eski sürüm Play’de aynı uyarıyı gösterir.

```bash
cd mobile
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli@latest build --platform android --profile production --auto-submit --non-interactive
```

Sadece AAB üretip sonra yüklemek için:
```bash
npx eas-cli@latest build --platform android --profile production --non-interactive
npx eas-cli@latest submit -p android --latest --profile production --non-interactive
```
