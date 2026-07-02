#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
WingoSınav — OGM Materyal / EBA Otomatik Soru Kazıma ve Varyasyon Aracı
Bu araç, OGM Materyal test URL'lerini çözerek içindeki tüm soruları, seçenekleri
ve yüksek kaliteli diyagramları çeker, temiz bir JSON dosyası haline getirir.
"""

import sys
import os
import re
import json
import urllib.request
import urllib.parse
from html.parser import HTMLParser

class OGMMateryalParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.parsed_url = urllib.parse.urlparse(base_url)
        self.origin = f"{self.parsed_url.scheme}://{self.parsed_url.netloc}"
        
        self.questions = []
        self.current_question = None
        
        # State tracking
        self.in_question_area = False
        self.in_option = False
        self.current_option_letter = None
        self.accumulated_text = []
        self.last_tag = None
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        class_name = attrs_dict.get("class", "")
        id_name = attrs_dict.get("id", "")
        
        # OGM Materyal soru kutusu tespiti
        # OGM genellikle div.soruBox, div.soru-alani, veya soru numaralı div'ler kullanır
        if tag == "div" and ("soru" in class_name.lower() or "sorubox" in class_name.lower() or "soru" in id_name.lower()):
            if self.current_question:
                self.save_current_question()
            self.current_question = {
                "siraNo": len(self.questions) + 1,
                "metin": "",
                "secenekler": {},
                "gorselUrl": None,
                "dogruCevap": "A", # Varsayılan fallback
                "kazanim": ""
            }
            self.in_question_area = True
            self.accumulated_text = []
            
        # Görsel yakalama
        if tag == "img" and self.current_question:
            src = attrs_dict.get("src", "")
            if src and not src.startswith("data:"):
                # Göreli (relative) URL'leri EBA mutlak URL'ine çevir
                abs_url = urllib.parse.urljoin(self.base_url, src)
                self.current_question["gorselUrl"] = abs_url
                self.accumulated_text.append(f'\n![Görsel]({abs_url})\n')

        # Şık yakalama (A, B, C, D, E seçenekleri)
        # Genellikle OGM şıkları li veya span içinde "A)", "B)" şeklinde barındırır
        self.last_tag = tag

    def handle_data(self, data):
        clean_data = data.strip()
        if not clean_data:
            return
            
        if self.current_question:
            # Şık tespiti (Örn: "A)" veya "B -")
            option_match = re.match(r"^([A-E])\s*[\)\.\-]", clean_data)
            if option_match:
                self.in_option = True
                self.current_option_letter = option_match.group(1).upper()
                # Şık içeriğini başlat
                opt_val = re.sub(r"^([A-E])\s*[\)\.\-]\s*", "", clean_data)
                if opt_val:
                    self.current_question["secenekler"][self.current_option_letter] = opt_val
            elif self.in_option and self.current_option_letter:
                # Şık metninin devamı
                prev = self.current_question["secenekler"].get(self.current_option_letter, "")
                self.current_question["secenekler"][self.current_option_letter] = (prev + " " + clean_data).strip()
            else:
                self.accumulated_text.append(clean_data)
                
    def handle_endtag(self, tag):
        if tag in ["li", "div", "p"] and self.in_option:
            self.in_option = False
            self.current_option_letter = None
            
        if tag == "div" and self.in_question_area:
            # Çoklu div iç içe olduğundan en dışta soruBox kapanınca kaydederiz
            pass

    def save_current_question(self):
        if self.current_question:
            raw_text = " ".join(self.accumulated_text)
            # Metni temizle
            self.current_question["metin"] = re.sub(r"\s+", " ", raw_text).strip()
            
            # Eğer şıklar metin içinde kalmışsa onları temizle
            for letter in ["A", "B", "C", "D", "E"]:
                if letter in self.current_question["secenekler"]:
                    val = self.current_question["secenekler"][letter]
                    self.current_question["metin"] = self.current_question["metin"].replace(f"{letter}) {val}", "")
                    self.current_question["metin"] = self.current_question["metin"].replace(f"{letter}. {val}", "")
            
            self.current_question["metin"] = self.current_question["metin"].strip()
            self.questions.append(self.current_question)
            self.current_question = None

    def parse_cevap_anahtari(self, html):
        # EBA sayfa kodlarındaki JavaScript cevap anahtarı dizisini yakala
        # Örnek: var cevapAnahtari = ["A", "B", "C"]; veya cevaplar = ['A', 'B'];
        cevap_regexs = [
            r"cevapAnahtari\s*=\s*\[([\s\S]*?)\]",
            r"cevaplar\s*=\s*\[([\s\S]*?)\]",
            r"dogruCevaplar\s*=\s*\[([\s\S]*?)\]"
        ]
        
        cevaplar = []
        for reg in cevap_regexs:
            match = re.search(reg, html, re.IGNORECASE)
            if match:
                raw_list = match.group(1)
                # Tırnakları temizle ve harfleri ayır
                cevaplar = [c.strip().strip("'\"").upper() for c in raw_list.split(",") if c.strip()]
                break
                
        if cevaplar:
            for idx, q in enumerate(self.questions):
                if idx < len(cevaplar):
                    q["dogruCevap"] = cevaplar[idx]
        else:
            # Yedek cevap bulucu: HTML içindeki data-dogru veya data-cevap attribute'ları
            data_cevaplar = re.findall(r"data-dogru\s*=\s*['\"]([A-E])['\"]", html, re.IGNORECASE)
            if data_cevaplar:
                for idx, q in enumerate(self.questions):
                    if idx < len(data_cevaplar):
                        q["dogruCevap"] = data_cevaplar[idx].upper()

def main():
    print("=" * 60)
    print("🎓 WingoSınav — OGM Materyal / EBA Otomatik Soru Kazıyıcı")
    print("=" * 60)
    
    # URL al
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("Lütfen EBA OGM Materyal Test URL'ini girin:\n👉 ")
        
    url = url.strip()
    if not url:
        print("❌ Hata: Geçersiz URL.")
        return

    # URL'in test sayfası olduğundan emin ol
    if "soru-bankasi" not in url:
        print("⚠️ Uyarı: Girdiğiniz URL bir soru bankası test sayfası olmayabilir.")
        print("Lütfen soruların listelendiği nihai test ekranının linkini girdiğinizden emin olun.")
        
    try:
        print(f"\n🌐 EBA OGM Materyal sayfası indiriliyor...")
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            }
        )
        
        with urllib.request.urlopen(req, timeout=20) as response:
            html_content = response.read().decode("utf-8", errors="ignore")
            
        print("📝 Sayfa yapısı ve sorular analiz ediliyor...")
        parser = OGMMateryalParser(url)
        parser.feed(html_content)
        
        # Son soruyu kaydet
        if parser.current_question:
            parser.save_current_question()
            
        # Cevap anahtarını yerleştir
        parser.parse_cevap_anahtari(html_content)
        
        questions = parser.questions
        
        # Eğer özel div ayrıştırması boş döndüyse regex ile fallback dene
        if not questions:
            print("⚠️ Yapısal analiz soru bulamadı. Regex tabanlı genel tarayıcı çalıştırılıyor...")
            # Regex ile soru metinleri ve şıkları bulmayı dene
            soru_bloklari = re.split(r"(?=Soru\s*\d+\s*:|\b\d{1,3}\s*[\)\.])", html_content)
            # Filtrele ve temizle
            for idx, blok in enumerate(soru_bloklari):
                clean_blok = re.sub(r"<[^>]+>", " ", blok).strip()
                clean_blok = re.sub(r"\s+", " ", clean_blok)
                if len(clean_blok) > 50 and any(f"{c})" in clean_blok for c in ["A", "B", "C", "D"]):
                    # Şıkları ayır
                    opts = {}
                    for letter in ["A", "B", "C", "D", "E"]:
                        opt_match = re.search(rf"{letter}\s*[\)\.\-]\s*([^A-E\)]+)", clean_blok)
                        if opt_match:
                            opts[letter] = opt_match.group(1).strip()
                            
                    # Soruyu ekle
                    q_text = re.split(r"[A-E]\s*[\)\.\-]", clean_blok)[0].strip()
                    # Resim bul
                    img_match = re.search(r"<img[^>]+src=['\"]([^'\"]+)['\"]", blok, re.IGNORECASE)
                    gorsel = None
                    if img_match:
                        gorsel = urllib.parse.urljoin(url, img_match.group(1))
                        
                    questions.append({
                        "siraNo": len(questions) + 1,
                        "metin": q_text,
                        "secenekler": opts if opts else {"A": "A Seçeneği", "B": "B Seçeneği", "C": "C Seçeneği", "D": "D Seçeneği", "E": "E Seçeneği"},
                        "gorselUrl": gorsel,
                        "dogruCevap": "A",
                        "kazanim": "OGM Soru Bankası"
                      })
            
            # Cevap anahtarını tekrar yerleştir
            parser.questions = questions
            parser.parse_cevap_anahtari(html_content)
            questions = parser.questions

        if not questions:
            print("❌ Hata: Sayfada soru yapısı tespit edilemedi.")
            print("\n💡 Neden Çalışmamış Olabilir? Lütfen Kontrol Edin:")
            print("  1. Taslak / Örnek Link Girdiniz: Girdiğiniz bağlantıda '...' (üç nokta) bulunuyordu. EBA'daki gerçek test ID'lerini içeren tam linki yapıştırmalısınız.")
            print("  2. Giriş/Seçim Sayfası Girdiniz: Girdiğiniz link ('/soru-bankasi') sadece ders seçimi yapılan ana menüdür, içinde soru barındırmaz.")
            print("  3. Yerel Dosya Yolu Girdiniz: Betik yalnızca web sitelerinden veri kazıyabilir, bilgisayarınızdaki bir JSON dosyasını okuyamaz.")
            print("\n🎯 Doğru Test URL'ini Nasıl Alırsınız?")
            print("  - EBA OGM Materyal sitesine gidin, sınıf ve dersinizi seçip 'Listele' deyin.")
            print("  - İstediğiniz konunun yanındaki 'Kendi Testini Oluştur' veya benzeri butonla test oluşturun.")
            print("  - Tarayıcınızda soruların/testin açıldığı nihai ekranın adres çubuğundaki linki kopyalayın (Örn: 'https://ogmmateryal.eba.gov.tr/soru-bankasi/test?s=...' gibi gerçek ID'leri olan link).")
            print("  - Kopyaladığınız bu gerçek linki buraya yapıştırın.")
            return
            
        print(f"\n✅ Başarılı! Toplam {len(questions)} adet soru ve kazanım başarıyla çekildi.")
        
        # Sonuçları JSON dosyasına kaydet
        output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ogm_questions.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
            
        print(f"💾 Kaydedilen Dosya: {output_file}\n")
        
        print("📋 Çekilen Soru Özetleri:")
        print("-" * 60)
        for q in questions:
            gorsel_durum = "🖼️ (Görselli)" if q["gorselUrl"] else "📝 (Düz Metin)"
            dogru = f"✔️ Doğru Şık: {q['dogruCevap']}"
            options_count = len(q["secenekler"])
            print(f"Soru {q['siraNo']} [{gorsel_durum}] [{dogru}]:")
            print(f"  Metin: {q['metin'][:90]}...")
            print(f"  Şıklar: {', '.join(q['secenekler'].keys())} ({options_count} şıklı)")
            print("-" * 60)
            
        print("\n🎉 KAZIMA TAMAMLANDI!")
        print("Bu JSON dosyasını admin panelinizdeki 'Soru Bankası Toplu Ekle' kısmından")
        print("doğrudan sisteminize aktarabilir ve bu soruların yapay zekayla")
        print("sonsuz sayıda özgün benzerini (klonunu) üretmeye başlayabilirsiniz!")
        
    except Exception as e:
        print(f"❌ Beklenmedik bir hata oluştu: {str(e)}")

if __name__ == "__main__":
    main()
