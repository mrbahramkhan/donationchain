/**
 * SMS alert service — MOCK by default.
 * Set SMS_PROVIDER=console|twilio and env credentials for real sends.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DONATIONCHAIN_DATA_DIR
  ? path.resolve(process.env.DONATIONCHAIN_DATA_DIR)
  : path.join(__dirname, '../../data');
const LOG_FILE = path.join(DATA_DIR, 'sms-log.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLog() {
  ensureDir();
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLog(entries) {
  ensureDir();
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries.slice(0, 500), null, 2));
}

function normalizePkPhone(phone) {
  let s = String(phone || '').replace(/[\s\-()]/g, '');
  if (/^03\d{9}$/.test(s)) s = '+92' + s.slice(1);
  if (/^3\d{9}$/.test(s)) s = '+92' + s;
  if (/^92\d{10}$/.test(s)) s = '+' + s;
  return s;
}

function templates() {
  return {
    application_received: (p) =>
      `DonationChain: Aapki application ${p.id} receive ho gayi. Status: review mein. Shukriya.`,
    application_approved: (p) =>
      `DonationChain: Application ${p.id} APPROVED. Case jald live hoga. Allah madad kare.`,
    application_rejected: (p) =>
      `DonationChain: Application ${p.id} is waqt approve nahi hui. Support se rabta karein.`,
    donation_received_donor: (p) =>
      `DonationChain: Aapka gift PKR ${p.amount} receive. Receipt ${p.receiptId}. Shukriya!`,
    donation_received_case: (p) =>
      `DonationChain: Aapke case "${p.caseTitle}" par PKR ${p.amount} donate hua. Receipt ${p.receiptId}.`,
    proof_ready: (p) =>
      `DonationChain: Case ${p.caseTitle || p.id} ka proof ready hai. Impact dashboard check karein.`,
    generic: (p) => p.message || 'DonationChain notification',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(res, data) {
  if (!res) return false;
  if (res.status === 429) return true;
  const code = data && (data.code || data.error_code);
  return Number(code) === 20429;
}

function retryAfterMs(res, data, attempt) {
  // Honor Retry-After header (seconds) when present
  const h = res && res.headers && typeof res.headers.get === 'function'
    ? res.headers.get('retry-after')
    : null;
  if (h) {
    const sec = Number(h);
    if (Number.isFinite(sec) && sec >= 0) return Math.min(sec * 1000, 60000);
  }
  // Exponential backoff: 1s, 2s, 4s… + jitter, cap 30s
  const base = Math.min(1000 * Math.pow(2, attempt), 30000);
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

/**
 * Twilio send with retries on 20429 / HTTP 429.
 * Env: SMS_MAX_RETRIES (default 4), SMS_RETRY_ON_429=true
 */
async function sendViaTwilioOnce(to, body, sid, token, from) {
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function sendViaProvider(to, body) {
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
  if (provider === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) {
      return { ok: false, mock: true, error: 'Twilio env not configured' };
    }

    const maxRetries = Math.max(0, Number(process.env.SMS_MAX_RETRIES || 4));
    let attempt = 0;
    let last = null;

    while (attempt <= maxRetries) {
      try {
        const { res, data } = await sendViaTwilioOnce(to, body, sid, token, from);
        last = { res, data };

        if (res.ok) {
          return {
            ok: true,
            provider: 'twilio',
            sid: data.sid,
            attempts: attempt + 1,
          };
        }

        if (isRateLimited(res, data) && attempt < maxRetries) {
          const wait = retryAfterMs(res, data, attempt);
          console.warn(
            `[SMS] Twilio 20429/429 rate limited — retry ${attempt + 1}/${maxRetries} in ${wait}ms`
          );
          await sleep(wait);
          attempt += 1;
          continue;
        }

        return {
          ok: false,
          error: data.message || 'Twilio error',
          data,
          code: data.code || data.error_code || res.status,
          attempts: attempt + 1,
        };
      } catch (err) {
        // Network blip: retry a few times
        if (attempt < maxRetries) {
          const wait = retryAfterMs(null, null, attempt);
          console.warn(`[SMS] network error — retry in ${wait}ms:`, err.message);
          await sleep(wait);
          attempt += 1;
          continue;
        }
        return { ok: false, error: err.message || 'Network error', attempts: attempt + 1 };
      }
    }

    const data = (last && last.data) || {};
    return {
      ok: false,
      error: data.message || 'Twilio rate limit exceeded after retries',
      data,
      code: 20429,
      attempts: attempt,
    };
  }
  // mock / console
  console.log('[SMS MOCK]', to, body);
  return { ok: true, mock: true, provider: 'mock' };
}

async function sendSms({ to, template, params, body }) {
  const phone = normalizePkPhone(to);
  if (!/^\+92\d{10}$/.test(phone)) {
    return { ok: false, error: 'Invalid PK phone number' };
  }
  const tpls = templates();
  const text =
    body ||
    (template && tpls[template] ? tpls[template](params || {}) : tpls.generic(params || {}));

  const result = await sendViaProvider(phone, text);
  const entry = {
    id: 'SMS-' + Date.now().toString(36).toUpperCase(),
    to: phone,
    template: template || 'custom',
    body: text,
    ok: !!result.ok,
    mock: !!result.mock,
    provider: result.provider || process.env.SMS_PROVIDER || 'mock',
    error: result.error || null,
    code: result.code || null,
    attempts: result.attempts || 1,
    at: new Date().toISOString(),
    meta: params || {},
  };
  const log = loadLog();
  log.unshift(entry);
  saveLog(log);
  return { ...result, entry };
}

/** Notify both sides when donation happens */
async function notifyDonation({ donorPhone, beneficiaryPhone, amount, receiptId, caseTitle }) {
  const out = [];
  if (donorPhone) {
    out.push(
      await sendSms({
        to: donorPhone,
        template: 'donation_received_donor',
        params: { amount, receiptId, caseTitle },
      })
    );
  }
  if (beneficiaryPhone) {
    out.push(
      await sendSms({
        to: beneficiaryPhone,
        template: 'donation_received_case',
        params: { amount, receiptId, caseTitle },
      })
    );
  }
  return out;
}

module.exports = {
  sendSms,
  notifyDonation,
  loadLog,
  normalizePkPhone,
  templates,
};
