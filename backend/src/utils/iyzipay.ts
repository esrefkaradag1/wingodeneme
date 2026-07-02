const Iyzipay = require('iyzipay');

export const iyzipay = new Iyzipay({
  apiKey: process.env.IYZIPAY_API_KEY || 'sandbox-api-key',
  secretKey: process.env.IYZIPAY_SECRET_KEY || 'sandbox-secret-key',
  uri: process.env.IYZIPAY_URI || 'https://sandbox-api.iyzipay.com'
});
