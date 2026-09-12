import 'dotenv/config';

// Mail gönderimi — SMTP üzerinden. Gmail, Brevo, Mailjet, hepsi çalışır.
// SMTP_USER tanımlı değilse mail gönderilmez, link konsola yazılır.

import nodemailer from 'nodemailer';

const HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || USER;
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Komşuda';
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465,
      auth: { user: USER, pass: PASS },
    });
  }
  return transporter;
}

async function gonder({ to, subject, html }) {
  if (!USER || !PASS) {
    console.log(`[mail devre dışı] ${to} → ${subject}`);
    return { skipped: true };
  }

  return getTransporter().sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

function sablon(baslik, govde, buton) {
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F4F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F1;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:12px;border:1px solid #DCE3DE;">
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-size:22px;font-weight:700;color:#1F6F4A;">Komşuda</div>
        </td></tr>
        <tr><td style="padding:8px 28px 0;">
          <h1 style="margin:0 0 12px;font-size:19px;font-weight:600;color:#14231F;">${baslik}</h1>
          <div style="font-size:15px;line-height:1.6;color:#5F6F68;">${govde}</div>
        </td></tr>
        ${buton ? `<tr><td style="padding:24px 28px 4px;">
          <a href="${buton.url}" style="display:inline-block;background:#1F6F4A;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">${buton.metin}</a>
        </td></tr>
        <tr><td style="padding:14px 28px 0;">
          <div style="font-size:12px;color:#8C9A94;line-height:1.5;">Buton çalışmazsa bu adresi tarayıcına yapıştır:<br>
          <span style="color:#5F6F68;word-break:break-all;">${buton.url}</span></div>
        </td></tr>` : ''}
        <tr><td style="padding:24px 28px 28px;">
          <div style="border-top:1px solid #DCE3DE;padding-top:16px;font-size:12px;color:#8C9A94;line-height:1.6;">
            Bu maili sen istemediysen dikkate alma, hesap açılmaz.<br>
            Komşuda · Manisa
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function dogrulamaMaili(email, ad, token) {
  const url = `${PUBLIC_URL}/api/users/verify/${token}`;
  return gonder({
    to: email,
    subject: 'Komşuda — e-postanı doğrula',
    html: sablon(
      `Merhaba ${ad}`,
      'Hesabını kullanmaya başlamak için e-posta adresini doğrulaman gerekiyor. Link 24 saat geçerli.',
      { url, metin: 'E-postamı doğrula' }
    ),
  });
}

export async function sifreSifirlamaMaili(email, ad, token) {
  const url = `${PUBLIC_URL}/api/users/reset/${token}`;
  return gonder({
    to: email,
    subject: 'Komşuda — şifre sıfırlama',
    html: sablon(
      `Merhaba ${ad}`,
      'Şifreni sıfırlamak için aşağıdaki butona bas. Link 1 saat geçerli. Bu talebi sen yapmadıysan şifren değişmez.',
      { url, metin: 'Şifremi sıfırla' }
    ),
  });
}

export async function hesapKapatmaMaili(email, ad, sebep) {
  return gonder({
    to: email,
    subject: 'Komşuda — hesabın askıya alındı',
    html: sablon(
      `Merhaba ${ad}`,
      `Hesabın askıya alındı. Sebep: ${sebep}<br><br>
       Bu kararın hatalı olduğunu düşünüyorsan bu maile yanıt vererek itiraz edebilirsin. İtirazlar 15 gün içinde değerlendirilir.`
    ),
  });
}
