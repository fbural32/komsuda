import { query } from './db.js';

// 3km içindeki, bildirime izin veren cihazlara push gönderir.
// Expo Push API kullanır — FCM anahtarı Expo tarafında tanımlı olmalı.
export async function notifyNearby(requestId, lat, lng, radiusM = 3000) {
  const { rows } = await query(
    `SELECT d.fcm_token, r.price, r.is_urgent, c.name AS category
       FROM devices d
       JOIN users u ON u.id = d.user_id
       JOIN requests r ON r.id = $1
       JOIN categories c ON c.id = r.category_id
      WHERE d.notifications_enabled
        AND u.status = 'active'
        AND u.id <> r.requester_id
        AND d.last_location IS NOT NULL
        AND d.location_updated_at > now() - interval '24 hours'
        AND ST_DWithin(d.last_location,
              ST_MakePoint($3::float8,$2::float8)::geography, $4::float8)
      LIMIT 500`,
    [requestId, lat, lng, radiusM]
  );

  if (!rows.length) return { sent: 0 };

  // Acil istekler ayrı bildirim kanalından gider — kendi sesi ve önceliği var
  const messages = rows.map((r) => ({
    to: r.fcm_token,
    title: r.is_urgent
      ? 'Acil: yakınında biri bekliyor'
      : 'Yakınında bir ihtiyaç var',
    body: `${r.category} · ${r.price}₺`,
    data: { request_id: requestId, is_urgent: !!r.is_urgent },
    sound: r.is_urgent ? 'zil_acil.wav' : 'zil.wav',
    priority: r.is_urgent ? 'high' : 'default',
    channelId: r.is_urgent ? 'acil-istekler' : 'istekler',
  }));

  // Expo tek istekte en fazla 100 mesaj kabul eder
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch (e) {
      console.error('Bildirim gönderilemedi:', e.message);
    }
  }

  return { sent: messages.length };
}
