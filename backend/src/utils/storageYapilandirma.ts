const PLACEHOLDER_ANAHTARLAR = new Set([
  '',
  'demo',
  'your-aws-access-key',
  'your-aws-secret-key',
  'changeme',
]);

export function s3AnahtarlariGecerli(): boolean {
  const id = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secret = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  return !PLACEHOLDER_ANAHTARLAR.has(id) && !PLACEHOLDER_ANAHTARLAR.has(secret);
}
