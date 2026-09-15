import { Router } from 'express';
import { query, pool, blurCoords } from '../db.js';
import { requireAuth, requireVerified } from '../auth.js';
import { notifyNearby } from '../notify.js';

const router = Router();
// Eşya yakından gelir, hizmet veren araçla daha uzaktan gelebilir.
// Başlangıçta geniş tutuldu; kullanıcı yoğunluğu artınca daraltılabilir.
const RADIUS_ESYA = 10000;
const RADIUS_HIZMET = 25000;
const RADIUS_M = RADIUS_ESYA; // geriye dönük kullanım
const NOTIFY_COOLDOWN_MIN = 15;
const MAX_OFFERS = 3;
const URGENT_PER_DAY = 2;

router.get('/categories', async (_req, res) => {
  const { rows } = await query(
    'SELECT id, name, grup, icon, is_urgent_allowed, tur FROM categories WHERE is_active ORDER BY sort_order'
  );
  res.json(rows);
});

// Yakındaki açık istekler. Engellenmiş, kontenjanı dolmuş ve kendi isteklerin gelmez.
router.get('/', requireAuth, async (req, res) => {
  const { lat, lng, min = 50, max = 2000, category } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Konum gerekli' });

  const { rows } = await query(
    `SELECT r.id, r.price, r.fiyat_tipi, r.created_at, r.is_urgent,
            c.name AS category, c.icon, c.tur,
            ST_Y(r.approx_location::geometry) AS lat,
            ST_X(r.approx_location::geometry) AS lng,
            ROUND(ST_Distance(r.approx_location,
                  ST_MakePoint($2::float8,$1::float8)::geography)) AS distance_m,
            u.display_name, u.rating_avg, u.rating_count,
            (SELECT COUNT(*) FROM responses
              WHERE request_id = r.id AND status = 'pending')::int AS offer_count,
            EXISTS (SELECT 1 FROM responses
                     WHERE request_id = r.id AND responder_id = $6
                       AND status IN ('pending','selected')) AS already_offered
       FROM requests r
       JOIN categories c ON c.id = r.category_id
       JOIN users u ON u.id = r.requester_id
      WHERE r.status = 'open'
        AND r.requester_id <> $6
        AND NOT ($6 = ANY(r.blocked_user_ids))
        AND r.price BETWEEN $3::int AND $4::int
        AND ($5::int IS NULL OR r.category_id = $5)
        AND ST_DWithin(r.approx_location, ST_MakePoint($2,$1)::geography,
              CASE WHEN c.tur = 'hizmet' THEN $7::float8 ELSE $8::float8 END)
        AND (SELECT COUNT(*) FROM responses
              WHERE request_id = r.id AND status = 'pending') < $9
      ORDER BY r.created_at DESC
      LIMIT 100`,
    [lat, lng, min, max, category || null, req.user.id,
     RADIUS_HIZMET, RADIUS_ESYA, MAX_OFFERS]
  );
  res.json(rows);
});

