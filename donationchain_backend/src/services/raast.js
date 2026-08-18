/**
 * Raast (SBP instant payments) integration layer.
 *
 * Modes:
 * - sandbox (default): realistic async settlement simulation
 * - live: calls bank/aggregator HTTP API using env credentials
 *
 * Production wiring (typical Pakistan path):
 * 1. Participant bank or licensed PSP issues API key + merchant IBAN
 * 2. Set RAAST_MODE=live + RAAST_API_BASE + RAAST_API_KEY + RAAST_MERCHANT_IBAN
 * 3. Webhook URL: POST /api/payments/webhook/raast
 *
 * Docs reference shape aligns with common bank RTP / account-to-account APIs.
 */
const crypto = require('crypto');

const MODE = (process.env.RAAST_MODE || 'sandbox').toLowerCase();
const API_BASE = (process.env.RAAST_API_BASE || '').replace(/\/$/, '');
const API_KEY = process.env.RAAST_API_KEY || '';
const MERCHANT_IBAN = process.env.RAAST_MERCHANT_IBAN || 'PK00DEMO0000000000000000';
const MERCHANT_NAME = process.env.RAAST_MERCHANT_NAME || 'DonationChain';
const WEBHOOK_SECRET = process.env.RAAST_WEBHOOK_SECRET || 'dc-raast-webhook-dev';
const SETTLE_MS = Number(process.env.RAAST_SANDBOX_SETTLE_MS) || 2500;

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function isLive() {
  return MODE === 'live' && API_BASE && API_KEY;
}

/**
 * Initiate Raast credit transfer / RTP collection toward institutional IBAN.
 * @param {object} opts
 * @param {number} opts.amountPkr
 * @param {string} opts.beneficiaryIban - vendor/hospital/utility IBAN only
 * @param {string} opts.beneficiaryName
 * @param {string} [opts.customerReference]
 * @param {string} [opts.narration]
 * @param {string} [opts.idempotencyKey]
 */
