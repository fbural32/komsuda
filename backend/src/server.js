import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { query } from './db.js';
import users from './routes/users.js';
import requests from './routes/requests.js';
import deals from './routes/deals.js';
import ratings from './routes/ratings.js';

// Express 4 async route hatalarını kendiliğinden yakalamıyor.
// Bu sarmalayıcı olmadan tek bir sorgu hatası tüm sunucuyu çökertiyor.
function asyncGuard(router) {
  for (const katman of router.stack) {
    if (!katman.route) continue;
    katman.route.stack = katman.route.stack.map((k) => {
      const f = k.handle;
      if (f.length >= 4) return k;
      k.handle = (req, res, next) => {
        try {
          const sonuc = f(req, res, next);
          if (sonuc && typeof sonuc.catch === 'function') sonuc.catch(next);
        } catch (e) {
          next(e);
        }
      };
      return k;
    });
  }
  return router;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/users', asyncGuard(users));
app.use('/api/requests', asyncGuard(requests));
app.use('/api/deals', asyncGuard(deals));
app.use('/api/ratings', asyncGuard(ratings));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// Süresi dolan sayaçları ve terk edilmiş istekleri kapat
async function sweep() {
  try {
    // Sayacı dolan anlaşmalar: istek sahibine karar bırakılır, otomatik iptal yok
    await query(
      `UPDATE deals SET status = 'cancelled'
        WHERE status = 'running'
          AND timer_ends_at < now() - interval '30 minutes'`
    );
    // Randevu günü geçmiş hizmet anlaşmaları
    await query(
      `UPDATE deals SET status = 'cancelled'
        WHERE status = 'scheduled'
          AND randevu_tarih < current_date - interval '2 days'`
    );
    // Hiç karşılık almayan istekler 2 saat sonra düşer
    await query(
      `UPDATE requests r SET status = 'expired'
        FROM categories c
       WHERE c.id = r.category_id
         AND r.status = 'open'
         AND r.created_at < now() -
             CASE WHEN c.tur = 'hizmet' THEN interval '24 hours'
                  ELSE interval '2 hours' END`
    );
    // Tek taraflı puanlar 24 saat sonra görünür olur
    await query(
      `UPDATE ratings SET visible_at = now()
        WHERE visible_at IS NULL AND created_at < now() - interval '24 hours'`
    );
  } catch (e) {
    console.error('Temizlik görevi hatası:', e.message);
  }
}
setInterval(sweep, 5 * 60 * 1000);

// Son çare ağı: beklenmeyen bir hata sunucuyu düşürmesin
process.on('unhandledRejection', (sebep) => {
  console.error('Yakalanmayan söz reddi:', sebep);
});
process.on('uncaughtException', (hata) => {
  console.error('Yakalanmayan istisna:', hata);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Komşuda backend :${port}`));
