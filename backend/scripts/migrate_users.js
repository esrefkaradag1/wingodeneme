const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

// DİKKAT: SERVICE_ROLE_KEY ASLA FRONTEND'DE KULLANILMAMALIDIR!
const SUPABASE_URL = 'https://somwrfqnshyevpxzpodo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbXdyZnFuc2h5ZXZweHpwb2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY5OTkwNiwiZXhwIjoyMDkyMjc1OTA2fQ.k4zlwOVJf0Yydq_3-xZbd5f4N8zO3P1O9hskqFu65Mc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const prisma = new PrismaClient();

async function migrateUsers() {
  console.log('🚀 Kullanıcı göçü başlatılıyor...');
  
  const kullanicilar = await prisma.kullanici.findMany();
  console.log(`${kullanicilar.length} kullanıcı bulundu.`);

  for (const user of kullanicilar) {
    console.log(`⏳ İşleniyor: ${user.email}`);
    
    // Supabase Auth'da kullanıcı oluştur
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'geciciSifre123!', // Şifreleri hash olarak taşımak SQL ile daha kolaydır, API ile yeni şifre atanabilir
      email_confirm: true,
      user_metadata: { rol: user.rol, legacy_id: user.id }
    });

    if (error) {
      console.error(`❌ Hata (${user.email}):`, error.message);
    } else {
      console.log(`✅ Başarılı: ${user.email} (Yeni ID: ${data.user.id})`);
      
      // Public tablodaki kullaniciId'yi güncelle
      // Burada yerel veritabanınızdaki ID'yi yeni Supabase Auth ID'si ile eşleştiriyoruz
    }
  }

  console.log('🏁 Göç tamamlandı.');
}

migrateUsers().catch(console.error);