async function initiateTransfer(opts) {
  const amount = Math.round(Number(opts.amountPkr) || 0);
  if (amount < 1) {
    const err = new Error('Invalid amount');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }
  const beneficiaryIban = String(opts.beneficiaryIban || '').replace(/\s/g, '').toUpperCase();
  if (!/^PK\d{2}[A-Z0-9]{11,24}$/i.test(beneficiaryIban) && MODE === 'live') {
    const err = new Error('Invalid beneficiary IBAN');
    err.code = 'INVALID_IBAN';
    throw err;
  }

  const paymentId = uid('RAAST');
  const idempotencyKey = opts.idempotencyKey || paymentId;
  const payload = {
    amount,
    currency: 'PKR',
    debtor: {
      // Payer side — in live mode bank collects from donor app / account linking
      type: 'CUSTOMER_COLLECTION',
    },
    creditor: {
      iban: beneficiaryIban || MERCHANT_IBAN,
      name: opts.beneficiaryName || MERCHANT_NAME,
    },
    customerReference: opts.customerReference || paymentId,
    narration: (opts.narration || 'DonationChain disbursement').slice(0, 140),
    idempotencyKey,
  };

  if (isLive()) {
    const res = await fetch(`${API_BASE}/v1/payments/raast/credit-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'Idempotency-Key': idempotencyKey,
        'X-Merchant-Id': process.env.RAAST_MERCHANT_ID || 'donationchain',
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.message || body.error || `Raast API ${res.status}`);
      err.code = body.code || 'RAAST_API_ERROR';
      err.status = res.status;
      err.details = body;
      throw err;
    }
    return {
      provider: 'raast',
      mode: 'live',
      paymentId: body.paymentId || body.id || paymentId,
      providerRef: body.transactionId || body.rrn || body.endToEndId || null,
      status: mapLiveStatus(body.status),
      amount,
      currency: 'PKR',
      creditorIban: payload.creditor.iban,
      creditorName: payload.creditor.name,
      raw: body,
      createdAt: new Date().toISOString(),
    };
  }

  // Sandbox: pending → processing → settled (async)
  return {
    provider: 'raast',
    mode: 'sandbox',
    paymentId,
    providerRef: 'SBX-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    status: 'pending',
    amount,
    currency: 'PKR',
    creditorIban: payload.creditor.iban,
    creditorName: payload.creditor.name,
    customerReference: payload.customerReference,
    narration: payload.narration,
    createdAt: new Date().toISOString(),
    settleAfterMs: SETTLE_MS,
  };
}

function mapLiveStatus(s) {
  const v = String(s || '').toLowerCase();
  if (['success', 'completed', 'settled', 'accepted', 'acsc'].includes(v)) return 'settled';
  if (['failed', 'rejected', 'rjct', 'cancelled'].includes(v)) return 'failed';
  if (['processing', 'pending', 'pdng', 'actc'].includes(v)) return 'processing';
  return 'pending';
}

/**
 * Poll provider for status (live) or return null to use local store (sandbox).
 */
async function fetchRemoteStatus(providerRef) {
  if (!isLive() || !providerRef) return null;
  const res = await fetch(`${API_BASE}/v1/payments/${encodeURIComponent(providerRef)}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'X-Merchant-Id': process.env.RAAST_MERCHANT_ID || 'donationchain',
    },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return {
    status: mapLiveStatus(body.status),
    providerRef: body.transactionId || body.rrn || providerRef,
    raw: body,
  };
}

/**
 * Verify Raast/PSP webhook HMAC-SHA256.
 *
 * Supported header formats:
 * - raw hex digest
 * - "sha256=<hex>"
 * - Stripe-style "t=<unix>,v1=<hex>" (signed payload = `${t}.${rawBody}`)
 *
 * Live mode: signature required. Sandbox: optional (unsigned allowed).
 * Replay: if timestamp present, reject if |now - t| > RAAST_WEBHOOK_TOLERANCE_SEC (default 300).
 */
function verifyWebhookSignature(rawBody, signatureHeader, opts) {
  const o = opts || {};
  const secret = o.secret || WEBHOOK_SECRET;
  const toleranceSec = Number(o.toleranceSec ?? process.env.RAAST_WEBHOOK_TOLERANCE_SEC) || 300;
  const requireSig = o.requireSignature != null ? o.requireSignature : isLive();

  const header = signatureHeader != null ? String(signatureHeader).trim() : '';
  if (!header) {
    return { ok: !requireSig, reason: requireSig ? 'missing_signature' : 'sandbox_unsigned' };
  }

  const payload =
    Buffer.isBuffer(rawBody)
      ? rawBody
      : typeof rawBody === 'string'
        ? Buffer.from(rawBody, 'utf8')
        : Buffer.from(JSON.stringify(rawBody), 'utf8');

  let timestamp = null;
  let providedHex = header;

  if (/^sha256=/i.test(header)) {
    providedHex = header.replace(/^sha256=/i, '').trim();
  } else if (header.includes('t=') && header.includes('v1=')) {
    const parts = header.split(',').map((p) => p.trim());
    for (const p of parts) {
      if (p.startsWith('t=')) timestamp = p.slice(2);
      if (p.startsWith('v1=')) providedHex = p.slice(3);
    }
  }

  providedHex = providedHex.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{32,128}$/.test(providedHex)) {
    return { ok: false, reason: 'malformed_signature' };
  }

  if (timestamp != null) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return { ok: false, reason: 'invalid_timestamp' };
    const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (age > toleranceSec) return { ok: false, reason: 'timestamp_expired', age };
  }

  const signedPayload =
    timestamp != null
      ? Buffer.concat([Buffer.from(String(timestamp) + '.', 'utf8'), payload])
      : payload;

  const expectedHex = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  try {
    const a = Buffer.from(expectedHex, 'utf8');
    const b = Buffer.from(providedHex, 'utf8');
    if (a.length !== b.length) return { ok: false, reason: 'length_mismatch' };
    const match = crypto.timingSafeEqual(a, b);
    return match ? { ok: true, reason: 'valid' } : { ok: false, reason: 'mismatch' };
  } catch {
    return { ok: false, reason: 'compare_error' };
  }
}

/** Sign a body the same way we verify (for tests / sandbox simulator). */
function signWebhookPayload(rawBody, secret, timestamp) {
  const s = secret || WEBHOOK_SECRET;
  const payload =
    Buffer.isBuffer(rawBody)
      ? rawBody
      : typeof rawBody === 'string'
        ? Buffer.from(rawBody, 'utf8')
        : Buffer.from(JSON.stringify(rawBody), 'utf8');
  if (timestamp != null) {
    const signed = Buffer.concat([Buffer.from(String(timestamp) + '.', 'utf8'), payload]);
    const hex = crypto.createHmac('sha256', s).update(signed).digest('hex');
    return `t=${timestamp},v1=${hex}`;
  }
  const hex = crypto.createHmac('sha256', s).update(payload).digest('hex');
  return `sha256=${hex}`;
}

function configPublic() {
  return {
    provider: 'raast',
    mode: isLive() ? 'live' : 'sandbox',
    currency: 'PKR',
    merchantName: MERCHANT_NAME,
    settleMsHint: isLive() ? null : SETTLE_MS,
    supportsRealtimeStatus: true,
    supportsWebhook: true,
  };
}

module.exports = {
  initiateTransfer,
  fetchRemoteStatus,
  verifyWebhookSignature,
  signWebhookPayload,
  configPublic,
  isLive,
  mapLiveStatus,
  MERCHANT_IBAN,
  SETTLE_MS,
  WEBHOOK_SECRET,
};