router.post('/', requireAuth, requireVerified, async (req, res) => {
  const { category_id, price, lat, lng, is_urgent = false } = req.body;

  if (!category_id || !lat || !lng)
    return res.status(400).json({ error: 'Eksik bilgi' });
  if (price < 50 || price > 2000)
    return res.status(400).json({ error: 'Fiyat 50₺ ile 2000₺ arasında olmalı' });

  // Hizmet kategorilerinde fiyat saatlik, eşyada toplam
  const katBilgi = await query('SELECT tur FROM categories WHERE id = $1', [category_id]);
  if (!katBilgi.rows[0])
    return res.status(400).json({ error: 'Kategori bulunamadı' });
  const fiyatTipi = katBilgi.rows[0].tur === 'hizmet' ? 'saatlik' : 'toplam';


  // Acil mod: kategori izinli mi ve günlük hak kaldı mı?
  if (is_urgent) {
    const cat = await query(
      'SELECT is_urgent_allowed, name FROM categories WHERE id = $1',
      [category_id]
    );
    if (!cat.rows[0])
      return res.status(400).json({ error: 'Kategori bulunamadı' });
    if (!cat.rows[0].is_urgent_allowed)
      return res.status(400).json({
        error: `${cat.rows[0].name} için acil mod kullanılamaz`,
      });

    const used = await query(
      `SELECT COUNT(*)::int AS n FROM requests
        WHERE requester_id = $1 AND is_urgent
          AND created_at > now() - interval '24 hours'`,
      [req.user.id]
    );
    if (used.rows[0].n >= URGENT_PER_DAY)
      return res.status(429).json({
        error: `Günde en fazla ${URGENT_PER_DAY} acil istek oluşturabilirsin`,
      });
  }

  const open = await query(
    "SELECT id FROM requests WHERE requester_id = $1 AND status IN ('open','matched')",
    [req.user.id]
  );
  if (open.rows.length)
    return res.status(409).json({ error: 'Zaten açık bir isteğin var' });

  const blur = blurCoords(Number(lat), Number(lng));

  const { rows } = await query(
    `INSERT INTO requests
       (requester_id, category_id, price, fiyat_tipi, is_urgent,
        approx_location, exact_location, last_notified_at)
     VALUES ($1,$2,$3,$4,$5,
       ST_MakePoint($6,$7)::geography,
       ST_MakePoint($8,$9)::geography,
       now())
     RETURNING id, price, fiyat_tipi, is_urgent, status, created_at`,
    [req.user.id, category_id, price, fiyatTipi, !!is_urgent,
     blur.lng, blur.lat, lng, lat]
  );

  const bildirimYaricap =
    katBilgi.rows[0].tur === 'hizmet' ? RADIUS_HIZMET : RADIUS_ESYA;
  notifyNearby(rows[0].id, lat, lng, bildirimYaricap).catch(console.error);
  res.status(201).json(rows[0]);
});

// Kendi isteğim — gelen teklifler dahil
router.get('/:id/mine', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.price, r.fiyat_tipi, r.status, r.is_urgent,
            r.last_notified_at, r.created_at,
            c.name AS category, c.icon, c.tur, d.id AS deal_id
       FROM requests r
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN deals d ON d.request_id = r.id AND d.status <> 'cancelled'
      WHERE r.id = $1 AND r.requester_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'İstek bulunamadı' });

  const offers = await query(
    `SELECT resp.id, resp.created_at,
            u.id AS user_id, u.display_name, u.rating_avg,
            u.rating_count, u.deal_count
       FROM responses resp
       JOIN users u ON u.id = resp.responder_id
      WHERE resp.request_id = $1 AND resp.status = 'pending'
      ORDER BY resp.created_at`,
    [req.params.id]
  );

  const reach = await query(
    `SELECT COUNT(*)::int AS n
       FROM devices d
       JOIN users u ON u.id = d.user_id
       JOIN requests r ON r.id = $1
      WHERE d.notifications_enabled
        AND u.status = 'active'
        AND u.id <> r.requester_id
        AND d.last_location IS NOT NULL
        AND ST_DWithin(d.last_location, r.exact_location, $2::float8)`,
    [req.params.id, rows[0].tur === 'hizmet' ? RADIUS_HIZMET : RADIUS_ESYA]
  );

  res.json({
    ...rows[0],
    offers: offers.rows,
    max_offers: MAX_OFFERS,
    notified_count: reach.rows[0].n,
  });
});

