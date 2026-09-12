import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// Ban eşikleri
const MIN_DEALS_BEFORE_ACTION = 5;
const LOW_RATING_THRESHOLD = 2.5;

// Puan ver — iki taraf da verene kadar (ya da 24 saat geçene kadar) gizli
router.post('/', requireAuth, async (req, res) => {
  const { deal_id, stars, tags = [], comment } = req.body;
  if (!deal_id || !stars || stars < 1 || stars > 5)
    return res.status(400).json({ error: 'Geçersiz puan' });

  const { rows } = await query(
    `SELECT d.id, d.status, d.responder_id, r.requester_id
       FROM deals d JOIN requests r ON r.id = d.request_id
      WHERE d.id = $1`,
    [deal_id]
  );
  const deal = rows[0];
  if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });
  if (deal.status !== 'completed')
    return res.status(409).json({ error: 'Anlaşma tamamlanmadı' });

  const isRequester = deal.requester_id === req.user.id;
  const isResponder = deal.responder_id === req.user.id;
  if (!isRequester && !isResponder)
    return res.status(403).json({ error: 'Bu anlaşmaya puan veremezsin' });

  const rateeId = isRequester ? deal.responder_id : deal.requester_id;

  await query(
    `INSERT INTO ratings (deal_id, rater_id, ratee_id, stars, tags, comment)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (deal_id, rater_id) DO NOTHING`,
    [deal.id, req.user.id, rateeId, stars, tags, comment || null]
  );

  // Karşı taraf da puan verdiyse ikisini birden görünür yap
  const both = await query(
    'SELECT COUNT(*)::int AS n FROM ratings WHERE deal_id = $1',
    [deal.id]
  );
  if (both.rows[0].n === 2) {
    await query(
      'UPDATE ratings SET visible_at = now() WHERE deal_id = $1 AND visible_at IS NULL',
      [deal.id]
    );
    await applyModeration(rateeId);
    await applyModeration(req.user.id);
  }

  res.status(201).json({ ok: true, visible: both.rows[0].n === 2 });
});

// Şikayet — reported_id verilmezse anlaşmadan karşı taraf bulunur
router.post('/report', requireAuth, async (req, res) => {
  const { deal_id, reason } = req.body;
  let { reported_id } = req.body;
  if (!reason) return res.status(400).json({ error: 'Sebep gerekli' });

  if (!reported_id) {
    if (!deal_id)
      return res.status(400).json({ error: 'Şikayet edilecek kişi belirsiz' });

    const { rows } = await query(
      `SELECT d.responder_id, r.requester_id
         FROM deals d JOIN requests r ON r.id = d.request_id
        WHERE d.id = $1`,
      [deal_id]
    );
    const deal = rows[0];
    if (!deal) return res.status(404).json({ error: 'Anlaşma bulunamadı' });

    if (deal.requester_id === req.user.id) reported_id = deal.responder_id;
    else if (deal.responder_id === req.user.id) reported_id = deal.requester_id;
    else return res.status(403).json({ error: 'Bu anlaşmaya erişimin yok' });
  }

  if (reported_id === req.user.id)
    return res.status(400).json({ error: 'Kendini şikayet edemezsin' });

  await query(
    `INSERT INTO reports (deal_id, reporter_id, reported_id, reason)
     VALUES ($1,$2,$3,$4)`,
    [deal_id || null, req.user.id, reported_id, reason]
  );
  res.status(201).json({ ok: true });
});

// Uyarı / ban — puan TEK BAŞINA yeterli değil, şikayet de gerekli.
// Böylece kötü niyetli iki düşük puanla kimse banlanamaz.
async function applyModeration(userId) {
  const { rows } = await query(
    `SELECT u.id, u.rating_avg, u.deal_count, u.warning_count, u.status,
            (SELECT COUNT(*) FROM reports
              WHERE reported_id = u.id AND status <> 'dismissed') AS report_count
       FROM users u WHERE u.id = $1`,
    [userId]
  );
  const u = rows[0];
  if (!u || u.status === 'banned') return;
  if (u.deal_count < MIN_DEALS_BEFORE_ACTION) return;
  if (Number(u.rating_avg) >= LOW_RATING_THRESHOLD) return;
  if (Number(u.report_count) === 0) return;

  if (u.warning_count === 0) {
    await query(
      `UPDATE users SET status = 'warned', warning_count = 1 WHERE id = $1`,
      [u.id]
    );
    await query(
      `INSERT INTO user_warnings (user_id, reason)
       VALUES ($1, 'Düşük puan ortalaması ve şikayet')`,
      [u.id]
    );
  } else {
    await query(`UPDATE users SET status = 'banned' WHERE id = $1`, [u.id]);
  }
}

export default router;
