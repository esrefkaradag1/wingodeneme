import { iyzicoService } from './src/services/iyzico.service';
iyzicoService.checkoutFormInitialize({
  conversationId: 'test', price: '10.0', paidPrice: '10.0', basketId: 'test', paymentGroup: 'PRODUCT', callbackUrl: 'http://loc/c',
  buyer: { id: 'u', name: 'A', surname: 'B', gsmNumber: '+90500', email: 'a@b.com', identityNumber: '11111111111', registrationAddress: 'ist', ip: '::1', city: 'ist', country: 'tr' },
  shippingAddress: { contactName: 'A', city: 'ist', country: 'tr', address: 'ist' },
  billingAddress: { contactName: 'A', city: 'ist', country: 'tr', address: 'ist' },
  basketItems: [{ id: '1', name: 'A', category1: 'A', itemType: 'VIRTUAL', price: '10.0' }]
}).then(console.log).catch(console.error);
