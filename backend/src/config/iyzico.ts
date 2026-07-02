import Iyzipay from 'iyzipay';

/** 
 * Iyzico Sandbox Bilgileri (Geliştirme için)
 * Üretim ortamında bunları .env içinden okumalısınız.
 */
export const iyzicoConfig = {
  apiKey: process.env.IYZICO_API_KEY || 'sandbox-your-api-key',
  secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-your-secret-key',
  uri: process.env.IYZICO_URI || 'https://sandbox-api.iyzipay.com'
};

export const iyzipay = new Iyzipay(iyzicoConfig);

export const IYZICO_LOCALE = Iyzipay.LOCALE.TR;
export const IYZICO_CURRENCY = Iyzipay.CURRENCY.TRY;
