const Iyzipay = require('iyzipay');

/** Eski odeme.controller yolu — IYZICO_* ve IYZIPAY_* env adlarını destekler */
export const iyzipay = new Iyzipay({
  apiKey:
    process.env.IYZICO_API_KEY ||
    process.env.IYZIPAY_API_KEY ||
    'sandbox-api-key',
  secretKey:
    process.env.IYZICO_SECRET_KEY ||
    process.env.IYZIPAY_SECRET_KEY ||
    'sandbox-secret-key',
  uri:
    process.env.IYZICO_URI ||
    process.env.IYZICO_BASE_URL ||
    process.env.IYZIPAY_URI ||
    'https://sandbox-api.iyzipay.com',
});
