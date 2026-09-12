import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3000';

let cachedToken = null;

export async function setToken(token) {
  cachedToken = token;
  await AsyncStorage.setItem('token', token);
}

export async function getToken() {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem('token');
  return cachedToken;
}

export async function clearToken() {
  cachedToken = null;
  await AsyncStorage.removeItem('token');
}

async function request(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || 'Bir şeyler ters gitti');
    Object.assign(err, data || {});
    err.status = res.status;
    throw err;
  }
  return data;
}

// Fotoğraflar korumalı; Image bileşenine hem adres hem başlık gerekiyor.
export async function fotografKaynagi(dealId, photoId) {
  const token = await getToken();
  return {
    uri: `${BASE}/api/deals/${dealId}/photo/${photoId}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

export const api = {
  register: (b) => request('/users/register', { method: 'POST', body: b }),
  login: (b) => request('/users/login', { method: 'POST', body: b }),
  me: () => request('/users/me'),
  resendVerification: () =>
    request('/users/resend-verification', { method: 'POST' }),
  registerDevice: (b) => request('/users/device', { method: 'POST', body: b }),

  categories: () => request('/requests/categories'),
  nearby: ({ lat, lng, min, max, category }) => {
    const q = new URLSearchParams({ lat, lng, min, max });
    if (category) q.set('category', category);
    return request(`/requests?${q}`);
  },
  createRequest: (b) => request('/requests', { method: 'POST', body: b }),
  myRequest: (id) => request(`/requests/${id}/mine`),
  cancelRequest: (id) => request(`/requests/${id}/cancel`, { method: 'POST' }),
  renotify: (id) => request(`/requests/${id}/renotify`, { method: 'POST' }),
  respond: (id) =>
    request(`/requests/${id}/respond`, {
      method: 'POST',
      body: { stock_confirmed: true },
    }),
  myOffer: (id) => request(`/requests/${id}/my-offer`),
  withdrawOffer: (id) => request(`/requests/${id}/withdraw`, { method: 'POST' }),
  selectOffer: (id, response_id) =>
    request(`/requests/${id}/select`, { method: 'POST', body: { response_id } }),
  repost: (id) => request(`/requests/${id}/repost`, { method: 'POST' }),

  deal: (id) => request(`/deals/${id}`),
  replies: (id) => request(`/deals/${id}/replies`),
  priceOk: (id) => request(`/deals/${id}/price-ok`, { method: 'POST' }),
  sendPhoto: (id, base64) =>
    request(`/deals/${id}/photo`, { method: 'POST', body: { base64 } }),
  confirmPhoto: (id) =>
    request(`/deals/${id}/confirm-photo`, { method: 'POST' }),
  slots: (id) => request(`/deals/${id}/slots`),
  proposeAppointment: (id, tarih, slot) =>
    request(`/deals/${id}/propose-appointment`, {
      method: 'POST', body: { tarih, slot },
    }),
  confirmAppointment: (id) =>
    request(`/deals/${id}/confirm-appointment`, { method: 'POST' }),
  proposeDuration: (id, minutes) =>
    request(`/deals/${id}/propose-duration`, {
      method: 'POST',
      body: { minutes },
    }),
  uploadPhoto: (id, photo_url) =>
    request(`/deals/${id}/photo`, { method: 'POST', body: { photo_url } }),
  confirmPhoto: (id) =>
    request(`/deals/${id}/confirm-photo`, { method: 'POST' }),
  confirmDuration: (id) =>
    request(`/deals/${id}/confirm-duration`, { method: 'POST' }),
  extend: (id) => request(`/deals/${id}/extend`, { method: 'POST' }),
  sendReply: (id, canned_reply_id) =>
    request(`/deals/${id}/reply`, {
      method: 'POST',
      body: { canned_reply_id },
    }),
  shareLocation: (id, lat, lng) =>
    request(`/deals/${id}/share-location`, {
      method: 'POST',
      body: { lat, lng },
    }),
  closeDeal: (id, outcome) =>
    request(`/deals/${id}/close`, { method: 'POST', body: { outcome } }),

  rate: (b) => request('/ratings', { method: 'POST', body: b }),
  report: (b) => request('/ratings/report', { method: 'POST', body: b }),
};
