import { Server } from 'socket.io';
import { tokenDogrula } from './jwt';
import { logger } from './logger';

export function socketYonetici(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Kimlik doğrulama gerekli'));
    }
    try {
      const payload = tokenDogrula(token);
      socket.data.kullanici = payload;
      next();
    } catch {
      next(new Error('Geçersiz token'));
    }
  });

  io.on('connection', (socket) => {
    const kullanici = socket.data.kullanici;
    logger.debug(`Socket bağlandı: ${kullanici.userId}`);

    // Kullanıcıyı kendi odasına al
    socket.join(`kullanici:${kullanici.userId}`);

    // Sınav odasına katıl
    socket.on('sinava_katil', (sinavId: string) => {
      socket.join(`sinav:${sinavId}`);
      logger.debug(`${kullanici.userId} sınava katıldı: ${sinavId}`);
    });

    // Düello odası
    socket.on('duello_odasina_katil', (duelloId: string) => {
      socket.join(`duello:${duelloId}`);
    });

    // Canlı sıralama güncellemesi
    socket.on('siralama_iste', async (sinavId: string) => {
      socket.to(`sinav:${sinavId}`).emit('siralama_guncellendi');
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket ayrıldı: ${kullanici.userId}`);
    });
  });
}

export function kullaniciyaBildirimGonder(io: Server, kullaniciId: string, olay: string, veri: unknown): void {
  io.to(`kullanici:${kullaniciId}`).emit(olay, veri);
}
