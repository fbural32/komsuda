import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
// Eşya: teslimat süresi, tavan 20 dk.
// Hizmet: ustanın varış süresi, tavan 120 dk.
const SURELER = { esya: [10, 15, 20], hizmet: [30, 60, 120] };
const TAVAN = { esya: 20, hizmet: 120 };

async function loadDeal(dealId, userId) {
  const { rows } = await query(
    `SELECT d.*, r.requester_id, r.price, r.fiyat_tipi, r.id AS request_id,
            c.name AS category, c.tur
       FROM deals d
       JOIN requests r ON r.id = d.request_id
       JOIN categories c ON c.id = r.category_id
      WHERE d.id = $1`,
    [dealId]
  );
  const deal = rows[0];
  if (!deal) return null;
  if (deal.requester_id !== userId && deal.responder_id !== userId) return null;
  deal.is_requester = deal.requester_id === userId;
  deal.sure_kurali = SURELER.esya;
  deal.randevulu = deal.tur === 'hizmet';
  deal.randevu_teklif_eden_benim = deal.randevu_teklif_eden === userId;
  deal.slot_metin = SLOTLAR[deal.randevu_slot] || null;
  return deal;
}

// Anlaşma durumu + mesajlar
router.get('/:id', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  const messages = await query(
    `SELECT m.id, m.sender_id, m.created_at, cr.text, m.photo_url,
            ST_Y(m.shared_location::geometry) AS lat,
            ST_X(m.shared_location::geometry) AS lng
       FROM messages m
       LEFT JOIN canned_replies cr ON cr.id = m.canned_reply_id
      WHERE m.deal_id = $1
      ORDER BY m.created_at`,
    [deal.id]
  );

  // Kesin konum sadece eşleşme sonrası açılır
  let exact = null;
  if (deal.status !== 'cancelled') {
    const { rows } = await query(
      `SELECT ST_Y(exact_location::geometry) AS lat,
              ST_X(exact_location::geometry) AS lng
         FROM requests WHERE id = $1`,
      [deal.request_id]
    );
    exact = rows[0];
  }

  res.json({
    deal,
    messages: messages.rows,
    delivery_location: exact,
    sure_secenekleri: SURELER[deal.tur] || SURELER.esya,
    tavan_dakika: TAVAN[deal.tur] || TAVAN.esya,
  });
});

// Hazır cevap listesi
router.get('/:id/replies', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  const side = deal.is_requester ? 'requester' : 'responder';
  const { rows } = await query(
    `SELECT id, text, "group" FROM canned_replies
      WHERE is_active AND side IN ($1,'both')
      ORDER BY sort_order`,
    [side]
  );
  res.json(rows);
});

// Fiyat onayı — iki taraf da onaylamadan süre adımına geçilmez
router.post('/:id/price-ok', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  const column = deal.is_requester ? 'price_ok_requester' : 'price_ok_responder';
  const { rows } = await query(
    `UPDATE deals SET ${column} = true WHERE id = $1
     RETURNING price_ok_requester, price_ok_responder`,
    [deal.id]
  );
  res.json(rows[0]);
});

// Ürün fotoğrafı yükle — sadece karşılık veren taraf, sadece eşyada
router.post('/:id/photo', requireAuth, async (req, res) => {
  const { photo_url } = req.body;
  if (!photo_url) return res.status(400).json({ error: 'Görsel gerekli' });

  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (deal.is_requester)
    return res.status(403).json({ error: 'Görseli ürünü getiren taraf yükler' });

  await query(
    'UPDATE deals SET photo_url = $2, photo_confirmed = false WHERE id = $1',
    [deal.id, photo_url]
  );
  await query(
    `INSERT INTO messages (deal_id, sender_id, photo_url) VALUES ($1,$2,$3)`,
    [deal.id, req.user.id, photo_url]
  );
  res.status(201).json({ photo_url });
});

// Fotoğrafı onayla — sadece istek sahibi
router.post('/:id/confirm-photo', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (!deal.is_requester)
    return res.status(403).json({ error: 'Görseli isteği açan taraf onaylar' });
  if (!deal.photo_url)
    return res.status(409).json({ error: 'Henüz görsel yüklenmedi' });

  const { rows } = await query(
    'UPDATE deals SET photo_confirmed = true WHERE id = $1 RETURNING photo_confirmed',
    [deal.id]
  );
  res.json(rows[0]);
});

// Ürün/iş fotoğrafı gönder — karşılık veren taraf yükler.
// Fotoğraf veritabanında saklanır, anlaşma kapanınca silinir.
const MAX_FOTO_BYTE = 900 * 1024;

