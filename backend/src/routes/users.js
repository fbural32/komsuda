import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { dogrulamaMaili, sifreSifirlamaMaili } from '../mail.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, display_name } = req.body;
  if (!email || !password || !display_name)
    return res.status(400).json({ error: 'Eksik bilgi' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı' });

  const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length)
    return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1,$2,$3) RETURNING id, email, display_name`,
    [email, hash, display_name]
  );

  const token = await query(
    `INSERT INTO email_tokens (user_id, expires_at)
     VALUES ($1, now() + interval '24 hours') RETURNING token`,
    [rows[0].id]
  );

  try {
    await dogrulamaMaili(email, display_name, token.rows[0].token);
  } catch (e) {
    // Hesap açıldı ama mail gitmedi — kullanıcı tekrar isteyebilsin
    console.error('Doğrulama maili gönderilemedi:', e.message);
  }

  res.status(201).json({
    user: rows[0],
    token: signToken(rows[0].id),
    message: 'Doğrulama e-postası gönderildi',
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query(
    'SELECT id, password_hash, display_name, status FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
  if (user.status === 'banned')
    return res.status(403).json({ error: 'Hesabın askıya alındı' });

  res.json({
    user: { id: user.id, display_name: user.display_name },
    token: signToken(user.id),
  });
});

function sonucSayfasi(basarili, mesaj) {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Komşuda</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F2F4F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:360px;background:#fff;border:1px solid #DCE3DE;border-radius:14px;padding:32px 28px;text-align:center;">
    <div style="font-size:22px;font-weight:700;color:#1F6F4A;margin-bottom:18px;">Komşuda</div>
    <div style="width:52px;height:52px;border-radius:26px;margin:0 auto 16px;background:${basarili ? '#DFF0E6' : '#FCE9E0'};display:flex;align-items:center;justify-content:center;font-size:26px;color:${basarili ? '#1F6F4A' : '#E2571F'};">${basarili ? '&#10003;' : '!'}</div>
    <div style="font-size:16px;color:#14231F;line-height:1.6;">${mesaj}</div>
  </div>
</body></html>`;
}

router.get('/verify/:token', async (req, res) => {
  const { rows } = await query(
    `UPDATE email_tokens SET used_at = now()
      WHERE token = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [req.params.token]
  );
  if (!rows.length)
    return res
      .status(400)
      .send(sonucSayfasi(false, 'Link geçersiz veya süresi dolmuş. Uygulamadan yeni bir doğrulama maili isteyebilirsin.'));

  await query('UPDATE users SET email_verified_at = now() WHERE id = $1', [
    rows[0].user_id,
  ]);
  res.send(sonucSayfasi(true, 'E-postan doğrulandı. Uygulamaya dönüp kullanmaya başlayabilirsin.'));
});

// Doğrulama mailini tekrar gönder — 2 dakikada bir
router.post('/resend-verification', requireAuth, async (req, res) => {
  if (req.user.email_verified_at)
    return res.status(409).json({ error: 'E-postan zaten doğrulanmış' });

  const son = await query(
    `SELECT MAX(expires_at) - interval '24 hours' AS olusturma
       FROM email_tokens WHERE user_id = $1 AND used_at IS NULL`,
    [req.user.id]
  );
  const olusturma = son.rows[0]?.olusturma;
  if (olusturma && (Date.now() - new Date(olusturma)) < 120000) {
    return res.status(429).json({
      error: 'Az önce gönderdik. Birkaç dakika bekleyip tekrar dene.',
    });
  }

  await query(
    "UPDATE email_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
    [req.user.id]
  );
  const token = await query(
    `INSERT INTO email_tokens (user_id, expires_at)
     VALUES ($1, now() + interval '24 hours') RETURNING token`,
    [req.user.id]
  );

  try {
    await dogrulamaMaili(req.user.email, req.user.display_name, token.rows[0].token);
  } catch (e) {
    console.error('Mail gönderilemedi:', e.message);
    return res.status(502).json({ error: 'Mail gönderilemedi, sonra tekrar dene' });
  }
  res.json({ ok: true });
});

// Profil
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, display_name, photo_url, rating_avg, rating_count,
            deal_count, status, email_verified_at, photo_verified_at
       FROM users WHERE id = $1`,
    [req.user.id]
  );

  const recent = await query(
    `SELECT stars, tags, comment, created_at
       FROM ratings WHERE ratee_id = $1 AND visible_at IS NOT NULL
      ORDER BY created_at DESC LIMIT 5`,
    [req.user.id]
  );

  res.json({ ...rows[0], recent_ratings: recent.rows });
});

// Cihaz + konum kaydı (bildirim hedefleme için)
router.post('/device', requireAuth, async (req, res) => {
  const { fcm_token, lat, lng, notifications_enabled = true } = req.body;
  if (!fcm_token) return res.status(400).json({ error: 'Token gerekli' });

  await query(
    `INSERT INTO devices (user_id, fcm_token, notifications_enabled, last_location, location_updated_at)
     VALUES ($1,$2,$3,
       CASE WHEN $4::float IS NULL THEN NULL ELSE ST_MakePoint($5,$4)::geography END,
       CASE WHEN $4::float IS NULL THEN NULL ELSE now() END)
     ON CONFLICT (fcm_token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       notifications_enabled = EXCLUDED.notifications_enabled,
       last_location = COALESCE(EXCLUDED.last_location, devices.last_location),
       location_updated_at = COALESCE(EXCLUDED.location_updated_at, devices.location_updated_at),
       updated_at = now()`,
    [req.user.id, fcm_token, notifications_enabled, lat ?? null, lng ?? null]
  );
  res.json({ ok: true });
});

// Arka plandan gelen konum güncellemesi.
// Sadece bildirim hedeflemesi için tutulur, geçmiş kaydı yapılmaz.
router.post('/location', requireAuth, async (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null)
    return res.status(400).json({ error: 'Konum gerekli' });

  const { rowCount } = await query(
    `UPDATE devices
        SET last_location = ST_MakePoint($2,$3)::geography,
            location_updated_at = now(),
            updated_at = now()
      WHERE user_id = $1`,
    [req.user.id, lng, lat]
  );
  res.json({ ok: true, guncellenen: rowCount });
});

// KVKK — hesap silme
router.delete('/me', requireAuth, async (req, res) => {
  await query('DELETE FROM users WHERE id = $1', [req.user.id]);
  res.json({ ok: true });
});

export default router;
