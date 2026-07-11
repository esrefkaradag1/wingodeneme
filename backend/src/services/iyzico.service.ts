import { IYZICO_CURRENCY, IYZICO_LOCALE } from '../config/iyzico';
import Iyzipay from 'iyzipay';
import { logger } from '../utils/logger';
import { getIyziConfig } from './ayarlar.service';

interface IyziCheckoutRequest {
  conversationId: string;
  price: string;
  paidPrice: string;
  basketId: string;
  paymentGroup: string;
  callbackUrl: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    gsmNumber: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
  };
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: string;
  }>;
}

export const iyzicoService = {
  /**
   * Checkout Formu başlatır (iyzico'nun sunduğu güvenli ödeme sayfası)
   */
  async checkoutFormInitialize(request: IyziCheckoutRequest): Promise<any> {
    const config = await getIyziConfig();
    const iyzipay = new Iyzipay(config);

    return new Promise((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(
        {
          locale: IYZICO_LOCALE,
          currency: IYZICO_CURRENCY,
          ...request,
          enabledInstallments: [2, 3, 6, 9],
        },
        (err: any, result: any) => {
          if (err) {
            logger.error('Iyzico Checkout Form Hatası:', err);
            return reject(err);
          }
          if (result.status !== 'success') {
            console.log('--- IYZICO RESULT ---');
            console.log(result);
            logger.warn('Iyzico Checkout Form Başarısız: ' + result?.errorMessage);
            return resolve(result);
          }
          resolve(result);
        }
      );
    });
  },

  /**
   * Ödeme sonucunu doğrular (Iyzico'dan dönen token ile)
   */
  async checkoutFormAuthResult(token: string): Promise<any> {
    const config = await getIyziConfig();
    const iyzipay = new Iyzipay(config);

    return new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        {
          locale: IYZICO_LOCALE,
          token,
        },
        (err: any, result: any) => {
          if (err) {
            logger.error('Iyzico Token Sorgulama Hatası:', err);
            return reject(err);
          }
          resolve(result);
        }
      );
    });
  },
};
