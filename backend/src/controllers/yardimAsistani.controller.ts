import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { openrouterChat } from '../services/ai.service';

const SISTEM_YZ = `Sen Wingo sınav platformunun yönetici yardımcısısın. Türkçe yanıt ver.
- YKS, LGS, ÖSYM sınav takvimi ve başvuru tarihleri için her zaman resmi kaynağı (https://www.osym.gov.tr/) hatırlat; kesin tarih/zaman veremiyorsan açıkça söyle ve kullanıcıyı ÖSYM Aday İşlemleri sistemine yönlendir.
- Müfredat ve sınav yapısı genel bilgilerde yardımcı ol; platform içi sınav tarihleri kurum içi olduğu için okul veya platform yöneticisinin açıkladığı takvime bakmasını öner.
- Kısa, net, madde işaretli yanıtları tercih et.`;

export async function yardimAsistaniMesajController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ham = req.body?.mesajlar;
    if (!Array.isArray(ham) || ham.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'mesajlar dizisi gerekli' });
      return;
    }
    const mesajlar = ham
      .slice(-24)
      .map((m: { role?: string; content?: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 12000),
      }))
      .filter((m) => m.content.length > 0);

    if (mesajlar.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'İçerik boş' });
      return;
    }

    const tam = [{ role: 'system', content: SISTEM_YZ }, ...mesajlar];
    const yanit = await openrouterChat('openai/gpt-4o-mini', tam, { temperature: 0.35, max_tokens: 1800 }, 90000);
    res.json({ basarili: true, veri: { yanit: yanit.trim() } });
  } catch (e) {
    next(e);
  }
}