router.post('/:id/renotify', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.last_notified_at, r.status, c.tur,
            ST_Y(r.exact_location::geometry) AS lat,
            ST_X(r.exact_location::geometry) AS lng
       FROM requests r JOIN categories c ON c.id = r.category_id
      WHERE r.id = $1 AND r.requester_id = $2`,
    [req.params.id, req.user.id]
  );
  const r = rows[0];
  if (!r) return res.status(404).json({ error: 'İstek bulunamadı' });
  if (r.status !== 'open')
    return res.status(409).json({ error: 'İstek artık açık değil' });

  const elapsedMin = (Date.now() - new Date(r.last_notified_at)) / 60000;
  if (elapsedMin < NOTIFY_COOLDOWN_MIN) {
    return res.status(429).json({
      error: 'Çok sık bildirim gönderilemez',
      retry_in_seconds: Math.ceil((NOTIFY_COOLDOWN_MIN - elapsedMin) * 60),
    });
  }

  await query('UPDATE requests SET last_notified_at = now() WHERE id = $1', [r.id]);
  notifyNearby(r.id, r.lat, r.lng,
    r.tur === 'hizmet' ? RADIUS_HIZMET : RADIUS_ESYA).catch(console.error);
  res.json({ ok: true });
});

// Teklif ver — anlaşma OLUŞMAZ, istek sahibi seçene kadar beklenir
router.post('/:id/respond', requireAuth, requireVerified, async (req, res) => {
  const { stock_confirmed } = req.body;
  if (!stock_confirmed)
    return res.status(400).json({ error: 'Ürünün elinde olduğunu onaylamalısın' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT id, requester_id, status, blocked_user_ids FROM requests WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    const request = rows[0];
    if (!request) throw { code: 404, message: 'İstek bulunamadı' };
    if (request.requester_id === req.user.id)
      throw { code: 400, message: 'Kendi isteğine teklif veremezsin' };
    if (request.status !== 'open')
      throw { code: 409, message: 'Bu istek artık açık değil' };
    if ((request.blocked_user_ids || []).includes(req.user.id))
      throw { code: 403, message: 'Bu isteğe tekrar teklif veremezsin' };

    const count = await client.query(
      "SELECT COUNT(*)::int AS n FROM responses WHERE request_id = $1 AND status = 'pending'",
      [request.id]
    );
    if (count.rows[0].n >= MAX_OFFERS)
      throw { code: 409, message: 'Bu istek için teklif kontenjanı doldu' };

    const offer = await client.query(
      `INSERT INTO responses (request_id, responder_id, stock_confirmed)
       VALUES ($1,$2,true)
       ON CONFLICT (request_id, responder_id)
       DO UPDATE SET status = 'pending', created_at = now()
       RETURNING id`,
      [request.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ response_id: offer.rows[0].id, status: 'pending' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(e.code || 500).json({ error: e.message || 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// Teklifimin durumu — seçildiysem deal_id döner
router.get('/:id/my-offer', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT resp.id, resp.status, r.status AS request_status,
            c.name AS category, c.tur, r.price, r.fiyat_tipi, r.is_urgent,
            d.id AS deal_id,
            (SELECT COUNT(*) FROM responses
              WHERE request_id = r.id AND status = 'pending')::int AS offer_count
       FROM responses resp
       JOIN requests r ON r.id = resp.request_id
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN deals d ON d.request_id = r.id AND d.responder_id = resp.responder_id
      WHERE resp.request_id = $1 AND resp.responder_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Teklif bulunamadı' });
  res.json({ ...rows[0], max_offers: MAX_OFFERS });
});

router.post('/:id/withdraw', requireAuth, async (req, res) => {
  const { rows } = await query(
    `UPDATE responses SET status = 'withdrawn'
      WHERE request_id = $1 AND responder_id = $2 AND status = 'pending'
      RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length)
    return res.status(409).json({ error: 'Geri çekilecek teklif yok' });
  res.json({ ok: true });
});

