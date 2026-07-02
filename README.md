# 🎓 WingoSınav — AI Destekli Online Sınav & Öğrenci Analitik Platformu

YKS (TYT/AYT) ve LGS hazırlık süreçleri için geliştirilmiş, yapay zeka destekli, üretim kalitesinde SaaS platformu.

## 📦 Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js 14 (App Router), TailwindCSS, Three.js, Zustand |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Veritabanı | PostgreSQL 15, Redis 7 |
| AI Servisi | OpenAI GPT-4, Claude 3 |
| Altyapı | Docker, Nginx, AWS S3 |

## 🗂 Proje Yapısı

```
wingodeneme/
├── frontend/          # Next.js uygulaması
├── backend/           # Node.js REST API
├── ai-service/        # AI mikro servisi
├── nginx/             # Reverse proxy yapılandırması
└── docker-compose.yml
```

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Docker & Docker Compose
- Node.js >= 20
- PostgreSQL 15
- Redis 7

### 1. Kurulum

```bash
cp .env.example .env
# .env dosyasını düzenle

docker-compose up -d
```

### 2. Veritabanı Kurulumu

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔐 Kullanıcı Rolleri

- **Öğrenci**: Sınav çözme, analiz görüntüleme, sosyal özellikler
- **Veli**: Öğrenci takibi, bildirimler, sonuç görüntüleme
- **Admin**: Sınav yönetimi, kullanıcı yönetimi, AI kontrol paneli

## 📊 Ana Özellikler

- ✅ Haftalık otomatik sınav sistemi (TYT/AYT/LGS)
- ✅ ÖSYM/MEB tarzı soru kitapçığı arayüzü (3 mod)
- ✅ Optik form okuma (AI tabanlı)
- ✅ Ulusal sıralama & yüzdelik hesaplama
- ✅ Konu bazlı performans analizi
- ✅ AI destekli çalışma planı
- ✅ Üniversite yerleşim tahmini
- ✅ Arkadaş sistemi & düello modu
- ✅ Kurs/öğretmen öneri motoru
- ✅ Tablet yazı desteği

## 📡 API Endpoint'leri

Tüm API endpoint'leri `/api/v1` prefix'i ile başlar.

Detaylı dokümantasyon: `http://localhost:4000/api/docs`

## 🏗 Mimari

Platform, mikroservis dostu modüler bir mimari kullanır:

```
[Client] → [Nginx] → [Frontend: 3000]
                   → [Backend API: 4000]
                   → [AI Service: 5000]
```
