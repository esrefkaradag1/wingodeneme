--
-- PostgreSQL database dump
--

-- Dumped from database version 15.17
-- Dumped by pg_dump version 17.5 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: ArkadaslikDurumu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArkadaslikDurumu" AS ENUM (
    'BEKLIYOR',
    'KABUL_EDILDI',
    'REDDEDILDI',
    'ENGELLENDI'
);


--
-- Name: CevapYontemi; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CevapYontemi" AS ENUM (
    'DIJITAL',
    'OPTIK_FORM'
);


--
-- Name: DuelloDurumu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DuelloDurumu" AS ENUM (
    'DAVET_GONDERILDI',
    'KABUL_EDILDI',
    'DEVAM_EDIYOR',
    'TAMAMLANDI',
    'IPTAL'
);


--
-- Name: KatilimDurumu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."KatilimDurumu" AS ENUM (
    'BEKLIYOR',
    'DEVAM_EDIYOR',
    'TAMAMLANDI',
    'IPTAL'
);


--
-- Name: OdemeDurumu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OdemeDurumu" AS ENUM (
    'BEKLEMEDE',
    'TAMAMLANDI',
    'IPTAL_EDILDI',
    'HATA'
);


--
-- Name: OgretimTuru; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OgretimTuru" AS ENUM (
    'YKS',
    'LGS',
    'SINIF_6',
    'SINIF_7',
    'SINIF_10',
    'SINIF_11'
);


--
-- Name: Rol; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Rol" AS ENUM (
    'OGRENCI',
    'VELI',
    'ADMIN',
    'SUPER_ADMIN'
);


--
-- Name: SinavTuru; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SinavTuru" AS ENUM (
    'TYT',
    'AYT',
    'LGS'
);


--
-- Name: SoruOnayDurumu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SoruOnayDurumu" AS ENUM (
    'ONAY_BEKLIYOR',
    'ONAYLANDI',
    'REDDEDILDI'
);


--
-- Name: SoruZorlugu; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SoruZorlugu" AS ENUM (
    'KOLAY',
    'ORTA',
    'ZOR'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_profiller; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_profiller (
    id text NOT NULL,
    "kullaniciId" text NOT NULL,
    ad text NOT NULL,
    soyad text NOT NULL,
    "yetkiSeviye" integer DEFAULT 1 NOT NULL
);