// Teklif seç — anlaşma burada oluşur, diğer teklifler kapanır
router.post('/:id/select', requireAuth, async (req, res) => {
  const { response_id } = req.body;
  if (!response_id) return res.status(400).json({ error: 'Teklif seçilmedi' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT id, requester_id, status FROM requests WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    const request = rows[0];
    if (!request) throw { code: 404, message: 'İstek bulunamadı' };
    if (request.requester_id !== req.user.id)
      throw { code: 403, message: 'Bu istek senin değil' };
    if (request.status !== 'open')
      throw { code: 409, message: 'İstek artık açık değil' };

    const offer = await client.query(
      "SELECT id, responder_id FROM responses WHERE id = $1 AND request_id = $2 AND status = 'pending'",
      [response_id, request.id]
    );
    if (!offer.rows.length)
      throw { code: 404, message: 'Teklif bulunamadı veya geri çekilmiş' };

    const responderId = offer.rows[0].responder_id;

    await client.query("UPDATE responses SET status = 'selected' WHERE id = $1", [
      response_id,
    ]);
    await client.query(
      `UPDATE responses SET status = 'rejected'
        WHERE request_id = $1 AND id <> $2 AND status = 'pending'`,
      [request.id, response_id]
    );

    const deal = await client.query(
      'INSERT INTO deals (request_id, responder_id) VALUES ($1,$2) RETURNING id',
      [request.id, responderId]
    );

    await client.query("UPDATE requests SET status = 'matched' WHERE id = $1", [
      request.id,
    ]);

    await client.query('COMMIT');
    res.status(201).json({ deal_id: deal.rows[0].id });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(e.code || 500).json({ error: e.message || 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const { rows } = await query(
    `UPDATE requests SET status = 'cancelled'
      WHERE id = $1 AND requester_id = $2 AND status = 'open'
      RETURNING id, status`,
    [req.params.id, req.user.id]
  );
  if (!rows.length)
    return res.status(409).json({ error: 'İstek iptal edilemez' });
  res.json(rows[0]);
});

// Tekrar yayınla — yeni istek olarak açılır, engelli liste devralınır
router.post('/:id/repost', requireAuth, requireVerified, async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.category_id, r.price, r.fiyat_tipi, r.is_urgent, r.status,
            r.blocked_user_ids, c.tur,
            ST_Y(r.exact_location::geometry) AS lat,
            ST_X(r.exact_location::geometry) AS lng
       FROM requests r JOIN categories c ON c.id = r.category_id
      WHERE r.id = $1 AND r.requester_id = $2`,
    [req.params.id, req.user.id]
  );
  const old = rows[0];
  if (!old) return res.status(404).json({ error: 'İstek bulunamadı' });
  if (!['cancelled', 'expired'].includes(old.status))
    return res.status(409).json({ error: 'Bu istek tekrar yayınlanamaz' });

  const active = await query(
    "SELECT id FROM requests WHERE requester_id = $1 AND status IN ('open','matched')",
    [req.user.id]
  );
  if (active.rows.length)
    return res.status(409).json({ error: 'Zaten açık bir isteğin var' });

  const blur = blurCoords(Number(old.lat), Number(old.lng));

  const { rows: created } = await query(
    `INSERT INTO requests
       (requester_id, category_id, price, fiyat_tipi, is_urgent,
        approx_location, exact_location,
        last_notified_at, blocked_user_ids, parent_request_id)
     VALUES ($1,$2,$3,$4,$5,
       ST_MakePoint($6,$7)::geography,
       ST_MakePoint($8,$9)::geography,
       now(), $10, $11)
     RETURNING id, price, fiyat_tipi, is_urgent, status, created_at`,
    [req.user.id, old.category_id, old.price, old.fiyat_tipi, old.is_urgent,
     blur.lng, blur.lat, old.lng, old.lat,
     old.blocked_user_ids || [], old.id]
  );

  notifyNearby(created[0].id, old.lat, old.lng,
    old.tur === 'hizmet' ? RADIUS_HIZMET : RADIUS_ESYA).catch(console.error);
  res.status(201).json(created[0]);
});

export default router;
