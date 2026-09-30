# Kapya Akademi (Edulim) → WingoDeneme partner kayıt / SSO

## Ortak
- Secret: `KAPYA_PARTNER_JWT_SECRET` veya `WINGO_JWT_SECRET` (HS256, TTL ≤ 300 sn)
- Partner: `kapya`

---

## Öğrenci SSO
1. Kapya → `https://www.wingodeneme.com/kayit?partner=kapya&t=<JWT>`
2. `POST /api/v1/auth/partner/giris`
3. Hesap varsa / yoksa otomatik oluştur → `/dashboard`
4. Claim: `type=student` (veya type yok + öğrenci alanları)
5. **Kurum bağlama:**
   - JWT’de `org_ref` (örn. `WINGO-5LEHQC`) varsa o kuruma bağlanır
   - Yoksa öğrenci e-postası ile kurum hesabı **aynı domain**’deyse (örn. `@kapyaakademi.com`, gmail değil) otomatik bağlanır
   - Kurum paneli özet/öğrenci listesi de aynı domain’deki bağsız öğrencileri senkronlar

## Kurum SSO
1. Kapya → `https://www.wingodeneme.com/kurum?partner=kapya&t=<JWT>`
2. `POST /api/v1/auth/partner/kurum-giris`
3. Eşleme sırası: `org_ref` → `org_email` → `email`
4. Yoksa `org_*` / `email` ile KURUMSAL hesap oluştur → `/kurum/dashboard`
5. **Eski Kapya formatı** (`type` / `org_*` yok, yalnızca `partner` + `email`) de kabul edilir.
6. Claim örneği (önerilen):

```json
{
  "partner": "kapya",
  "type": "kurum",
  "role": "institution",
  "email": "info@kapyaakademi.com",
  "first_name": "Abdullah Taha",
  "last_name": "Uslu",
  "org_name": "Kapya Akademi",
  "org_email": "info@kapyaakademi.com",
  "org_phone": "+905059445352",
  "org_ref": "WINGO-5LEHQC",
  "iat": 0,
  "exp": 0,
  "jti": "uuid"
}
```

## API
| Endpoint | Açıklama |
|----------|----------|
| `POST /auth/partner/giris` | Öğrenci SSO |
| `POST /auth/partner/kurum-giris` | Kurum SSO |
| `POST /auth/partner/dogrula` | Öğrenci prefill (eski) |