--
-- Name: ai_analizler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_analizler (
    id text NOT NULL,
    "ogrenciId" text NOT NULL,
    "sinavId" text,
    "analizTipi" text NOT NULL,
    icerik jsonb NOT NULL,
    oneriler jsonb,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: arkadasliklar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arkadasliklar (
    id text NOT NULL,
    "ogrenciId" text NOT NULL,
    "arkadasId" text NOT NULL,
    durum public."ArkadaslikDurumu" DEFAULT 'BEKLIYOR'::public."ArkadaslikDurumu" NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bildirimler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bildirimler (
    id text NOT NULL,
    "kullaniciId" text NOT NULL,
    baslik text NOT NULL,
    mesaj text NOT NULL,
    tur text NOT NULL,
    okundu boolean DEFAULT false NOT NULL,
    "veriJson" jsonb,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: duellolar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duellolar (
    id text NOT NULL,
    "davetedenId" text NOT NULL,
    "davetEdilenId" text NOT NULL,
    "konuId" text,
    "soruSayisi" integer DEFAULT 10 NOT NULL,
    "sureDakika" integer DEFAULT 15 NOT NULL,
    durum public."DuelloDurumu" DEFAULT 'DAVET_GONDERILDI'::public."DuelloDurumu" NOT NULL,
    "davetciPuan" double precision,
    "davetEdilenPuan" double precision,
    kazanan text,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tamamlandi timestamp(3) without time zone
);


--
-- Name: grup_uyelikler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grup_uyelikler (
    id text NOT NULL,
    "grupId" text NOT NULL,
    "ogrenciId" text NOT NULL,
    "katilimTarih" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: gruplar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gruplar (
    id text NOT NULL,
    ad text NOT NULL,
    tur public."OgretimTuru" NOT NULL,
    aciklama text,
    aktif boolean DEFAULT true NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: konu_performanslari; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.konu_performanslari (
    id text NOT NULL,
    "ogrenciId" text NOT NULL,
    "konuId" text NOT NULL,
    "toplamSoru" integer DEFAULT 0 NOT NULL,
    "dogruSayisi" integer DEFAULT 0 NOT NULL,
    "yanlisSayisi" integer DEFAULT 0 NOT NULL,
    "basariYuzdesi" double precision DEFAULT 0 NOT NULL,
    "sonGuncelleme" timestamp(3) without time zone NOT NULL
);


--
-- Name: konular; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.konular (
    id text NOT NULL,
    ad text NOT NULL,
    ders text NOT NULL,
    "sinifSeviyesi" text,
    "ogretimTuru" public."OgretimTuru" NOT NULL,
    kazanimlar text[],
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: kullanicilar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kullanicilar (
    id text NOT NULL,
    email text NOT NULL,
    telefon text,
    sifre text NOT NULL,
    rol public."Rol" DEFAULT 'OGRENCI'::public."Rol" NOT NULL,
    aktif boolean DEFAULT true NOT NULL,
    "emailDogrulandi" boolean DEFAULT false NOT NULL,
    "dogrulamaKodu" text,
    "refreshToken" text,
    "fcmToken" text,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    guncellendi timestamp(3) without time zone NOT NULL
);


--
-- Name: kurslar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kurslar (
    id text NOT NULL,
    baslik text NOT NULL,
    aciklama text,
    ders text NOT NULL,
    konular text[],
    fiyat double precision,
    url text,
    platform text,
    puan double precision DEFAULT 0 NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ogrenci_cevaplar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ogrenci_cevaplar (
    id text NOT NULL,
    "katilimId" text NOT NULL,
    "soruId" text NOT NULL,
    secilen text,
    dogru boolean,
    "sureMs" integer,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ogrenci_profiller; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ogrenci_profiller (
    id text NOT NULL,
    "kullaniciId" text NOT NULL,
    ad text NOT NULL,
    soyad text NOT NULL,
    okul text,
    sehir text,
    ilce text,
    sinif text,
    "ogretimTuru" public."OgretimTuru" DEFAULT 'YKS'::public."OgretimTuru" NOT NULL,
    "avatarUrl" text,
    "hedefUniversite" text,
    "hedefBolum" text,
    puan integer DEFAULT 0 NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    guncellendi timestamp(3) without time zone NOT NULL,
    "veliId" text
);


--
-- Name: ogretmenler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ogretmenler (
    id text NOT NULL,
    ad text NOT NULL,
    soyad text NOT NULL,
    ders text NOT NULL,
    konular text[],
    biyografi text,
    "fotoUrl" text,
    "fiyatSaat" double precision,
    puan double precision DEFAULT 0 NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: oneriler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oneriler (
    id text NOT NULL,
    "ogrenciId" text NOT NULL,
    "ogretmenId" text,
    "kursId" text,
    neden text NOT NULL,
    oncelik integer DEFAULT 1 NOT NULL,
    tiklandimi boolean DEFAULT false NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: paketler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paketler (
    id text NOT NULL,
    ad text NOT NULL,
    aciklama text,
    fiyat double precision NOT NULL,
    "indirimliFiyat" double precision,
    "sinavSayisi" integer DEFAULT 0 NOT NULL,
    ozellikler jsonb,
    aktif boolean DEFAULT true NOT NULL,
    populer boolean DEFAULT false NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    guncellendi timestamp(3) without time zone NOT NULL
);


--
-- Name: satin_alimlar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.satin_alimlar (
    id text NOT NULL,
    "kullaniciId" text NOT NULL,
    "paketId" text NOT NULL,
    miktar double precision NOT NULL,
    durum public."OdemeDurumu" DEFAULT 'BEKLEMEDE'::public."OdemeDurumu" NOT NULL,
    "referansNo" text,
    notlar text,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    guncellendi timestamp(3) without time zone NOT NULL
);


--
-- Name: sinav_katilimlar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sinav_katilimlar (
    id text NOT NULL,
    "sinavId" text NOT NULL,
    "ogrenciId" text NOT NULL,
    durum public."KatilimDurumu" DEFAULT 'BEKLIYOR'::public."KatilimDurumu" NOT NULL,
    "cevapYontemi" public."CevapYontemi" DEFAULT 'DIJITAL'::public."CevapYontemi" NOT NULL,
    "baslangicZamani" timestamp(3) without time zone,
    "bitisZamani" timestamp(3) without time zone,
    "dogruSayisi" integer DEFAULT 0 NOT NULL,
    "yanlisSayisi" integer DEFAULT 0 NOT NULL,
    "bosSayisi" integer DEFAULT 0 NOT NULL,
    "netPuan" double precision DEFAULT 0 NOT NULL,
    "hamPuan" double precision DEFAULT 0 NOT NULL,
    "ulusalSiralama" integer,
    yuzdelik double precision,
    "optikFormUrl" text,
    "optikOkundu" boolean DEFAULT false NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    guncellendi timestamp(3) without time zone NOT NULL
);


--
-- Name: sinavlar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sinavlar (
    id text NOT NULL,
    baslik text NOT NULL,
    aciklama text,
    tur public."SinavTuru" NOT NULL,
    "grupId" text NOT NULL,
    "baslangicZamani" timestamp(3) without time zone NOT NULL,
    "bitisZamani" timestamp(3) without time zone NOT NULL,
    "sureDakika" integer DEFAULT 120 NOT NULL,
    aktif boolean DEFAULT true NOT NULL,
    yayinlandi boolean DEFAULT false NOT NULL,
    "kitapcikUrl" text,
    "cevapAnahtari" jsonb,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    guncellendi timestamp(3) without time zone NOT NULL,
    "kitapcikBolumAdi" text,
    "kitapcikTarihMetni" text,
    "konuDagilimi" jsonb
);


--
-- Name: site_genel_icerik; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_genel_icerik (
    id text NOT NULL,
    icerik jsonb DEFAULT '{}'::jsonb NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    guncellendi timestamp(3) without time zone NOT NULL
);


--
-- Name: sorular; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sorular (
    id text NOT NULL,
    "sinavId" text,
    "konuId" text NOT NULL,
    "siraNo" integer NOT NULL,
    "metinHtml" text NOT NULL,
    "gorselUrl" text,
    secenekler jsonb NOT NULL,
    "dogruCevap" text NOT NULL,
    zorluk public."SoruZorlugu" DEFAULT 'ORTA'::public."SoruZorlugu" NOT NULL,
    kazanim text,
    "aiUretildi" boolean DEFAULT false NOT NULL,
    "aiModeli" text,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "aiMeta" jsonb,
    "onayDurumu" public."SoruOnayDurumu" DEFAULT 'ONAYLANDI'::public."SoruOnayDurumu" NOT NULL
);


--
-- Name: sosyal_davetler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sosyal_davetler (
    id text NOT NULL,
    "gondericId" text NOT NULL,
    "aliciId" text,
    "aliciEmail" text,
    "davetKodu" text NOT NULL,
    kabul boolean DEFAULT false NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: study_gorevler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_gorevler (
    id text NOT NULL,
    "planId" text NOT NULL,
    baslik text NOT NULL,
    ders text NOT NULL,
    konu text NOT NULL,
    "sureDakika" integer NOT NULL,
    tamamlandi boolean DEFAULT false NOT NULL,
    gun integer NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: study_planlar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_planlar (
    id text NOT NULL,
    "ogrenciId" text NOT NULL,
    baslik text NOT NULL,
    baslangic timestamp(3) without time zone NOT NULL,
    bitis timestamp(3) without time zone NOT NULL,
    hedefler jsonb NOT NULL,
    aktif boolean DEFAULT true NOT NULL,
    "aiUretildi" boolean DEFAULT true NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: takvim_etkinlikler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.takvim_etkinlikler (
    id text NOT NULL,
    "grupId" text NOT NULL,
    baslik text NOT NULL,
    aciklama text,
    tarih timestamp(3) without time zone NOT NULL,
    renk text DEFAULT '#4F46E5'::text NOT NULL,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: universite_bolumler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universite_bolumler (
    id text NOT NULL,
    "universiteId" text NOT NULL,
    "bolumAdi" text NOT NULL,
    "sinavTuru" public."SinavTuru" NOT NULL,
    yil integer NOT NULL,
    "minPuan" double precision,
    "maxPuan" double precision,
    "minSiralama" integer,
    "maxSiralama" integer,
    kontenjan integer,
    "dolulukOrani" double precision
);


--
-- Name: universite_hedefler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universite_hedefler (
    id text NOT NULL,
    "ogrenciId" text NOT NULL,
    "bolumId" text NOT NULL,
    oncelik integer DEFAULT 1 NOT NULL,
    "tahminPuan" double precision,
    "tahminSiralama" integer,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: universiteler; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universiteler (
    id text NOT NULL,
    ad text NOT NULL,
    "kisaAd" text,
    sehir text NOT NULL,
    tur text NOT NULL,
    logo text
);


--
-- Name: veli_profiller; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.veli_profiller (
    id text NOT NULL,
    "kullaniciId" text NOT NULL,
    ad text NOT NULL,
    soyad text NOT NULL,
    telefon text,
    olusturuldu timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: admin_profiller; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_profiller (id, "kullaniciId", ad, soyad, "yetkiSeviye") FROM stdin;
cmmq03hek000138qfkgdc3dov	cmmq03hek000038qfr99zu7q4	Sistem	Admin	10
\.


--
-- Data for Name: ai_analizler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_analizler (id, "ogrenciId", "sinavId", "analizTipi", icerik, oneriler, olusturuldu) FROM stdin;
\.


--
-- Data for Name: arkadasliklar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.arkadasliklar (id, "ogrenciId", "arkadasId", durum, olusturuldu) FROM stdin;
\.


--
-- Data for Name: bildirimler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bildirimler (id, "kullaniciId", baslik, mesaj, tur, okundu, "veriJson", olusturuldu) FROM stdin;
cmn33tf8o000bcbxqnj7mzd58	cmn33tf8h0008cbxqs3bvhtyl	🎉 Veli hesabı oluşturuldu	Merhaba Esref! Öğrencinizi takip etmeye başlayabilirsiniz.	hos_geldiniz	f	\N	2026-03-23 11:30:13.993
\.


--
-- Data for Name: duellolar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.duellolar (id, "davetedenId", "davetEdilenId", "konuId", "soruSayisi", "sureDakika", durum, "davetciPuan", "davetEdilenPuan", kazanan, olusturuldu, tamamlandi) FROM stdin;
\.


--
-- Data for Name: grup_uyelikler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grup_uyelikler (id, "grupId", "ogrenciId", "katilimTarih") FROM stdin;
\.


--
-- Data for Name: gruplar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gruplar (id, ad, tur, aciklama, aktif, olusturuldu) FROM stdin;
yks-grup	YKS 2025	YKS	TYT ve AYT sınavlarına hazırlık grubu	t	2026-03-14 07:25:04.844
lgs-grup	LGS 2025	LGS	LGS sınavına hazırlık grubu	t	2026-03-14 07:25:04.847
\.


--
-- Data for Name: konu_performanslari; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.konu_performanslari (id, "ogrenciId", "konuId", "toplamSoru", "dogruSayisi", "yanlisSayisi", "basariYuzdesi", "sonGuncelleme") FROM stdin;
\.


--
-- Data for Name: konular; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.konular (id, ad, ders, "sinifSeviyesi", "ogretimTuru", kazanimlar, olusturuldu) FROM stdin;
konu-türev	Türev	Matematik	\N	YKS	{}	2026-03-14 07:25:04.849
konu-i̇ntegral	İntegral	Matematik	\N	YKS	{}	2026-03-14 07:25:04.85
konu-newton'un-hareket-yasaları	Newton'un Hareket Yasaları	Fizik	\N	YKS	{}	2026-03-14 07:25:04.851
konu-elektrik	Elektrik	Fizik	\N	YKS	{}	2026-03-14 07:25:04.851
konu-organik-kimya	Organik Kimya	Kimya	\N	YKS	{}	2026-03-14 07:25:04.852
konu-dizi-ve-seriler	Dizi ve Seriler	Matematik	\N	YKS	{}	2026-03-14 07:25:04.853
konu-paragraf	Paragraf	Türkçe	\N	YKS	{}	2026-03-14 07:25:04.856
konu-anlam-bilgisi	Anlam Bilgisi	Türkçe	\N	YKS	{}	2026-03-14 07:25:04.857
konu-çarpanlara-ayırma	Çarpanlara Ayırma	Matematik	\N	LGS	{}	2026-03-14 07:25:04.858
konu-hücre-ve-bölünme	Hücre ve Bölünme	Fen Bilimleri	\N	LGS	{}	2026-03-14 07:25:04.858
\.


--
-- Data for Name: kullanicilar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kullanicilar (id, email, telefon, sifre, rol, aktif, "emailDogrulandi", "dogrulamaKodu", "refreshToken", "fcmToken", olusturuldu, guncellendi) FROM stdin;
cmmq03hek000038qfr99zu7q4	admin@wingosinav.com	\N	$2a$12$MQFh9PbvN/7WpufVvEjhNOyLhKTONQ4DWi8JkMb9ITAPGYqsYv7Xq	SUPER_ADMIN	t	t	\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW1xMDNoZWswMDAwMzhxZnI5OXp1N3E0IiwiaWF0IjoxNzc0MzUxNDcyLCJleHAiOjE3NzY5NDM0NzJ9.M9YQVPEzdwaJbmlXsbSK98JVxLe8XfWBICoJYdyTeuI	\N	2026-03-14 07:25:04.604	2026-03-24 11:24:32.73
cmn33mp7s000b1179poozn8ir	veli@lim10medya.com.tr	\N	$2a$12$CRlu/4CBPggXsVulqtdg9.FEVY36SebTHiiudlpQkEpBAKf5qmfCK	VELI	t	f	\N	\N	\N	2026-03-23 11:25:00.329	2026-03-23 11:25:00.329
cmn33tf8h0008cbxqs3bvhtyl	esref@lim10medya.com	05324837974	$2a$12$aOCzkdKw4wCf0dcLclJ.oeW4ORZSDfYWFRBgCKqNylnivMEH/JLyq	VELI	t	f	\N	\N	\N	2026-03-23 11:30:13.985	2026-03-23 11:42:22.628
\.


--
-- Data for Name: kurslar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kurslar (id, baslik, aciklama, ders, konular, fiyat, url, platform, puan, olusturuldu) FROM stdin;
\.


--
-- Data for Name: ogrenci_cevaplar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ogrenci_cevaplar (id, "katilimId", "soruId", secilen, dogru, "sureMs", olusturuldu) FROM stdin;
\.


--
-- Data for Name: ogrenci_profiller; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ogrenci_profiller (id, "kullaniciId", ad, soyad, okul, sehir, ilce, sinif, "ogretimTuru", "avatarUrl", "hedefUniversite", "hedefBolum", puan, olusturuldu, guncellendi, "veliId") FROM stdin;
\.


--
-- Data for Name: ogretmenler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ogretmenler (id, ad, soyad, ders, konular, biyografi, "fotoUrl", "fiyatSaat", puan, olusturuldu) FROM stdin;
\.


--
-- Data for Name: oneriler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.oneriler (id, "ogrenciId", "ogretmenId", "kursId", neden, oncelik, tiklandimi, olusturuldu) FROM stdin;
\.


--
-- Data for Name: paketler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paketler (id, ad, aciklama, fiyat, "indirimliFiyat", "sinavSayisi", ozellikler, aktif, populer, olusturuldu, guncellendi) FROM stdin;
cmmrmcpnm0000pd0hbz8mrqxq	Efsane Başlangıç	Hızlı bir başlangıç için en iyi paket	199	\N	10	["10 Deneme", "AI Analiz", "Canlı Destek"]	t	t	2026-03-15 10:35:52.93	2026-03-15 10:35:52.93
\.


--
-- Data for Name: satin_alimlar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.satin_alimlar (id, "kullaniciId", "paketId", miktar, durum, "referansNo", notlar, olusturuldu, guncellendi) FROM stdin;
\.


--
-- Data for Name: sinav_katilimlar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sinav_katilimlar (id, "sinavId", "ogrenciId", durum, "cevapYontemi", "baslangicZamani", "bitisZamani", "dogruSayisi", "yanlisSayisi", "bosSayisi", "netPuan", "hamPuan", "ulusalSiralama", yuzdelik, "optikFormUrl", "optikOkundu", olusturuldu, guncellendi) FROM stdin;
\.


--
-- Data for Name: sinavlar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sinavlar (id, baslik, aciklama, tur, "grupId", "baslangicZamani", "bitisZamani", "sureDakika", aktif, yayinlandi, "kitapcikUrl", "cevapAnahtari", olusturuldu, guncellendi, "kitapcikBolumAdi", "kitapcikTarihMetni", "konuDagilimi") FROM stdin;
cmn384grz0001cgdoj0qt896v	Soru Bankası (Grup)	Grup soru havuzu — otomatik oluşturuldu.	LGS	lgs-grup	2026-03-23 13:30:47.662	2036-03-20 13:30:47.662	120	f	f	\N	\N	2026-03-23 13:30:47.664	2026-03-23 13:30:47.664	\N	\N	\N
\.


--
-- Data for Name: site_genel_icerik; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_genel_icerik (id, icerik, olusturuldu, guncellendi) FROM stdin;
\.


--
-- Data for Name: sorular; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sorular (id, "sinavId", "konuId", "siraNo", "metinHtml", "gorselUrl", secenekler, "dogruCevap", zorluk, kazanim, "aiUretildi", "aiModeli", olusturuldu, "aiMeta", "onayDurumu") FROM stdin;
cmn32ybxf00031179c4tf15js	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	1	<p>Bir hücrede mitoz bölünme sonucunda aşağıdaki olaylardan hangisi gerçekleşmez?</p>	\N	{"A": "Hücre sayısının artması", "B": "Kromozom sayısının yarıya inmesi", "C": "Genetik materyalin eşit dağıtılması", "D": "Ana hücre ile aynı genetik yapıda hücrelerin oluşması", "E": "Doku ve organların büyümesi"}	B	ORTA	Mitoz bölünmenin özelliklerini ve sonuçlarını kavrama	t	openai/gpt-4o	2026-03-23 11:06:03.362	\N	ONAYLANDI
cmn37ex4c000hcbxqedu83veu	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	2	<p>Aşağıdaki olaylardan hangisi mitoz bölünme sırasında gerçekleşmez?</p>	\N	{"A": "DNA eşlenmesi", "B": "Çekirdek zarının kaybolması", "C": "Homolog kromozomların ayrılması", "D": "Kromozomların ekvatoral düzlemde dizilmesi", "E": "Sitoplazmanın bölünmesi"}	C	ORTA	Mitoz bölünme süreçlerini tanıma	t	openai/gpt-4o	2026-03-23 13:10:55.786	\N	ONAYLANDI
cmn37ezhu000rcbxq4i3vpxsh	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	3	<p>Aşağıdaki olaylardan hangisi mitoz bölünme sırasında gerçekleşmez?</p>	\N	{"A": "DNA eşlenmesi", "B": "Çekirdek zarının kaybolması", "C": "Homolog kromozomların ayrılması", "D": "Kromozomların ekvatoral düzlemde dizilmesi", "E": "Sitoplazmanın bölünmesi"}	C	ORTA	Mitoz bölünme süreçlerini tanıma	t	openai/gpt-4o	2026-03-23 13:10:58.866	\N	ONAYLANDI
cmn37ezhu000tcbxq7d7z3eoe	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	4	<p>Mayoz bölünme sırasında crossing-over olayı hangi kromozomlar arasında gerçekleşir?</p>	\N	{"A": "Kardeş kromatidler", "B": "Homolog kromozomlar", "C": "Farklı kromozomlar", "D": "Parental kromatitler", "E": "Sentromerler"}	B	ORTA	Mayoz bölünmede genetik çeşitliliğin artışını açıklama	t	openai/gpt-4o	2026-03-23 13:10:58.866	\N	ONAYLANDI
cmn32ybxf000111793rgzwtjt	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	5	<p>Aşağıdakilerden hangisi hem mitoz hem de mayoz bölünme için ortak olan bir özelliktir?</p>	\N	{"A": "Hücrelerin sayısının iki katına çıkması", "B": "Genetik çeşitliliğin artması", "C": "Kromozomların kendini eşlemesi", "D": "Kromozom sayısının yarıya inmesi", "E": "Dört yeni hücrenin oluşması"}	C	ORTA	Mitoz ve mayoz bölünmenin ortak ve farklı yönlerini ayırt etme	t	openai/gpt-4o	2026-03-23 11:06:03.362	\N	ONAYLANDI
cmn37ex4t000lcbxqa4ftwclt	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	6	<p>Mayoz bölünme sırasında crossing-over olayı hangi kromozomlar arasında gerçekleşir?</p>	\N	{"A": "Kardeş kromatidler", "B": "Homolog kromozomlar", "C": "Farklı kromozomlar", "D": "Parental kromatitler", "E": "Sentromerler"}	B	ORTA	Mayoz bölünmede genetik çeşitliliğin artışını açıklama	t	openai/gpt-4o	2026-03-23 13:10:55.786	\N	ONAYLANDI
cmn37ezhu000vcbxqcsxjl0ao	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	7	<p>Aşağıdaki hücre bölünmelerinden hangisi sonucu oluşan hücreler genetik olarak birbirinden farklıdır?</p>	\N	{"A": "İnsanda deri hücresinin mitoz bölünmesi", "B": "Bakterinin bölünerek çoğalması", "C": "Bitkide kök hücresinin mitoz bölünmesi", "D": "İnsanda sperm hücresinin mayoz bölünmesi", "E": "Aynı türdeki iki hücrenin kaynaşması"}	D	ORTA	Mayoz bölünmenin genetik çeşitlilik üzerindeki etkilerini açıklama	t	openai/gpt-4o	2026-03-23 13:10:58.866	\N	ONAYLANDI
cmn37ex4o000jcbxq8tc1qcuu	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	8	<p>Aşağıdaki hücre bölünmelerinden hangisi sonucu oluşan hücreler genetik olarak birbirinden farklıdır?</p>	\N	{"A": "İnsanda deri hücresinin mitoz bölünmesi", "B": "Bakterinin bölünerek çoğalması", "C": "Bitkide kök hücresinin mitoz bölünmesi", "D": "İnsanda sperm hücresinin mayoz bölünmesi", "E": "Aynı türdeki iki hücrenin kaynaşması"}	D	ORTA	Mayoz bölünmenin genetik çeşitlilik üzerindeki etkilerini açıklama	t	openai/gpt-4o	2026-03-23 13:10:55.786	\N	ONAYLANDI
cmn37ex4w000pcbxqov1q8f8b	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	9	<p>Bir hücredeki DNA miktarı 2n iken mitoz bölünme sonrasında bu miktar ne olur?</p>	\N	{"A": "n", "B": "2n", "C": "3n", "D": "4n", "E": "8n"}	B	ORTA	Mitoz bölünmenin sonucunda genetik materyal miktarını açıklama	t	openai/gpt-4o	2026-03-23 13:10:55.787	\N	ONAYLANDI
cmn37ezhu000xcbxq3d75dtkg	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	10	<p>Bir hücredeki DNA miktarı 2n iken mitoz bölünme sonrasında bu miktar ne olur?</p>	\N	{"A": "n", "B": "2n", "C": "3n", "D": "4n", "E": "8n"}	B	ORTA	Mitoz bölünmenin sonucunda genetik materyal miktarını açıklama	t	openai/gpt-4o	2026-03-23 13:10:58.866	\N	ONAYLANDI
cmn37ezhu000zcbxqsgdml51n	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	11	<p>Mitoz bölünmenin hangi evresinde kromozomlar hücrenin ekvatoral düzleminde dizilir?</p>	\N	{"A": "Profaz", "B": "Metafaz", "C": "Anafaz", "D": "Telofaz", "E": "Interfaz"}	B	ORTA	Mitoz bölünme evrelerini sırasıyla açıklama	t	openai/gpt-4o	2026-03-23 13:10:58.866	\N	ONAYLANDI
cmn37ex4v000ncbxqohalwelc	cmn384grz0001cgdoj0qt896v	konu-hücre-ve-bölünme	12	<p>Mitoz bölünmenin hangi evresinde kromozomlar hücrenin ekvatoral düzleminde dizilir?</p>	\N	{"A": "Profaz", "B": "Metafaz", "C": "Anafaz", "D": "Telofaz", "E": "Interfaz"}	B	ORTA	Mitoz bölünme evrelerini sırasıyla açıklama	t	openai/gpt-4o	2026-03-23 13:10:55.786	\N	ONAYLANDI
cmmq0epfc0001f55tsrgtqk3f	cmn384grz0001cgdoj0qt896v	konu-çarpanlara-ayırma	13	<p>Aşağıdaki ifadelerden hangisi x<sup>4</sup> - 16 ifadesinin tam çarpanlara ayrılmış halidir?</p>	\N	{"A": "(x - 2)(x + 2)(x<sup>2</sup> + 4)", "B": "(x<sup>2</sup> - 4)(x<sup>2</sup> + 4)", "C": "(x - 4)(x<sup>3</sup> + 4x<sup>2</sup> + 16)", "D": "(x<sup>2</sup> - 2x + 4)(x<sup>2</sup> + 2x + 4)", "E": "(x<sup>2</sup> - 4)(x<sup>2</sup> - 4)"}	A	ZOR	Farklı derecelerdeki polinomlarda farkın kareleri ve çarpanlara ayırma tekniklerini uygulamak	t	openai/o3-mini	2026-03-14 07:33:48.215	\N	ONAYLANDI
cmmq0epfd0003f55togin18y8	cmn384grz0001cgdoj0qt896v	konu-çarpanlara-ayırma	14	<p>Aşağıdaki ifadelerden hangisi 8x<sup>3</sup> + 12x<sup>2</sup> - 2x - 3 ifadesinin tam çarpanlara ayrılmış halidir?</p>	\N	{"A": "(2x + 3)(2x - 1)(2x + 1)", "B": "2x(4x<sup>2</sup> + 6x - 1) - 3", "C": "(4x<sup>2</sup> - 1)(2x + 3)", "D": "(2x + 3)(4x<sup>2</sup> - 3)", "E": "(2x - 3)(2x + 3)(2x + 1)"}	A	ZOR	Grup halinde çarpanlara ayırma ve farkın karesi formülünü uygulayarak ifadeleri tam çarpanlara ayırmak	t	openai/o3-mini	2026-03-14 07:33:48.215	\N	ONAYLANDI
cmn4dodoj000513it0og68mmt	\N	konu-anlam-bilgisi	3	<p>Aşağıdaki cümlelerin hangisinde 'somut anlamlı bir sözcük soyut anlama gelecek biçimde' kullanılmıştır?</p>	\N	{"A": "Ağır adımlarla merdivenleri çıktı.", "B": "Tatlı bir rüzgâr esiyordu.", "C": "Sıcak bir karşılama beklemiyordu.", "D": "Yumuşak bir ses tonuyla konuştu.", "E": "Keskin bakışlarla etrafı süzdü."}	C	ORTA	Sözcüklerin temel ve mecaz anlamlarını ayırt eder.	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:01.024	{"ozgunluk": {"konuBenzerlikSkoru": 0}}	ONAY_BEKLIYOR
cmn4dodoj000713itgdvza4x1	\N	konu-anlam-bilgisi	4	<p>'Yükselmek' sözcüğü aşağıdaki cümlelerin hangisinde mecaz anlamıyla kullanılmamıştır?</p>	\N	{"A": "Son zamanlarda enflasyon hızla yükseldi.", "B": "Genç sporcu kısa sürede yükselmeyi başardı.", "C": "Apartmanın üst katlarına doğru yükseldi.", "D": "Halkın sesi giderek yükseliyordu.", "E": "Şirketin kârları bu yıl yükseldi."}	C	ORTA	Sözcüğün gerçek ve mecaz anlamını bağlam içinde ayırt eder.	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:01.024	{"ozgunluk": {"konuBenzerlikSkoru": 0}}	ONAY_BEKLIYOR
cmn4dodoj000613it13fl4xbb	\N	konu-anlam-bilgisi	2	<p>'Tutmak' sözcüğü aşağıdaki cümlelerin hangisinde 'sürdürmek, devam etmek' anlamında kullanılmıştır?</p>	\N	{"A": "Çocuk babasının elini sıkıca tutuyordu.", "B": "Bu yıl da oruç tutmaya karar verdi.", "C": "Arkadaşlarıyla küs tutmaya devam etti.", "D": "Balıkçılar bu mevsim çok balık tuttu.", "E": "Yeni aldığı arabanın direksiyonunu sıkı tutuyordu."}	C	ORTA	Sözcüklerin anlam özelliklerini ve bağlamdan kazandığı anlamları kavrar.	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:01.024	{"ozgunluk": {"konuBenzerlikSkoru": 0}}	ONAY_BEKLIYOR
cmn4dodp1000913itbe2mlnlw	\N	konu-anlam-bilgisi	5	<p>Aşağıdaki cümlelerin hangisinde altı çizili sözcük, ayraç içinde verilen anlama uygun kullanılmamıştır?</p>	\N	{"A": "İnce bir zevkle döşenmiş ev dikkat çekiyordu. (özenli)", "B": "Kırık bir kalple oradan ayrıldı. (üzgün)", "C": "Derin bir nefes alıp konuşmaya başladı. (güçlü)", "D": "Hafif bir tebessümle yanıt verdi. (belli belirsiz)", "E": "Sert bir tavırla kapıyı çarptı. (öfkeli)"}	C	ORTA	Sözcüklerin bağlam içindeki anlamını kavrar.	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:01.024	{"ozgunluk": {"konuBenzerlikSkoru": 0}}	ONAY_BEKLIYOR
cmn4dou2n000b13itzn1qbhqg	\N	konu-anlam-bilgisi	2	<p>'Düşmek' sözcüğü aşağıdaki cümlelerin hangisinde mecaz anlamda kullanılmıştır?</p>	\N	{"A": "Çocuk koşarken yere düştü.", "B": "Kitap raftan düşüp yırtıldı.", "C": "Fiyatlar son günlerde düştü.", "D": "Ağaçtan olgun meyveler düştü.", "E": "Merdivenden düşünce kolu kırıldı."}	C	ORTA	Sözcükte gerçek, mecaz ve yan anlamları ayırt etme	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:22.272	{"ozgunluk": {"konuBenzerlikSkoru": 0.4545}}	ONAY_BEKLIYOR
cmn4dou2o000d13itkgq5ln0g	\N	konu-anlam-bilgisi	1	<p>Aşağıdaki cümlelerin hangisinde somut anlamlı sözcükler soyut anlama gelecek şekilde kullanılmıştır?</p>	\N	{"A": "Çocuğun gözlerinde derin bir hüzün vardı.", "B": "Masanın üzerindeki kitapları düzenledi.", "C": "Bahçedeki ağaçlar sonbaharda yapraklarını döktü.", "D": "Dün akşam yağmur çok şiddetli yağdı.", "E": "Sokakta oynayan çocukların sesi geliyordu."}	A	ORTA	Sözcükte anlam, somut ve soyut anlam, gerçek ve mecaz anlam konularını kavrama	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:22.272	{"ozgunluk": {"konuBenzerlikSkoru": 0.6429}}	ONAY_BEKLIYOR
cmn4dodoj000413itpxehv75g	\N	konu-anlam-bilgisi	1	<p>Aşağıdaki cümlelerin hangisinde 'zaman' kavramı diğerlerinden farklı bir anlam ilişkisi içinde kullanılmıştır?</p>	\N	{"A": "Her sabah erkenden kalkıp işe giderdi.", "B": "Akşama doğru hava kararmaya başladı.", "C": "Geçen yıl bu vakitler tatildeydik.", "D": "Senelerdir görmediğim arkadaşıma rastladım.", "E": "Zamanla her şey değişir, unutulur."}	E	ORTA	Metindeki sözcük ve söz gruplarının anlam özelliklerini belirler.	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:01.024	{"ozgunluk": {"konuBenzerlikSkoru": 0}}	ONAY_BEKLIYOR
cmn4dou2p000f13iti7owocw8	\N	konu-anlam-bilgisi	3	<p>I. Sıcak bir karşılama ile bizi ağırladılar.<br>II. Sıcak çorbayı içince içim ısındı.<br>III. Bu konuda sıcak gelişmeler yaşanıyor.<br>IV. Sıcak havada yürümek yorucuydu.<br>V. Sıcak ekmek kokusu her yeri sardı.<br><br>'Sıcak' sözcüğü numaralanmış cümlelerin hangilerinde aynı anlamda kullanılmıştır?</p>	\N	{"A": "I ve II", "B": "II ve IV", "C": "II ve V", "D": "III ve IV", "E": "IV ve V"}	C	ORTA	Sözcüğün cümle içinde kazandığı anlamları kavrama ve ayırt etme	t	anthropic/claude-3.5-sonnet	2026-03-24 08:54:22.272	{"ozgunluk": {"konuBenzerlikSkoru": 0.0833}}	ONAY_BEKLIYOR
\.


--
-- Data for Name: sosyal_davetler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sosyal_davetler (id, "gondericId", "aliciId", "aliciEmail", "davetKodu", kabul, olusturuldu) FROM stdin;
\.


--
-- Data for Name: study_gorevler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_gorevler (id, "planId", baslik, ders, konu, "sureDakika", tamamlandi, gun, olusturuldu) FROM stdin;
\.


--
-- Data for Name: study_planlar; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.study_planlar (id, "ogrenciId", baslik, baslangic, bitis, hedefler, aktif, "aiUretildi", olusturuldu) FROM stdin;
\.


--
-- Data for Name: takvim_etkinlikler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.takvim_etkinlikler (id, "grupId", baslik, aciklama, tarih, renk, olusturuldu) FROM stdin;
\.


--
-- Data for Name: universite_bolumler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.universite_bolumler (id, "universiteId", "bolumAdi", "sinavTuru", yil, "minPuan", "maxPuan", "minSiralama", "maxSiralama", kontenjan, "dolulukOrani") FROM stdin;
odtu-cs	odtu	Bilgisayar Mühendisliği	AYT	2024	520.5	545.3	1200	2500	120	\N
\.


--
-- Data for Name: universite_hedefler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.universite_hedefler (id, "ogrenciId", "bolumId", oncelik, "tahminPuan", "tahminSiralama", olusturuldu) FROM stdin;
\.


--
-- Data for Name: universiteler; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.universiteler (id, ad, "kisaAd", sehir, tur, logo) FROM stdin;
odtu	Orta Doğu Teknik Üniversitesi	ODTÜ	Ankara	Devlet	\N
\.


--
-- Data for Name: veli_profiller; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.veli_profiller (id, "kullaniciId", ad, soyad, telefon, olusturuldu) FROM stdin;
cmn33mp7s000c1179wd76vhml	cmn33mp7s000b1179poozn8ir	Demo	Veli	\N	2026-03-23 11:25:00.329
cmn33tf8h0009cbxqyje00bkp	cmn33tf8h0008cbxqs3bvhtyl	Esref	Karadağ	05324837974	2026-03-23 11:30:13.985
\.


--
-- Name: admin_profiller admin_profiller_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_profiller
    ADD CONSTRAINT admin_profiller_pkey PRIMARY KEY (id);


--
-- Name: ai_analizler ai_analizler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analizler
    ADD CONSTRAINT ai_analizler_pkey PRIMARY KEY (id);


--
-- Name: arkadasliklar arkadasliklar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkadasliklar
    ADD CONSTRAINT arkadasliklar_pkey PRIMARY KEY (id);


--
-- Name: bildirimler bildirimler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bildirimler
    ADD CONSTRAINT bildirimler_pkey PRIMARY KEY (id);


--
-- Name: duellolar duellolar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duellolar
    ADD CONSTRAINT duellolar_pkey PRIMARY KEY (id);


--
-- Name: grup_uyelikler grup_uyelikler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grup_uyelikler
    ADD CONSTRAINT grup_uyelikler_pkey PRIMARY KEY (id);


--
-- Name: gruplar gruplar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gruplar
    ADD CONSTRAINT gruplar_pkey PRIMARY KEY (id);


--
-- Name: konu_performanslari konu_performanslari_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.konu_performanslari
    ADD CONSTRAINT konu_performanslari_pkey PRIMARY KEY (id);


--
-- Name: konular konular_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.konular
    ADD CONSTRAINT konular_pkey PRIMARY KEY (id);


--
-- Name: kullanicilar kullanicilar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kullanicilar
    ADD CONSTRAINT kullanicilar_pkey PRIMARY KEY (id);


--
-- Name: kurslar kurslar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kurslar
    ADD CONSTRAINT kurslar_pkey PRIMARY KEY (id);


--
-- Name: ogrenci_cevaplar ogrenci_cevaplar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ogrenci_cevaplar
    ADD CONSTRAINT ogrenci_cevaplar_pkey PRIMARY KEY (id);


--
-- Name: ogrenci_profiller ogrenci_profiller_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ogrenci_profiller
    ADD CONSTRAINT ogrenci_profiller_pkey PRIMARY KEY (id);


--
-- Name: ogretmenler ogretmenler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ogretmenler
    ADD CONSTRAINT ogretmenler_pkey PRIMARY KEY (id);


--
-- Name: oneriler oneriler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oneriler
    ADD CONSTRAINT oneriler_pkey PRIMARY KEY (id);


--
-- Name: paketler paketler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paketler
    ADD CONSTRAINT paketler_pkey PRIMARY KEY (id);


--
-- Name: satin_alimlar satin_alimlar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satin_alimlar
    ADD CONSTRAINT satin_alimlar_pkey PRIMARY KEY (id);


--
-- Name: sinav_katilimlar sinav_katilimlar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinav_katilimlar
    ADD CONSTRAINT sinav_katilimlar_pkey PRIMARY KEY (id);


--
-- Name: sinavlar sinavlar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinavlar
    ADD CONSTRAINT sinavlar_pkey PRIMARY KEY (id);


--
-- Name: site_genel_icerik site_genel_icerik_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_genel_icerik
    ADD CONSTRAINT site_genel_icerik_pkey PRIMARY KEY (id);


--
-- Name: sorular sorular_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sorular
    ADD CONSTRAINT sorular_pkey PRIMARY KEY (id);


--
-- Name: sosyal_davetler sosyal_davetler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sosyal_davetler
    ADD CONSTRAINT sosyal_davetler_pkey PRIMARY KEY (id);


--
-- Name: study_gorevler study_gorevler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_gorevler
    ADD CONSTRAINT study_gorevler_pkey PRIMARY KEY (id);


--
-- Name: study_planlar study_planlar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_planlar
    ADD CONSTRAINT study_planlar_pkey PRIMARY KEY (id);


--
-- Name: takvim_etkinlikler takvim_etkinlikler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takvim_etkinlikler
    ADD CONSTRAINT takvim_etkinlikler_pkey PRIMARY KEY (id);


--
-- Name: universite_bolumler universite_bolumler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universite_bolumler
    ADD CONSTRAINT universite_bolumler_pkey PRIMARY KEY (id);


--
-- Name: universite_hedefler universite_hedefler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universite_hedefler
    ADD CONSTRAINT universite_hedefler_pkey PRIMARY KEY (id);


--
-- Name: universiteler universiteler_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universiteler
    ADD CONSTRAINT universiteler_pkey PRIMARY KEY (id);


--
-- Name: veli_profiller veli_profiller_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.veli_profiller
    ADD CONSTRAINT veli_profiller_pkey PRIMARY KEY (id);


--
-- Name: admin_profiller_kullaniciId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "admin_profiller_kullaniciId_key" ON public.admin_profiller USING btree ("kullaniciId");


--
-- Name: arkadasliklar_ogrenciId_arkadasId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "arkadasliklar_ogrenciId_arkadasId_key" ON public.arkadasliklar USING btree ("ogrenciId", "arkadasId");


--
-- Name: grup_uyelikler_grupId_ogrenciId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "grup_uyelikler_grupId_ogrenciId_key" ON public.grup_uyelikler USING btree ("grupId", "ogrenciId");


--
-- Name: konu_performanslari_ogrenciId_konuId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "konu_performanslari_ogrenciId_konuId_key" ON public.konu_performanslari USING btree ("ogrenciId", "konuId");


--
-- Name: kullanicilar_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kullanicilar_email_key ON public.kullanicilar USING btree (email);


--
-- Name: kullanicilar_telefon_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kullanicilar_telefon_key ON public.kullanicilar USING btree (telefon);


--
-- Name: ogrenci_cevaplar_katilimId_soruId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ogrenci_cevaplar_katilimId_soruId_key" ON public.ogrenci_cevaplar USING btree ("katilimId", "soruId");


--
-- Name: ogrenci_profiller_kullaniciId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ogrenci_profiller_kullaniciId_key" ON public.ogrenci_profiller USING btree ("kullaniciId");


--
-- Name: satin_alimlar_referansNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "satin_alimlar_referansNo_key" ON public.satin_alimlar USING btree ("referansNo");


--
-- Name: sinav_katilimlar_sinavId_ogrenciId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "sinav_katilimlar_sinavId_ogrenciId_key" ON public.sinav_katilimlar USING btree ("sinavId", "ogrenciId");


--
-- Name: sosyal_davetler_davetKodu_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "sosyal_davetler_davetKodu_key" ON public.sosyal_davetler USING btree ("davetKodu");


--
-- Name: veli_profiller_kullaniciId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "veli_profiller_kullaniciId_key" ON public.veli_profiller USING btree ("kullaniciId");


--
-- Name: admin_profiller admin_profiller_kullaniciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_profiller
    ADD CONSTRAINT "admin_profiller_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES public.kullanicilar(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: arkadasliklar arkadasliklar_ogrenciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arkadasliklar
    ADD CONSTRAINT "arkadasliklar_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES public.ogrenci_profiller(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bildirimler bildirimler_kullaniciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bildirimler
    ADD CONSTRAINT "bildirimler_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES public.kullanicilar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: duellolar duellolar_davetedenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duellolar
    ADD CONSTRAINT "duellolar_davetedenId_fkey" FOREIGN KEY ("davetedenId") REFERENCES public.ogrenci_profiller(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: grup_uyelikler grup_uyelikler_grupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grup_uyelikler
    ADD CONSTRAINT "grup_uyelikler_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES public.gruplar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: grup_uyelikler grup_uyelikler_ogrenciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grup_uyelikler
    ADD CONSTRAINT "grup_uyelikler_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES public.ogrenci_profiller(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: konu_performanslari konu_performanslari_konuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.konu_performanslari
    ADD CONSTRAINT "konu_performanslari_konuId_fkey" FOREIGN KEY ("konuId") REFERENCES public.konular(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: konu_performanslari konu_performanslari_ogrenciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.konu_performanslari
    ADD CONSTRAINT "konu_performanslari_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES public.ogrenci_profiller(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ogrenci_cevaplar ogrenci_cevaplar_katilimId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ogrenci_cevaplar
    ADD CONSTRAINT "ogrenci_cevaplar_katilimId_fkey" FOREIGN KEY ("katilimId") REFERENCES public.sinav_katilimlar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ogrenci_cevaplar ogrenci_cevaplar_soruId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ogrenci_cevaplar
    ADD CONSTRAINT "ogrenci_cevaplar_soruId_fkey" FOREIGN KEY ("soruId") REFERENCES public.sorular(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ogrenci_profiller ogrenci_profiller_kullaniciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ogrenci_profiller
    ADD CONSTRAINT "ogrenci_profiller_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES public.kullanicilar(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ogrenci_profiller ogrenci_profiller_veliId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ogrenci_profiller
    ADD CONSTRAINT "ogrenci_profiller_veliId_fkey" FOREIGN KEY ("veliId") REFERENCES public.veli_profiller(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: oneriler oneriler_kursId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oneriler
    ADD CONSTRAINT "oneriler_kursId_fkey" FOREIGN KEY ("kursId") REFERENCES public.kurslar(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: oneriler oneriler_ogretmenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oneriler
    ADD CONSTRAINT "oneriler_ogretmenId_fkey" FOREIGN KEY ("ogretmenId") REFERENCES public.ogretmenler(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: satin_alimlar satin_alimlar_kullaniciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satin_alimlar
    ADD CONSTRAINT "satin_alimlar_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES public.kullanicilar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: satin_alimlar satin_alimlar_paketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satin_alimlar
    ADD CONSTRAINT "satin_alimlar_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES public.paketler(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sinav_katilimlar sinav_katilimlar_ogrenciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinav_katilimlar
    ADD CONSTRAINT "sinav_katilimlar_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES public.ogrenci_profiller(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sinav_katilimlar sinav_katilimlar_sinavId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinav_katilimlar
    ADD CONSTRAINT "sinav_katilimlar_sinavId_fkey" FOREIGN KEY ("sinavId") REFERENCES public.sinavlar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sinavlar sinavlar_grupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sinavlar
    ADD CONSTRAINT "sinavlar_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES public.gruplar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sorular sorular_konuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sorular
    ADD CONSTRAINT "sorular_konuId_fkey" FOREIGN KEY ("konuId") REFERENCES public.konular(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sorular sorular_sinavId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sorular
    ADD CONSTRAINT "sorular_sinavId_fkey" FOREIGN KEY ("sinavId") REFERENCES public.sinavlar(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sosyal_davetler sosyal_davetler_aliciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sosyal_davetler
    ADD CONSTRAINT "sosyal_davetler_aliciId_fkey" FOREIGN KEY ("aliciId") REFERENCES public.kullanicilar(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sosyal_davetler sosyal_davetler_gondericId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sosyal_davetler
    ADD CONSTRAINT "sosyal_davetler_gondericId_fkey" FOREIGN KEY ("gondericId") REFERENCES public.kullanicilar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: study_gorevler study_gorevler_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_gorevler
    ADD CONSTRAINT "study_gorevler_planId_fkey" FOREIGN KEY ("planId") REFERENCES public.study_planlar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: study_planlar study_planlar_ogrenciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_planlar
    ADD CONSTRAINT "study_planlar_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES public.ogrenci_profiller(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: takvim_etkinlikler takvim_etkinlikler_grupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.takvim_etkinlikler
    ADD CONSTRAINT "takvim_etkinlikler_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES public.gruplar(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: universite_bolumler universite_bolumler_universiteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universite_bolumler
    ADD CONSTRAINT "universite_bolumler_universiteId_fkey" FOREIGN KEY ("universiteId") REFERENCES public.universiteler(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: universite_hedefler universite_hedefler_bolumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universite_hedefler
    ADD CONSTRAINT "universite_hedefler_bolumId_fkey" FOREIGN KEY ("bolumId") REFERENCES public.universite_bolumler(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: universite_hedefler universite_hedefler_ogrenciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universite_hedefler
    ADD CONSTRAINT "universite_hedefler_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES public.ogrenci_profiller(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: veli_profiller veli_profiller_kullaniciId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.veli_profiller
    ADD CONSTRAINT "veli_profiller_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES public.kullanicilar(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