router.post('/:id/photo', requireAuth, async (req, res) => {
  const { base64, mime = 'image/jpeg' } = req.body;
  if (!base64) return res.status(400).json({ error: 'Fotoğraf gerekli' });

  const buf = Buffer.from(base64, 'base64');
  if (!buf.length) return res.status(400).json({ error: 'Fotoğraf okunamadı' });
  if (buf.length > MAX_FOTO_BYTE)
    return res.status(413).json({ error: 'Fotoğraf çok büyük' });

  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (deal.is_requester)
    return res.status(403).json({ error: 'Fotoğrafı ürünü getiren taraf yükler' });

  // Eski fotoğrafı at, yenisini koy
  await query('DELETE FROM deal_photos WHERE deal_id = $1', [deal.id]);

  const { rows } = await query(
    `INSERT INTO deal_photos (deal_id, sender_id, mime, veri)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [deal.id, req.user.id, mime, buf]
  );
  const fotoId = rows[0].id;

  await query(
    'UPDATE deals SET photo_url = $2, photo_confirmed = false WHERE id = $1',
    [deal.id, fotoId]
  );
  await query(
    'INSERT INTO messages (deal_id, sender_id, photo_url) VALUES ($1,$2,$3)',
    [deal.id, req.user.id, fotoId]
  );
  res.status(201).json({ photo_id: fotoId });
});

// Fotoğrafı getir — sadece anlaşmanın iki tarafı görebilir
router.get('/:id/photo/:photoId', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  const { rows } = await query(
    'SELECT mime, veri FROM deal_photos WHERE id = $1 AND deal_id = $2',
    [req.params.photoId, deal.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Fotoğraf bulunamadı' });

  res.setHeader('Content-Type', rows[0].mime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(rows[0].veri);
});

// Fotoğrafı onayla — istek sahibi onaylamadan süre adımına geçilmez
router.post('/:id/confirm-photo', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (!deal.is_requester)
    return res.status(403).json({ error: 'Onayı isteği açan taraf verir' });
  if (!deal.photo_url)
    return res.status(409).json({ error: 'Henüz fotoğraf yüklenmedi' });

  const { rows } = await query(
    'UPDATE deals SET photo_confirmed = true WHERE id = $1 RETURNING photo_confirmed',
    [deal.id]
  );
  res.json(rows[0]);
});

// Randevu teklif et (sadece hizmet)
router.post('/:id/propose-appointment', requireAuth, async (req, res) => {
  const { tarih, slot } = req.body;

  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (!deal.randevulu)
    return res.status(400).json({ error: 'Bu istek randevulu değil' });
  if (!deal.price_ok_requester || !deal.price_ok_responder)
    return res.status(409).json({ error: 'Önce iki taraf da fiyatı onaylamalı' });
  if (!deal.photo_confirmed)
    return res.status(409).json({ error: 'Önce fotoğraf onaylanmalı' });
  if (!SLOTLAR[slot])
    return res.status(400).json({ error: 'Geçersiz saat aralığı' });

  const g = new Date(tarih);
  if (Number.isNaN(g.getTime()))
    return res.status(400).json({ error: 'Geçersiz tarih' });

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const fark = Math.round((g - bugun) / 86400000);
  if (fark < 0) return res.status(400).json({ error: 'Geçmiş bir tarih seçilemez' });
  if (fark > MAX_GUN_ILERI)
    return res.status(400).json({ error: `En fazla ${MAX_GUN_ILERI} gün sonrası seçilebilir` });

  // Randevu bir kez değiştirilebilir
  if (deal.randevu_onaylandi && deal.randevu_degisti)
    return res.status(409).json({ error: 'Randevu bir kez değiştirilebilir' });

  const { rows } = await query(
    `UPDATE deals
        SET randevu_tarih = $2, randevu_slot = $3,
            randevu_teklif_eden = $4, randevu_onaylandi = false,
            randevu_degisti = CASE WHEN randevu_onaylandi THEN true ELSE randevu_degisti END,
            status = 'negotiating'
      WHERE id = $1
      RETURNING randevu_tarih, randevu_slot, randevu_degisti`,
    [deal.id, tarih, slot, req.user.id]
  );
  res.json({ ...rows[0], slot_metin: SLOTLAR[slot] });
});

// Randevuyu onayla
router.post('/:id/confirm-appointment', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (!deal.randevu_tarih)
    return res.status(409).json({ error: 'Henüz randevu teklifi yok' });
  if (deal.randevu_teklif_eden === req.user.id)
    return res.status(403).json({ error: 'Kendi teklifini onaylayamazsın' });

  const { rows } = await query(
    `UPDATE deals SET randevu_onaylandi = true, status = 'scheduled'
      WHERE id = $1
      RETURNING randevu_tarih, randevu_slot, status`,
    [deal.id]
  );
  res.json({ ...rows[0], slot_metin: SLOTLAR[rows[0].randevu_slot] });
});

// Saat aralığı seçenekleri
router.get('/:id/slots', requireAuth, async (_req, res) => {
  res.json(
    Object.entries(SLOTLAR).map(([deger, metin]) => ({ deger, metin }))
  );
});

// Süre teklif et (sadece eşya)
router.post('/:id/propose-duration', requireAuth, async (req, res) => {
  const { minutes } = req.body;

  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  const secenekler = SURELER[deal.tur] || SURELER.esya;
  if (!secenekler.includes(minutes))
    return res.status(400).json({
      error: `Süre ${secenekler.join(', ')} dk seçeneklerinden biri olmalı`,
    });

  if (!deal.price_ok_requester || !deal.price_ok_responder)
    return res.status(409).json({ error: 'Önce iki taraf da fiyatı onaylamalı' });

  // Eşyada ürün fotoğrafı onaylanmadan süre başlamaz
  if (deal.tur === 'esya' && !deal.photo_confirmed)
    return res.status(409).json({
      error: 'Önce ürün fotoğrafı yüklenip onaylanmalı',
    });

  const { rows } = await query(
    `UPDATE deals
        SET duration_minutes = $2, duration_proposed_by = $3, duration_confirmed = false
      WHERE id = $1 RETURNING duration_minutes`,
    [deal.id, minutes, req.user.id]
  );
  res.json(rows[0]);
});

// Süreyi onayla — sayaç ancak burada başlar
router.post('/:id/confirm-duration', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (!deal.duration_minutes)
    return res.status(409).json({ error: 'Henüz süre teklifi yok' });
  if (deal.duration_proposed_by === req.user.id)
    return res.status(403).json({ error: 'Kendi teklifini onaylayamazsın' });

  const { rows } = await query(
    `UPDATE deals
        SET duration_confirmed = true,
            status = 'running',
            timer_started_at = now(),
            timer_ends_at = now() + (duration_minutes || ' minutes')::interval
      WHERE id = $1
      RETURNING duration_minutes, timer_started_at, timer_ends_at, status`,
    [deal.id]
  );
  res.json(rows[0]);
});

// Ek süre iste — tek seferlik, toplam tavan 20 dk
router.post('/:id/extend', requireAuth, async (req, res) => {
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (deal.status !== 'running')
    return res.status(409).json({ error: 'Sayaç çalışmıyor' });
  if (deal.extension_used)
    return res.status(409).json({ error: 'Ek süre hakkın bitti' });

  const tavan = TAVAN[deal.tur] || TAVAN.esya;
  const add = tavan - deal.duration_minutes;
  if (add <= 0)
    return res.status(409).json({ error: `${tavan} dk tavanına ulaşıldı` });

  const { rows } = await query(
    `UPDATE deals
        SET extension_used = true,
            duration_minutes = $2,
            timer_ends_at = timer_started_at + ($2 || ' minutes')::interval
      WHERE id = $1
      RETURNING duration_minutes, timer_ends_at`,
    [deal.id, tavan]
  );
  res.json({ ...rows[0], added_minutes: add });
});

// Hazır cevap gönder
router.post('/:id/reply', requireAuth, async (req, res) => {
  const { canned_reply_id } = req.body;
  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  const side = deal.is_requester ? 'requester' : 'responder';
  const check = await query(
    `SELECT id FROM canned_replies
      WHERE id = $1 AND is_active AND side IN ($2,'both')`,
    [canned_reply_id, side]
  );
  if (!check.rows.length)
    return res.status(400).json({ error: 'Geçersiz cevap' });

  const { rows } = await query(
    `INSERT INTO messages (deal_id, sender_id, canned_reply_id)
     VALUES ($1,$2,$3) RETURNING id, created_at`,
    [deal.id, req.user.id, canned_reply_id]
  );
  res.status(201).json(rows[0]);
});

// Konum paylaş
router.post('/:id/share-location', requireAuth, async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'Konum gerekli' });

  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  const { rows } = await query(
    `INSERT INTO messages (deal_id, sender_id, shared_location)
     VALUES ($1,$2, ST_MakePoint($3,$4)::geography)
     RETURNING id, created_at`,
    [deal.id, req.user.id, lng, lat]
  );
  res.status(201).json(rows[0]);
});

// Tamamla / iptal et — mesajlar ve konumlar silinir
router.post('/:id/close', requireAuth, async (req, res) => {
  const { outcome } = req.body; // 'completed' | 'cancelled'
  if (!['completed', 'cancelled'].includes(outcome))
    return res.status(400).json({ error: 'Geçersiz işlem' });

  const deal = await loadDeal(req.params.id, req.user.id);
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

  await query('UPDATE deals SET status = $2 WHERE id = $1', [deal.id, outcome]);
  await query('UPDATE requests SET status = $2 WHERE id = $1', [
    deal.request_id,
    outcome,
  ]);
  await query('DELETE FROM messages WHERE deal_id = $1', [deal.id]);
  await query('DELETE FROM deal_photos WHERE deal_id = $1', [deal.id]);

  if (outcome === 'completed') {
    await query(
      'UPDATE users SET deal_count = deal_count + 1 WHERE id IN ($1,$2)',
      [deal.requester_id, deal.responder_id]
    );
    return res.json({ status: outcome });
  }

  // İptal: karşı taraf bu isteğin engelli listesine eklenir.
  // İstek tekrar yayınlanırsa liste devralınır, o kişi bir daha teklif veremez.
  const other = deal.is_requester ? deal.responder_id : deal.requester_id;
  await query(
    `UPDATE requests
        SET blocked_user_ids = array_append(blocked_user_ids, $2)
      WHERE id = $1 AND NOT ($2 = ANY(blocked_user_ids))`,
    [deal.request_id, other]
  );

  res.json({ status: outcome, can_repost: deal.is_requester });
});

export default router;
