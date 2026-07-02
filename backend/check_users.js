const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.kullanici.findMany({
      take: 5,
      select: { id: true, email: true, rol: true }
    });
    console.log('--- Kullanıcı Listesi ---');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
