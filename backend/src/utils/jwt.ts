import jwt from 'jsonwebtoken';

const GIZLI_ANAHTAR = process.env.API_SECRET || 'wingo-dev-secret';
const REFRESH_GIZLI = `${process.env.API_SECRET || 'wingo-dev-secret'}-refresh`;

export interface JwtPayload {
  userId: string;
  rol: string;
  email: string;
}

export function tokenOlustur(payload: JwtPayload): string {
  return jwt.sign(payload, GIZLI_ANAHTAR, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

export function refreshTokenOlustur(userId: string): string {
  return jwt.sign({ userId }, REFRESH_GIZLI, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  } as jwt.SignOptions);
}

export function tokenDogrula(token: string): JwtPayload {
  return jwt.verify(token, GIZLI_ANAHTAR) as JwtPayload;
}

export function refreshTokenDogrula(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_GIZLI) as { userId: string };
}
