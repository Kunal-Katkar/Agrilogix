// Client for the OTP mail server (server/index.mjs, proxied at /api by Vite).

const SERVER_DOWN = 'The verification mail server is not running. Stop the dev server and start it again with "npm run dev".';

async function post(path, body) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.ok === 'boolean') return data;
    // The Vite proxy answers with plain text (502/500) when the mail server is not running.
    if (res.status >= 500) return { ok: false, error: SERVER_DOWN };
    return { ok: false, error: 'Verification service returned an unexpected response.' };
  } catch {
    return { ok: false, error: SERVER_DOWN };
  }
}

export const sendOtp = (email, name) => post('/api/otp/send', { email, name });
export const verifyOtp = (email, code) => post('/api/otp/verify', { email, code });
