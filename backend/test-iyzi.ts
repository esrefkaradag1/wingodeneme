import { getIyziConfig } from './src/services/ayarlar.service';
getIyziConfig().then(c => console.log('CONFIG:', c)).catch(console.error);
