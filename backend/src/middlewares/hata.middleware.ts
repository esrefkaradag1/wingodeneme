import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppHatasi extends Error {
  constructor(
    public readonly mesaj: string,
    public readonly statusKodu: number = 500,
    public readonly isletimselHata = true,
    public readonly veri: Record<string, unknown> | null = null,
  ) {
    super(mesaj);
    Object.setPrototypeOf(this, AppHatasi.prototype);
  }
}

export function hataYonetici(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppHatasi) {
    res.status(err.statusKodu).json({
      basarili: false,
      mesaj: err.mesaj,
      ...(err.veri ? { veri: err.veri } : {}),
    });
    return;
  }

  logger.error('Beklenmeyen hata:', { hata: err.message, yol: req.path, yontem: req.method });

  res.status(500).json({
    basarili: false,
    mesaj: process.env.NODE_ENV === 'production' ? 'Sunucu hatası' : err.message,
  });
}

export function bulunamadi(req: Request, res: Response): void {
  res.status(404).json({
    basarili: false,
    mesaj: `${req.method} ${req.path} endpoint'i bulunamadı`,
  });
}
