import jwt from 'jsonwebtoken';
import { query } from './db.js';

const SECRET = process.env.JWT_SECRET || 'gelistirme-anahtari-degistir';

export const signToken = (userId) =>
  jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' });

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Giriş gerekli' });

  try {
    const { sub } = jwt.verify(token, SECRET);
    const { rows } = await query(
      'SELECT id, email, display_name, status, email_verified_at FROM users WHERE id = $1',
      [sub]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    if (rows[0].status === 'banned')
      return res.status(403).json({ error: 'Hesabın askıya alındı' });

    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Oturum geçersiz' });
  }
}

// Mail doğrulaması yapılmamış kullanıcı istek oluşturamaz / karşılık veremez
export function requireVerified(req, res, next) {
  if (!req.user.email_verified_at)
    return res.status(403).json({ error: 'Önce e-postanı doğrula' });
  next();
}
