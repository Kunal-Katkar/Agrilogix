// Small mail server for registration OTPs. Run with `npm run server` (or `npm run dev:full`).
// Endpoints (the Vite dev server proxies /api to this process):
//   POST /api/otp/send    { email, name? }   -> emails a 6-digit code
//   POST /api/otp/verify  { email, code }    -> { ok: true } when the code is right
// OTPs are kept in memory only (hashed), expire after 10 minutes and allow 5 wrong attempts.
// If SMTP_* variables are not set, the code is printed to this terminal instead of emailed (dev only).

import http from 'node:http';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.OTP_SERVER_PORT) || 5174;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

// email -> { hash, salt, expiresAt, attempts, sentAt }
const pending = new Map();

const hashCode = (code, salt) => crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const sweep = () => {
  const now = Date.now();
  for (const [k, v] of pending) if (v.expiresAt < now) pending.delete(k);
};
setInterval(sweep, 60 * 1000).unref();

const readJson = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (c) => {
    body += c;
    if (body.length > 10_000) { reject(new Error('Body too large')); req.destroy(); }
  });
  req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } });
  req.on('error', reject);
});

const send = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

async function handleSend(res, { email, name }) {
  const to = normEmail(email);
  if (!validEmail(to)) return send(res, 400, { ok: false, error: 'Enter a valid email address.' });

  const existing = pending.get(to);
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
    return send(res, 429, { ok: false, error: `Please wait ${wait}s before requesting another code.` });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const salt = crypto.randomBytes(8).toString('hex');
  const entry = { hash: hashCode(code, salt), salt, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, sentAt: Date.now() };

  if (!transporter) {
    pending.set(to, entry);
    console.log(`[otp] SMTP not configured. Code for ${to}: ${code}`);
    return send(res, 200, { ok: true, delivered: false, note: 'Email is not configured on the server; the code was printed in the server console.' });
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject: `${code} is your AgriLogiX verification code`,
      text: `Hi ${name || 'there'},\n\nYour AgriLogiX verification code is ${code}.\nIt expires in 10 minutes. If you did not try to create an account, ignore this email.\n`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px">
        <h2 style="color:#047857">AgriLogiX</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>Use this code to verify your email and finish creating your account:</p>
        <p style="font-size:30px;letter-spacing:8px;font-weight:bold;margin:16px 0">${code}</p>
        <p style="color:#555">It expires in 10 minutes. If you did not try to create an account, ignore this email.</p>
      </div>`,
    });
  } catch (err) {
    console.error('[otp] sendMail failed:', err.message);
    return send(res, 502, { ok: false, error: 'Could not send the verification email. Try again shortly.' });
  }
  pending.set(to, entry);
  return send(res, 200, { ok: true, delivered: true });
}

function handleVerify(res, { email, code }) {
  const to = normEmail(email);
  const entry = pending.get(to);
  if (!entry || entry.expiresAt < Date.now()) {
    pending.delete(to);
    return send(res, 400, { ok: false, error: 'This code has expired. Request a new one.' });
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    pending.delete(to);
    return send(res, 429, { ok: false, error: 'Too many wrong attempts. Request a new code.' });
  }
  entry.attempts += 1;
  const given = hashCode(String(code || '').trim(), entry.salt);
  const ok = given.length === entry.hash.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(entry.hash));
  if (!ok) return send(res, 400, { ok: false, error: 'Incorrect code. Check the email and try again.' });
  pending.delete(to);
  return send(res, 200, { ok: true });
}

http.createServer(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed.' });
  try {
    const body = await readJson(req);
    if (req.url === '/api/otp/send') return await handleSend(res, body);
    if (req.url === '/api/otp/verify') return handleVerify(res, body);
    return send(res, 404, { ok: false, error: 'Not found.' });
  } catch (err) {
    return send(res, 400, { ok: false, error: err.message });
  }
}).listen(PORT, () => {
  console.log(`[otp] listening on http://localhost:${PORT} (${smtpConfigured ? `SMTP via ${SMTP_HOST}` : 'SMTP NOT configured: codes will be printed here'})`);
});
