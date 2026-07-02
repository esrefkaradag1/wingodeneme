
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.kullanici.findUnique({
    where: { email: 'demo@ogrenci.com' },
    include: { ogrenciProfil: true }
  });

  if (!user || !user.ogrenciProfil) {
    console.log('User or profile not found');
    return;
  }

  const profileId = user.ogrenciProfil.id;
  console.log('Profile ID:', profileId);

  const participations = await prisma.sinavKatilim.findMany({
    where: { ogrenciId: profileId },
    include: { sinav: true }
  });

  console.log('Participations found:', participations.length);
  participations.forEach(p => {
    console.log(`- Exam: ${p.sinav.baslik}, Status: ${p.durum}, Exam Published: ${p.sinav.yayinlandi}, Exam End: ${p.sinav.bitisZamani}`);
  });

  const assignments = await prisma.ogrenciSinavAtama.findMany({
    where: { ogrenciId: profileId },
    include: { sinav: true }
  });
  console.log('Direct assignments:', assignments.length);

  const memberships = await prisma.grupUyelik.findMany({
    where: { ogrenciId: profileId },
    include: { grup: { include: { sinavlar: true } } }
  });
  console.log('Group memberships:', memberships.length);
  memberships.forEach(m => {
    console.log(`- Group: ${m.grup.ad}, Exams: ${m.grup.sinavlar.length}`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
