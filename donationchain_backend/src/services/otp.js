/**
 * OTP service for phone auth — in-memory store + optional SMS.
 * Mock mode (default): code returned in API for demo/testing.
 */
const crypto = require('crypto');
const users = require('./users');

const STORE = new Map(); // phone -> { codeHash, exp, attempts, role }
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 10 * 60 * 1000);
const OTP_MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;

function hashCode(code, phone) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'donationchain-dev-secret-change-me')
    .update(String(code) + '|' + phone)
    .digest('hex');
}

function generateCode() {
  // cryptographically random 6-digit, not starting with 0
  const n = crypto.randomInt(100000, 999999);
  return String(n);
}

function requestOtp(phone, role) {
  if (!users.isValidPhone(phone)) {
    return { ok: false, error: 'Invalid phone number', status: 400 };
  }
  const p = users.normalizePhone(phone);
  const code = generateCode();
  const exp = Date.now() + OTP_TTL_MS;
  STORE.set(p, {
    codeHash: hashCode(code, p),
    exp,
    attempts: 0,
    role: role === 'seeker' || role === 'needy' ? 'seeker' : 'donor',
  });

  const mock = (process.env.SMS_PROVIDER || 'mock').toLowerCase() === 'mock';
  // Fire-and-forget SMS when not mock (best effort)
  if (!mock) {
    try {
      const sms = require('./sms');
      sms
        .sendSms({
          to: p,
          body: `DonationChain OTP: ${code}. Valid 10 min. Do not share.`,
        })
        .catch(() => {});
    } catch (_) {
      /* optional */
    }
  }

  const result = {
    ok: true,
    phone: p,
    expiresIn: Math.floor(OTP_TTL_MS / 1000),
    message: mock ? 'OTP generated (mock)' : 'OTP sent',
    mock,
  };
  // Only expose code in mock/dev — never in production with real SMS
  if (process.env.NODE_ENV !== 'production' && (mock || process.env.OTP_RETURN_CODE === 'true')) {
    result.code = code;
  }
  return result;
}

function verifyOtp(phone, code) {
  if (!users.isValidPhone(phone)) {
    return { ok: false, error: 'Invalid phone number', status: 400 };
  }
  const p = users.normalizePhone(phone);
  const entry = STORE.get(p);
  if (!entry) {
    return { ok: false, error: 'OTP not requested or expired', status: 400 };
  }
  if (Date.now() > entry.exp) {
    STORE.delete(p);
    return { ok: false, error: 'OTP expired', status: 400 };
  }
  entry.attempts += 1;
  if (entry.attempts > OTP_MAX_ATTEMPTS) {
    STORE.delete(p);
    return { ok: false, error: 'Too many attempts', status: 429 };
  }
  const expected = entry.codeHash;
  const got = hashCode(String(code || '').trim(), p);
  if (expected !== got) {
    STORE.set(p, entry);
    return { ok: false, error: 'Invalid OTP', status: 401 };
  }
  const role = entry.role || 'donor';
  STORE.delete(p);
  return { ok: true, phone: p, role };
}

module.exports = {
  requestOtp,
  verifyOtp,
  generateCode,
};
