import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { egitimStorageBucket } from '../config/supabaseAdmin';
import { s3AnahtarlariGecerli } from './storageYapilandirma';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT || (
  SUPABASE_URL ? `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/s3` : undefined
);
const REGION = process.env.AWS_REGION || process.env.S3_REGION || (S3_ENDPOINT ? 'ap-northeast-1' : 'eu-central-1');
const DEFAULT_BUCKET = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || 'dokuman';
const EGITIM_BUCKET = egitimStorageBucket();

function s3Client(): S3Client {
  if (!s3AnahtarlariGecerli()) {
    throw new Error('Geçerli AWS S3 anahtarları yapılandırılmamış.');
  }
  return new S3Client({
  region: REGION,
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

export async function s3DosyaYukle(
  dosyaBuffer: Buffer,
  dosyaAdi: string,
  mimeType: string,
  klasor = 'uploads'
): Promise<string> {
  const uzanti = path.extname(dosyaAdi);
  const benzersizAd = `${klasor}/${uuidv4()}${uzanti}`;

  await s3Client().send(
    new PutObjectCommand({
      Bucket: DEFAULT_BUCKET,
      Key: benzersizAd,
      Body: dosyaBuffer,
      ContentType: mimeType,
    })
  );

  return s3PublicUrl(benzersizAd, DEFAULT_BUCKET);
}

export async function imzaliUrlOlustur(key: string, sureSaniye = 3600): Promise<string> {
  const komut = new PutObjectCommand({ Bucket: DEFAULT_BUCKET, Key: key });
  return getSignedUrl(s3Client(), komut, { expiresIn: sureSaniye });
}

export function s3PublicUrl(key: string, bucket = DEFAULT_BUCKET): string {
  if (SUPABASE_URL && S3_ENDPOINT?.includes('/storage/v1/s3')) {
    return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${encodeURI(key)}`;
  }
  return `https://${bucket}.s3.${REGION}.amazonaws.com/${encodeURI(key)}`;
}

export async function s3ImzaliYuklemeUrlOlustur(
  dosyaAdi: string,
  mimeType: string,
  klasor = '',
): Promise<{ key: string; uploadUrl: string; publicUrl: string; expiresIn: number }> {
  const uzanti = path.extname(dosyaAdi);
  const key = `${klasor ? `${klasor.replace(/\/+$/, '')}/` : ''}${uuidv4()}${uzanti}`;
  const expiresIn = 900;
  const komut = new PutObjectCommand({
    Bucket: EGITIM_BUCKET,
    Key: key,
    ContentType: mimeType || 'application/octet-stream',
  });

  return {
    key,
    uploadUrl: await getSignedUrl(s3Client(), komut, { expiresIn }),
    publicUrl: s3PublicUrl(key, EGITIM_BUCKET),
    expiresIn,
  };
}
