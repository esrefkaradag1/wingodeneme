export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_profiller: {
        Row: {
          ad: string
          id: string
          kullaniciId: string
          soyad: string
          yetkiSeviye: number
        }
        Insert: {
          ad: string
          id: string
          kullaniciId: string
          soyad: string
          yetkiSeviye?: number
        }
        Update: {
          ad?: string
          id?: string
          kullaniciId?: string
          soyad?: string
          yetkiSeviye?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_profiller_kullaniciId_fkey"
            columns: ["kullaniciId"]
            isOneToOne: false
            referencedRelation: "kullanicilar"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analizler: {
        Row: {
          analizTipi: string
          icerik: Json
          id: string
          ogrenciId: string
          olusturuldu: string
          oneriler: Json | null
          sinavId: string | null
        }
        Insert: {
          analizTipi: string
          icerik: Json
          id: string
          ogrenciId: string
          olusturuldu?: string
          oneriler?: Json | null
          sinavId?: string | null
        }
        Update: {
          analizTipi?: string
          icerik?: Json
          id?: string
          ogrenciId?: string
          olusturuldu?: string
          oneriler?: Json | null
          sinavId?: string | null
        }
        Relationships: []
      }
      arkadasliklar: {
        Row: {
          arkadasId: string
          durum: Database["public"]["Enums"]["ArkadaslikDurumu"]
          id: string
          ogrenciId: string
          olusturuldu: string
        }
        Insert: {
          arkadasId: string
          durum?: Database["public"]["Enums"]["ArkadaslikDurumu"]
          id: string
          ogrenciId: string
          olusturuldu?: string
        }
        Update: {
          arkadasId?: string
          durum?: Database["public"]["Enums"]["ArkadaslikDurumu"]
          id?: string
          ogrenciId?: string
          olusturuldu?: string
        }
        Relationships: [
          {
            foreignKeyName: "arkadasliklar_ogrenciId_fkey"
            columns: ["ogrenciId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      bildirimler: {
        Row: {
          baslik: string
          id: string
          kullaniciId: string
          mesaj: string
          okundu: boolean
          olusturuldu: string
          tur: string
          veriJson: Json | null
        }
        Insert: {
          baslik: string
          id: string
          kullaniciId: string
          mesaj: string
          okundu?: boolean
          olusturuldu?: string
          tur: string
          veriJson?: Json | null
        }
        Update: {
          baslik?: string
          id?: string
          kullaniciId?: string
          mesaj?: string
          okundu?: boolean
          olusturuldu?: string
          tur?: string
          veriJson?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bildirimler_kullaniciId_fkey"
            columns: ["kullaniciId"]
            isOneToOne: false
            referencedRelation: "kullanicilar"
            referencedColumns: ["id"]
          },
        ]
      }
      duellolar: {
        Row: {
          davetciPuan: number | null
          davetedenId: string
          davetEdilenId: string
          davetEdilenPuan: number | null
          durum: Database["public"]["Enums"]["DuelloDurumu"]
          id: string
          kazanan: string | null
          konuId: string | null
          olusturuldu: string
          soruSayisi: number
          sureDakika: number
          tamamlandi: string | null
        }
        Insert: {
          davetciPuan?: number | null
          davetedenId: string
          davetEdilenId: string
          davetEdilenPuan?: number | null
          durum?: Database["public"]["Enums"]["DuelloDurumu"]
          id: string
          kazanan?: string | null
          konuId?: string | null
          olusturuldu?: string
          soruSayisi?: number
          sureDakika?: number
          tamamlandi?: string | null
        }
        Update: {
          davetciPuan?: number | null
          davetedenId?: string
          davetEdilenId?: string
          davetEdilenPuan?: number | null
          durum?: Database["public"]["Enums"]["DuelloDurumu"]
          id?: string
          kazanan?: string | null
          konuId?: string | null
          olusturuldu?: string
          soruSayisi?: number
          sureDakika?: number
          tamamlandi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duellolar_davetedenId_fkey"
            columns: ["davetedenId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      grup_uyelikler: {
        Row: {
          grupId: string
          id: string
          katilimTarih: string
          ogrenciId: string
        }
        Insert: {
          grupId: string
          id: string
          katilimTarih?: string
          ogrenciId: string
        }
        Update: {
          grupId?: string
          id?: string
          katilimTarih?: string
          ogrenciId?: string
        }
        Relationships: [
          {
            foreignKeyName: "grup_uyelikler_grupId_fkey"
            columns: ["grupId"]
            isOneToOne: false
            referencedRelation: "gruplar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grup_uyelikler_ogrenciId_fkey"
            columns: ["ogrenciId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      gruplar: {
        Row: {
          aciklama: string | null
          ad: string
          aktif: boolean
          id: string
          olusturuldu: string
          parentId: string | null
          tur: Database["public"]["Enums"]["OgretimTuru"]
        }
        Insert: {
          aciklama?: string | null
          ad: string
          aktif?: boolean
          id: string
          olusturuldu?: string
          parentId?: string | null
          tur: Database["public"]["Enums"]["OgretimTuru"]
        }
        Update: {
          aciklama?: string | null
          ad?: string
          aktif?: boolean
          id?: string
          olusturuldu?: string
          parentId?: string | null
          tur?: Database["public"]["Enums"]["OgretimTuru"]
        }
        Relationships: [
          {
            foreignKeyName: "gruplar_parentId_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "gruplar"
            referencedColumns: ["id"]
          },
        ]
      }
      koclar: {
        Row: {
          ad: string
          aktif: boolean
          biyografi: string | null
          fotoUrl: string | null
          id: string
          olusturuldu: string
          soyad: string
          uzmanlik: string | null
        }
        Insert: {
          ad: string
          aktif?: boolean
          biyografi?: string | null
          fotoUrl?: string | null
          id: string
          olusturuldu?: string
          soyad: string
          uzmanlik?: string | null
        }
        Update: {
          ad?: string
          aktif?: boolean
          biyografi?: string | null
          fotoUrl?: string | null
          id?: string
          olusturuldu?: string
          soyad?: string
          uzmanlik?: string | null
        }
        Relationships: []
      }
      konu_performanslari: {
        Row: {
          basariYuzdesi: number
          dogruSayisi: number
          id: string
          konuId: string
          ogrenciId: string
          sonGuncelleme: string
          toplamSoru: number
          yanlisSayisi: number
        }
        Insert: {
          basariYuzdesi?: number
          dogruSayisi?: number
          id: string
          konuId: string
          ogrenciId: string
          sonGuncelleme: string
          toplamSoru?: number
          yanlisSayisi?: number
        }
        Update: {
          basariYuzdesi?: number
          dogruSayisi?: number
          id?: string
          konuId?: string
          ogrenciId?: string
          sonGuncelleme?: string
          toplamSoru?: number
          yanlisSayisi?: number
        }
        Relationships: [
          {
            foreignKeyName: "konu_performanslari_konuId_fkey"
            columns: ["konuId"]
            isOneToOne: false
            referencedRelation: "konular"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "konu_performanslari_ogrenciId_fkey"
            columns: ["ogrenciId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      konular: {
        Row: {
          ad: string
          ders: string
          id: string
          kazanimlar: string[] | null
          ogretimTuru: Database["public"]["Enums"]["OgretimTuru"]
          olusturuldu: string
          sinifSeviyesi: string | null
          uniteAdi: string | null
          yksSegment: Database["public"]["Enums"]["YksKonuSegmenti"] | null
        }
        Insert: {
          ad: string
          ders: string
          id: string
          kazanimlar?: string[] | null
          ogretimTuru: Database["public"]["Enums"]["OgretimTuru"]
          olusturuldu?: string
          sinifSeviyesi?: string | null
          uniteAdi?: string | null
          yksSegment?: Database["public"]["Enums"]["YksKonuSegmenti"] | null
        }
        Update: {
          ad?: string
          ders?: string
          id?: string
          kazanimlar?: string[] | null
          ogretimTuru?: Database["public"]["Enums"]["OgretimTuru"]
          olusturuldu?: string
          sinifSeviyesi?: string | null
          uniteAdi?: string | null
          yksSegment?: Database["public"]["Enums"]["YksKonuSegmenti"] | null
        }
        Relationships: []
      }
      kullanicilar: {
        Row: {
          aktif: boolean
          dogrulamaKodu: string | null
          email: string
          emailDogrulandi: boolean
          fcmToken: string | null
          guncellendi: string
          id: string
          olusturuldu: string
          refreshToken: string | null
          rol: Database["public"]["Enums"]["Rol"]
          sifre: string
          telefon: string | null
        }
        Insert: {
          aktif?: boolean
          dogrulamaKodu?: string | null
          email: string
          emailDogrulandi?: boolean
          fcmToken?: string | null
          guncellendi: string
          id: string
          olusturuldu?: string
          refreshToken?: string | null
          rol?: Database["public"]["Enums"]["Rol"]
          sifre: string
          telefon?: string | null
        }
        Update: {
          aktif?: boolean
          dogrulamaKodu?: string | null
          email?: string
          emailDogrulandi?: boolean
          fcmToken?: string | null
          guncellendi?: string
          id?: string
          olusturuldu?: string
          refreshToken?: string | null
          rol?: Database["public"]["Enums"]["Rol"]
          sifre?: string
          telefon?: string | null
        }
        Relationships: []
      }
      kurslar: {
        Row: {
          aciklama: string | null
          baslik: string
          ders: string
          etiketler: string[] | null
          fiyat: number | null
          id: string
          konular: string[] | null
          olusturuldu: string
          platform: string | null
          puan: number
          url: string | null
        }
        Insert: {
          aciklama?: string | null
          baslik: string
          ders: string
          etiketler?: string[] | null
          fiyat?: number | null
          id: string
          konular?: string[] | null
          olusturuldu?: string
          platform?: string | null
          puan?: number
          url?: string | null
        }
        Update: {
          aciklama?: string | null
          baslik?: string
          ders?: string
          etiketler?: string[] | null
          fiyat?: number | null
          id?: string
          konular?: string[] | null
          olusturuldu?: string
          platform?: string | null
          puan?: number
          url?: string | null
        }
        Relationships: []
      }
      ogrenci_cevaplar: {
        Row: {
          dogru: boolean | null
          id: string
          katilimId: string
          olusturuldu: string
          secilen: string | null
          soruId: string
          sureMs: number | null
        }
        Insert: {
          dogru?: boolean | null
          id: string
          katilimId: string
          olusturuldu?: string
          secilen?: string | null
          soruId: string
          sureMs?: number | null
        }
        Update: {
          dogru?: boolean | null
          id?: string
          katilimId?: string
          olusturuldu?: string
          secilen?: string | null
          soruId?: string
          sureMs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ogrenci_cevaplar_katilimId_fkey"
            columns: ["katilimId"]
            isOneToOne: false
            referencedRelation: "sinav_katilimlar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ogrenci_cevaplar_soruId_fkey"
            columns: ["soruId"]
            isOneToOne: false
            referencedRelation: "sorular"
            referencedColumns: ["id"]
          },
        ]
      }
      ogrenci_profiller: {
        Row: {
          ad: string
          avatarUrl: string | null
          guncellendi: string
          hedefBolum: string | null
          hedefUniversite: string | null
          id: string
          ilce: string | null
          kullaniciId: string
          ogretimTuru: Database["public"]["Enums"]["OgretimTuru"]
          okul: string | null
          olusturuldu: string
          puan: number
          sehir: string | null
          sinif: string | null
          soyad: string
          veliId: string | null
        }
        Insert: {
          ad: string
          avatarUrl?: string | null
          guncellendi: string
          hedefBolum?: string | null
          hedefUniversite?: string | null
          id: string
          ilce?: string | null
          kullaniciId: string
          ogretimTuru?: Database["public"]["Enums"]["OgretimTuru"]
          okul?: string | null
          olusturuldu?: string
          puan?: number
          sehir?: string | null
          sinif?: string | null
          soyad: string
          veliId?: string | null
        }
        Update: {
          ad?: string
          avatarUrl?: string | null
          guncellendi?: string
          hedefBolum?: string | null
          hedefUniversite?: string | null
          id?: string
          ilce?: string | null
          kullaniciId?: string
          ogretimTuru?: Database["public"]["Enums"]["OgretimTuru"]
          okul?: string | null
          olusturuldu?: string
          puan?: number
          sehir?: string | null
          sinif?: string | null
          soyad?: string
          veliId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ogrenci_profiller_kullaniciId_fkey"
            columns: ["kullaniciId"]
            isOneToOne: false
            referencedRelation: "kullanicilar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ogrenci_profiller_veliId_fkey"
            columns: ["veliId"]
            isOneToOne: false
            referencedRelation: "veli_profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      ogrenci_sinav_atamalari: {
        Row: {
          id: string
          kaynak: Database["public"]["Enums"]["SinavAtamaKaynak"]
          ogrenciId: string
          olusturuldu: string
          satinAlimId: string | null
          sinavId: string
        }
        Insert: {
          id: string
          kaynak?: Database["public"]["Enums"]["SinavAtamaKaynak"]
          ogrenciId: string
          olusturuldu?: string
          satinAlimId?: string | null
          sinavId: string
        }
        Update: {
          id?: string
          kaynak?: Database["public"]["Enums"]["SinavAtamaKaynak"]
          ogrenciId?: string
          olusturuldu?: string
          satinAlimId?: string | null
          sinavId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ogrenci_sinav_atamalari_ogrenciId_fkey"
            columns: ["ogrenciId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ogrenci_sinav_atamalari_satinAlimId_fkey"
            columns: ["satinAlimId"]
            isOneToOne: false
            referencedRelation: "satin_alimlar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ogrenci_sinav_atamalari_sinavId_fkey"
            columns: ["sinavId"]
            isOneToOne: false
            referencedRelation: "sinavlar"
            referencedColumns: ["id"]
          },
        ]
      }
      ogretmenler: {
        Row: {
          ad: string
          biyografi: string | null
          ders: string
          fiyatSaat: number | null
          fotoUrl: string | null
          id: string
          konular: string[] | null
          olusturuldu: string
          puan: number
          soyad: string
        }
        Insert: {
          ad: string
          biyografi?: string | null
          ders: string
          fiyatSaat?: number | null
          fotoUrl?: string | null
          id: string
          konular?: string[] | null
          olusturuldu?: string
          puan?: number
          soyad: string
        }
        Update: {
          ad?: string
          biyografi?: string | null
          ders?: string
          fiyatSaat?: number | null
          fotoUrl?: string | null
          id?: string
          konular?: string[] | null
          olusturuldu?: string
          puan?: number
          soyad?: string
        }
        Relationships: []
      }
      oneriler: {
        Row: {
          id: string
          kursId: string | null
          neden: string
          ogrenciId: string
          ogretmenId: string | null
          olusturuldu: string
          oncelik: number
          paketId: string | null
          tiklandimi: boolean
        }
        Insert: {
          id: string
          kursId?: string | null
          neden: string
          ogrenciId: string
          ogretmenId?: string | null
          olusturuldu?: string
          oncelik?: number
          paketId?: string | null
          tiklandimi?: boolean
        }
        Update: {
          id?: string
          kursId?: string | null
          neden?: string
          ogrenciId?: string
          ogretmenId?: string | null
          olusturuldu?: string
          oncelik?: number
          paketId?: string | null
          tiklandimi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "oneriler_kursId_fkey"
            columns: ["kursId"]
            isOneToOne: false
            referencedRelation: "kurslar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oneriler_ogretmenId_fkey"
            columns: ["ogretmenId"]
            isOneToOne: false
            referencedRelation: "ogretmenler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oneriler_paketId_fkey"
            columns: ["paketId"]
            isOneToOne: false
            referencedRelation: "paketler"
            referencedColumns: ["id"]
          },
        ]
      }
      paketler: {
        Row: {
          aciklama: string | null
          ad: string
          aktif: boolean
          disUrl: string | null
          etiketler: string[] | null
          fiyat: number
          grupIds: string[] | null
          guncellendi: string
          id: string
          indirimliFiyat: number | null
          kocId: string | null
          olusturuldu: string
          oneCikan: boolean
          ozellikler: Json | null
          populer: boolean
          sinavIds: string[] | null
          sinavSayisi: number
        }
        Insert: {
          aciklama?: string | null
          ad: string
          aktif?: boolean
          disUrl?: string | null
          etiketler?: string[] | null
          fiyat: number
          grupIds?: string[] | null
          guncellendi: string
          id: string
          indirimliFiyat?: number | null
          kocId?: string | null
          olusturuldu?: string
          oneCikan?: boolean
          ozellikler?: Json | null
          populer?: boolean
          sinavIds?: string[] | null
          sinavSayisi?: number
        }
        Update: {
          aciklama?: string | null
          ad?: string
          aktif?: boolean
          disUrl?: string | null
          etiketler?: string[] | null
          fiyat?: number
          grupIds?: string[] | null
          guncellendi?: string
          id?: string
          indirimliFiyat?: number | null
          kocId?: string | null
          olusturuldu?: string
          oneCikan?: boolean
          ozellikler?: Json | null
          populer?: boolean
          sinavIds?: string[] | null
          sinavSayisi?: number
        }
        Relationships: [
          {
            foreignKeyName: "paketler_kocId_fkey"
            columns: ["kocId"]
            isOneToOne: false
            referencedRelation: "koclar"
            referencedColumns: ["id"]
          },
        ]
      }
      satin_alimlar: {
        Row: {
          durum: Database["public"]["Enums"]["OdemeDurumu"]
          faturaBilgileri: Json | null
          guncellendi: string
          id: string
          indirimMiktari: number
          ipAdresi: string | null
          kullaniciId: string
          miktar: number
          notlar: string | null
          odemeMetodu: string | null
          odemeZamani: string | null
          olusturuldu: string
          paketId: string
          referansNo: string | null
          toplamTutar: number
        }
        Insert: {
          durum?: Database["public"]["Enums"]["OdemeDurumu"]
          faturaBilgileri?: Json | null
          guncellendi: string
          id: string
          indirimMiktari?: number
          ipAdresi?: string | null
          kullaniciId: string
          miktar: number
          notlar?: string | null
          odemeMetodu?: string | null
          odemeZamani?: string | null
          olusturuldu?: string
          paketId: string
          referansNo?: string | null
          toplamTutar?: number
        }
        Update: {
          durum?: Database["public"]["Enums"]["OdemeDurumu"]
          faturaBilgileri?: Json | null
          guncellendi?: string
          id?: string
          indirimMiktari?: number
          ipAdresi?: string | null
          kullaniciId?: string
          miktar?: number
          notlar?: string | null
          odemeMetodu?: string | null
          odemeZamani?: string | null
          olusturuldu?: string
          paketId?: string
          referansNo?: string | null
          toplamTutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "satin_alimlar_kullaniciId_fkey"
            columns: ["kullaniciId"]
            isOneToOne: false
            referencedRelation: "kullanicilar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satin_alimlar_paketId_fkey"
            columns: ["paketId"]
            isOneToOne: false
            referencedRelation: "paketler"
            referencedColumns: ["id"]
          },
        ]
      }
      sinav_katilimlar: {
        Row: {
          baslangicZamani: string | null
          bitisZamani: string | null
          bosSayisi: number
          cevapYontemi: Database["public"]["Enums"]["CevapYontemi"]
          dogruSayisi: number
          durum: Database["public"]["Enums"]["KatilimDurumu"]
          guncellendi: string
          hamPuan: number
          id: string
          netPuan: number
          ogrenciId: string
          olusturuldu: string
          optikFormUrl: string | null
          optikOkundu: boolean
          sinavId: string
          ulusalSiralama: number | null
          yanlisSayisi: number
          yuzdelik: number | null
        }
        Insert: {
          baslangicZamani?: string | null
          bitisZamani?: string | null
          bosSayisi?: number
          cevapYontemi?: Database["public"]["Enums"]["CevapYontemi"]
          dogruSayisi?: number
          durum?: Database["public"]["Enums"]["KatilimDurumu"]
          guncellendi: string
          hamPuan?: number
          id: string
          netPuan?: number
          ogrenciId: string
          olusturuldu?: string
          optikFormUrl?: string | null
          optikOkundu?: boolean
          sinavId: string
          ulusalSiralama?: number | null
          yanlisSayisi?: number
          yuzdelik?: number | null
        }
        Update: {
          baslangicZamani?: string | null
          bitisZamani?: string | null
          bosSayisi?: number
          cevapYontemi?: Database["public"]["Enums"]["CevapYontemi"]
          dogruSayisi?: number
          durum?: Database["public"]["Enums"]["KatilimDurumu"]
          guncellendi?: string
          hamPuan?: number
          id?: string
          netPuan?: number
          ogrenciId?: string
          olusturuldu?: string
          optikFormUrl?: string | null
          optikOkundu?: boolean
          sinavId?: string
          ulusalSiralama?: number | null
          yanlisSayisi?: number
          yuzdelik?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sinav_katilimlar_ogrenciId_fkey"
            columns: ["ogrenciId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinav_katilimlar_sinavId_fkey"
            columns: ["sinavId"]
            isOneToOne: false
            referencedRelation: "sinavlar"
            referencedColumns: ["id"]
          },
        ]
      }
      sinavlar: {
        Row: {
          aciklama: string | null
          aktif: boolean
          baslangicZamani: string
          baslik: string
          bitisZamani: string
          cevapAnahtari: Json | null
          grupId: string
          guncellendi: string
          id: string
          kitapcikBolumAdi: string | null
          kitapcikTarihMetni: string | null
          kitapcikUrl: string | null
          konuDagilimi: Json | null
          olusturuldu: string
          sureDakika: number
          tur: Database["public"]["Enums"]["SinavTuru"]
          yayinlandi: boolean
        }
        Insert: {
          aciklama?: string | null
          aktif?: boolean
          baslangicZamani: string
          baslik: string
          bitisZamani: string
          cevapAnahtari?: Json | null
          grupId: string
          guncellendi: string
          id: string
          kitapcikBolumAdi?: string | null
          kitapcikTarihMetni?: string | null
          kitapcikUrl?: string | null
          konuDagilimi?: Json | null
          olusturuldu?: string
          sureDakika?: number
          tur: Database["public"]["Enums"]["SinavTuru"]
          yayinlandi?: boolean
        }
        Update: {
          aciklama?: string | null
          aktif?: boolean
          baslangicZamani?: string
          baslik?: string
          bitisZamani?: string
          cevapAnahtari?: Json | null
          grupId?: string
          guncellendi?: string
          id?: string
          kitapcikBolumAdi?: string | null
          kitapcikTarihMetni?: string | null
          kitapcikUrl?: string | null
          konuDagilimi?: Json | null
          olusturuldu?: string
          sureDakika?: number
          tur?: Database["public"]["Enums"]["SinavTuru"]
          yayinlandi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sinavlar_grupId_fkey"
            columns: ["grupId"]
            isOneToOne: false
            referencedRelation: "gruplar"
            referencedColumns: ["id"]
          },
        ]
      }
      sistem_ayarlari: {
        Row: {
          aciklama: string | null
          anahtar: string
          deger: string
          guncellendi: string
          olusturuldu: string
        }
        Insert: {
          aciklama?: string | null
          anahtar: string
          deger: string
          guncellendi: string
          olusturuldu?: string
        }
        Update: {
          aciklama?: string | null
          anahtar?: string
          deger?: string
          guncellendi?: string
          olusturuldu?: string
        }
        Relationships: []
      }
      site_genel_icerik: {
        Row: {
          guncellendi: string
          icerik: Json
          id: string
          olusturuldu: string
        }
        Insert: {
          guncellendi: string
          icerik?: Json
          id: string
          olusturuldu?: string
        }
        Update: {
          guncellendi?: string
          icerik?: Json
          id?: string
          olusturuldu?: string
        }
        Relationships: []
      }
      sorular: {
        Row: {
          aiMeta: Json | null
          aiModeli: string | null
          aiUretildi: boolean
          dogruCevap: string
          gorselUrl: string | null
          id: string
          kazanim: string | null
          konuId: string
          metinHtml: string
          olusturuldu: string
          onayDurumu: Database["public"]["Enums"]["SoruOnayDurumu"]
          secenekler: Json
          sinavId: string | null
          siraNo: number
          zorluk: Database["public"]["Enums"]["SoruZorlugu"]
        }
        Insert: {
          aiMeta?: Json | null
          aiModeli?: string | null
          aiUretildi?: boolean
          dogruCevap: string
          gorselUrl?: string | null
          id: string
          kazanim?: string | null
          konuId: string
          metinHtml: string
          olusturuldu?: string
          onayDurumu?: Database["public"]["Enums"]["SoruOnayDurumu"]
          secenekler: Json
          sinavId?: string | null
          siraNo: number
          zorluk?: Database["public"]["Enums"]["SoruZorlugu"]
        }
        Update: {
          aiMeta?: Json | null
          aiModeli?: string | null
          aiUretildi?: boolean
          dogruCevap?: string
          gorselUrl?: string | null
          id?: string
          kazanim?: string | null
          konuId?: string
          metinHtml?: string
          olusturuldu?: string
          onayDurumu?: Database["public"]["Enums"]["SoruOnayDurumu"]
          secenekler?: Json
          sinavId?: string | null
          siraNo?: number
          zorluk?: Database["public"]["Enums"]["SoruZorlugu"]
        }
        Relationships: [
          {
            foreignKeyName: "sorular_konuId_fkey"
            columns: ["konuId"]
            isOneToOne: false
            referencedRelation: "konular"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sorular_sinavId_fkey"
            columns: ["sinavId"]
            isOneToOne: false
            referencedRelation: "sinavlar"
            referencedColumns: ["id"]
          },
        ]
      }
      sosyal_davetler: {
        Row: {
          aliciEmail: string | null
          aliciId: string | null
          davetKodu: string
          gondericId: string
          id: string
          kabul: boolean
          olusturuldu: string
        }
        Insert: {
          aliciEmail?: string | null
          aliciId?: string | null
          davetKodu: string
          gondericId: string
          id: string
          kabul?: boolean
          olusturuldu?: string
        }
        Update: {
          aliciEmail?: string | null
          aliciId?: string | null
          davetKodu?: string
          gondericId?: string
          id?: string
          kabul?: boolean
          olusturuldu?: string
        }
        Relationships: [
          {
            foreignKeyName: "sosyal_davetler_aliciId_fkey"
            columns: ["aliciId"]
            isOneToOne: false
            referencedRelation: "kullanicilar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sosyal_davetler_gondericId_fkey"
            columns: ["gondericId"]
            isOneToOne: false
            referencedRelation: "kullanicilar"
            referencedColumns: ["id"]
          },
        ]
      }
      study_gorevler: {
        Row: {
          baslik: string
          ders: string
          gun: number
          id: string
          konu: string
          olusturuldu: string
          planId: string
          sureDakika: number
          tamamlandi: boolean
        }
        Insert: {
          baslik: string
          ders: string
          gun: number
          id: string
          konu: string
          olusturuldu?: string
          planId: string
          sureDakika: number
          tamamlandi?: boolean
        }
        Update: {
          baslik?: string
          ders?: string
          gun?: number
          id?: string
          konu?: string
          olusturuldu?: string
          planId?: string
          sureDakika?: number
          tamamlandi?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "study_gorevler_planId_fkey"
            columns: ["planId"]
            isOneToOne: false
            referencedRelation: "study_planlar"
            referencedColumns: ["id"]
          },
        ]
      }
      study_planlar: {
        Row: {
          aiUretildi: boolean
          aktif: boolean
          baslangic: string
          baslik: string
          bitis: string
          hedefler: Json
          id: string
          ogrenciId: string
          olusturuldu: string
        }
        Insert: {
          aiUretildi?: boolean
          aktif?: boolean
          baslangic: string
          baslik: string
          bitis: string
          hedefler: Json
          id: string
          ogrenciId: string
          olusturuldu?: string
        }
        Update: {
          aiUretildi?: boolean
          aktif?: boolean
          baslangic?: string
          baslik?: string
          bitis?: string
          hedefler?: Json
          id?: string
          ogrenciId?: string
          olusturuldu?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_planlar_ogrenciId_fkey"
            columns: ["ogrenciId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      takvim_etkinlikler: {
        Row: {
          aciklama: string | null
          baslik: string
          grupId: string
          id: string
          olusturuldu: string
          renk: string
          tarih: string
        }
        Insert: {
          aciklama?: string | null
          baslik: string
          grupId: string
          id: string
          olusturuldu?: string
          renk?: string
          tarih: string
        }
        Update: {
          aciklama?: string | null
          baslik?: string
          grupId?: string
          id?: string
          olusturuldu?: string
          renk?: string
          tarih?: string
        }
        Relationships: [
          {
            foreignKeyName: "takvim_etkinlikler_grupId_fkey"
            columns: ["grupId"]
            isOneToOne: false
            referencedRelation: "gruplar"
            referencedColumns: ["id"]
          },
        ]
      }
      universite_bolumler: {
        Row: {
          bolumAdi: string
          dolulukOrani: number | null
          id: string
          kontenjan: number | null
          maxPuan: number | null
          maxSiralama: number | null
          minPuan: number | null
          minSiralama: number | null
          sinavTuru: Database["public"]["Enums"]["SinavTuru"]
          universiteId: string
          yil: number
        }
        Insert: {
          bolumAdi: string
          dolulukOrani?: number | null
          id: string
          kontenjan?: number | null
          maxPuan?: number | null
          maxSiralama?: number | null
          minPuan?: number | null
          minSiralama?: number | null
          sinavTuru: Database["public"]["Enums"]["SinavTuru"]
          universiteId: string
          yil: number
        }
        Update: {
          bolumAdi?: string
          dolulukOrani?: number | null
          id?: string
          kontenjan?: number | null
          maxPuan?: number | null
          maxSiralama?: number | null
          minPuan?: number | null
          minSiralama?: number | null
          sinavTuru?: Database["public"]["Enums"]["SinavTuru"]
          universiteId?: string
          yil?: number
        }
        Relationships: [
          {
            foreignKeyName: "universite_bolumler_universiteId_fkey"
            columns: ["universiteId"]
            isOneToOne: false
            referencedRelation: "universiteler"
            referencedColumns: ["id"]
          },
        ]
      }
      universite_hedefler: {
        Row: {
          bolumId: string
          id: string
          ogrenciId: string
          olusturuldu: string
          oncelik: number
          tahminPuan: number | null
          tahminSiralama: number | null
        }
        Insert: {
          bolumId: string
          id: string
          ogrenciId: string
          olusturuldu?: string
          oncelik?: number
          tahminPuan?: number | null
          tahminSiralama?: number | null
        }
        Update: {
          bolumId?: string
          id?: string
          ogrenciId?: string
          olusturuldu?: string
          oncelik?: number
          tahminPuan?: number | null
          tahminSiralama?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "universite_hedefler_bolumId_fkey"
            columns: ["bolumId"]
            isOneToOne: false
            referencedRelation: "universite_bolumler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universite_hedefler_ogrenciId_fkey"
            columns: ["ogrenciId"]
            isOneToOne: false
            referencedRelation: "ogrenci_profiller"
            referencedColumns: ["id"]
          },
        ]
      }
      universiteler: {
        Row: {
          ad: string
          id: string
          kisaAd: string | null
          logo: string | null
          sehir: string
          tur: string
        }
        Insert: {
          ad: string
          id: string
          kisaAd?: string | null
          logo?: string | null
          sehir: string
          tur: string
        }
        Update: {
          ad?: string
          id?: string
          kisaAd?: string | null
          logo?: string | null
          sehir?: string
          tur?: string
        }
        Relationships: []
      }
      veli_profiller: {
        Row: {
          ad: string
          id: string
          kullaniciId: string
          olusturuldu: string
          soyad: string
          telefon: string | null
        }
        Insert: {
          ad: string
          id: string
          kullaniciId: string
          olusturuldu?: string
          soyad: string
          telefon?: string | null
        }
        Update: {
          ad?: string
          id?: string
          kullaniciId?: string
          olusturuldu?: string
          soyad?: string
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veli_profiller_kullaniciId_fkey"
            columns: ["kullaniciId"]
            isOneToOne: false
            referencedRelation: "kullanicilar"
            referencedColumns: ["id"]
          },
        ]
      }
      yayinlar: {
        Row: {
          aciklama: string | null
          ad: string
          aktif: boolean
          gorselUrl: string | null
          id: string
          logoUrl: string | null
          olusturuldu: string
          sira: number
        }
        Insert: {
          aciklama?: string | null
          ad: string
          aktif?: boolean
          gorselUrl?: string | null
          id: string
          logoUrl?: string | null
          olusturuldu?: string
          sira?: number
        }
        Update: {
          aciklama?: string | null
          ad?: string
          aktif?: boolean
          gorselUrl?: string | null
          id?: string
          logoUrl?: string | null
          olusturuldu?: string
          sira?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ArkadaslikDurumu:
        | "BEKLIYOR"
        | "KABUL_EDILDI"
        | "REDDEDILDI"
        | "ENGELLENDI"
      CevapYontemi: "DIJITAL" | "OPTIK_FORM"
      DuelloDurumu:
        | "DAVET_GONDERILDI"
        | "KABUL_EDILDI"
        | "DEVAM_EDIYOR"
        | "TAMAMLANDI"
        | "IPTAL"
      KatilimDurumu: "BEKLIYOR" | "DEVAM_EDIYOR" | "TAMAMLANDI" | "IPTAL"
      OdemeDurumu:
        | "BEKLEMEDE"
        | "TAMAMLANDI"
        | "IPTAL_EDILDI"
        | "IADE_EDILDI"
        | "HATA"
      OgretimTuru:
        | "YKS"
        | "LGS"
        | "SINIF_6"
        | "SINIF_7"
        | "SINIF_9"
        | "SINIF_10"
        | "SINIF_11"
      Rol: "OGRENCI" | "VELI" | "TEACHER" | "ADMIN" | "SUPER_ADMIN"
      SinavAtamaKaynak: "MANUEL" | "PAKET"
      SinavTuru: "TYT" | "AYT" | "AYT_TYT" | "LGS"
      SoruOnayDurumu: "ONAY_BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI"
      SoruZorlugu: "KOLAY" | "ORTA" | "ZOR"
      YksKonuSegmenti:
        | "TYT"
        | "AYT_MATEMATIK"
        | "AYT_FEN_BILIMLERI"
        | "AYT_EDEBIYAT"
        | "AYT_TARIH2"
        | "AYT_COG2"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ArkadaslikDurumu: [
        "BEKLIYOR",
        "KABUL_EDILDI",
        "REDDEDILDI",
        "ENGELLENDI",
      ],
      CevapYontemi: ["DIJITAL", "OPTIK_FORM"],
      DuelloDurumu: [
        "DAVET_GONDERILDI",
        "KABUL_EDILDI",
        "DEVAM_EDIYOR",
        "TAMAMLANDI",
        "IPTAL",
      ],
      KatilimDurumu: ["BEKLIYOR", "DEVAM_EDIYOR", "TAMAMLANDI", "IPTAL"],
      OdemeDurumu: [
        "BEKLEMEDE",
        "TAMAMLANDI",
        "IPTAL_EDILDI",
        "IADE_EDILDI",
        "HATA",
      ],
      OgretimTuru: ["YKS", "LGS", "SINIF_6", "SINIF_7", "SINIF_9", "SINIF_10", "SINIF_11"],
      Rol: ["OGRENCI", "VELI", "TEACHER", "ADMIN", "SUPER_ADMIN"],
      SinavAtamaKaynak: ["MANUEL", "PAKET"],
      SinavTuru: ["TYT", "AYT", "AYT_TYT", "LGS"],
      SoruOnayDurumu: ["ONAY_BEKLIYOR", "ONAYLANDI", "REDDEDILDI"],
      SoruZorlugu: ["KOLAY", "ORTA", "ZOR"],
      YksKonuSegmenti: [
        "TYT",
        "AYT_MATEMATIK",
        "AYT_FEN_BILIMLERI",
        "AYT_EDEBIYAT",
        "AYT_TARIH2",
        "AYT_COG2",
      ],
    },
  },
} as const

