import { Router } from 'express';
import { kimlikDogrula } from '../middlewares/auth.middleware';
import {
  odemeBaslatController,
  odemeCallbackController
} from '../controllers/odeme.controller';

const router = Router();

// Kullanıcının paketi satın almak için istek atacağı endpoint
router.post('/checkout', kimlikDogrula, odemeBaslatController);

// Iyzico'nun ödeme sonucunu POST edeceği endpoint (Public olmalı)
router.post('/callback', odemeCallbackController);

export default router;
