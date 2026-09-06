/**
 * Raast (SBP instant payments) integration layer — ISO 20022 aligned.
 *
 * Modes:
 * - sandbox: async settlement simulation + full pain.001 field map
 * - live: bank/PSP HTTP API with ISO 20022 identifiers (EndToEndId, UETR, …)
 *
 * Production wiring:
 * 1. Participant bank or licensed PSP issues API key + merchant IBAN
 * 2. RAAST_MODE=live + RAAST_API_BASE + RAAST_API_KEY + RAAST_MERCHANT_IBAN
 * 3. Webhook: POST /api/payments/webhook/raast (HMAC on raw body)
 *
 * Message mapping: see services/iso20022.js (pain.001 initiation → gateway JSON).
 */
const crypto = require('crypto');
const iso20022 = require('./iso20022');

const MODE = (process.env.RAAST_MODE || (process.env.NODE_ENV === 'production' ? 'live' : 'sandbox')).toLowerCase();
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
  const beneficiaryIban = iso20022.normalizeIban(opts.beneficiaryIban || MERCHANT_IBAN);
  if (MODE === 'live' && !iso20022.isValidPkIban(beneficiaryIban)) {
    const err = new Error('Invalid beneficiary IBAN');
    err.code = 'INVALID_IBAN';
    throw err;
  }

  const paymentId = uid('RAAST');
  const idempotencyKey = opts.idempotencyKey || paymentId;

  // ISO 20022 pain.001 mapping (EndToEndId + UETR stable for the chain)
  const painBundle = iso20022.buildPain001CreditTransfer({
    amountPkr: amount,
    beneficiaryIban,
    beneficiaryName: opts.beneficiaryName || MERCHANT_NAME,
    debtorName: opts.debtorName,
    debtorIban: opts.debtorIban,
    endToEndId: opts.endToEndId || opts.customerReference || paymentId,
    uetr: opts.uetr,
    customerReference: opts.customerReference || paymentId,
    narration: opts.narration || 'DonationChain institutional disbursement',
    caseId: opts.caseId,
    purposeCode: opts.purposeCode,
    initiatingParty: MERCHANT_NAME,
  });

  const payload = iso20022.toGatewayCreditTransferBody(painBundle, {
    idempotencyKey,
    customerReference: painBundle.identifiers.endToEndId,
    narration: (opts.narration || 'DonationChain disbursement').slice(0, 140),
    platformPaymentId: paymentId,
  });

  if (isLive()) {
    const res = await fetch(`${API_BASE}/v1/payments/raast/credit-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'Idempotency-Key': idempotencyKey,
        'X-Merchant-Id': process.env.RAAST_MERCHANT_ID || 'donationchain',
        'X-ISO20022-Message-Type': 'pain.001.001.09',
        'X-End-To-End-Id': painBundle.identifiers.endToEndId,
        'X-UETR': painBundle.identifiers.uetr,
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
    const extracted = iso20022.extractIdsFromProviderBody(body);
    return {
      provider: 'raast',
      mode: 'live',
      paymentId: extracted.paymentId || paymentId,
      providerRef: extracted.providerRef || painBundle.identifiers.uetr,
      endToEndId: extracted.endToEndId || painBundle.identifiers.endToEndId,
      uetr: extracted.uetr || painBundle.identifiers.uetr,
      instrId: painBundle.identifiers.instrId,
      status: mapLiveStatus(extracted.isoTxStatus || body.status),
      amount,
      currency: 'PKR',
      creditorIban: beneficiaryIban,
      creditorName: opts.beneficiaryName || MERCHANT_NAME,
      iso20022: {
        messageType: 'pain.001.001.09',
        endToEndId: painBundle.identifiers.endToEndId,
        uetr: painBundle.identifiers.uetr,
        msgId: painBundle.identifiers.msgId,
      },
      raw: body,
      createdAt: new Date().toISOString(),
    };
  }

  // Sandbox: pending → processing → settled (async), ISO ids still assigned
  return {
    provider: 'raast',
    mode: 'sandbox',
    paymentId,
    providerRef: 'SBX-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    endToEndId: painBundle.identifiers.endToEndId,
    uetr: painBundle.identifiers.uetr,
    instrId: painBundle.identifiers.instrId,
    status: 'pending',
    amount,
    currency: 'PKR',
    creditorIban: beneficiaryIban,
    creditorName: opts.beneficiaryName || MERCHANT_NAME,
    customerReference: painBundle.identifiers.endToEndId,
    narration: payload.narration,
    iso20022: {
      messageType: 'pain.001.001.09',
      endToEndId: painBundle.identifiers.endToEndId,
      uetr: painBundle.identifiers.uetr,
      msgId: painBundle.identifiers.msgId,
      pmtInfId: painBundle.identifiers.pmtInfId,
    },
    createdAt: new Date().toISOString(),
    settleAfterMs: SETTLE_MS,
  };
}

function mapLiveStatus(s) {
  // Prefer ISO pacs.002 TxSts codes, then loose aliases
  return iso20022.mapIsoTransactionStatus(s);
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
    iso20022: {
      initiationMessage: 'pain.001.001.09',
      statusCodes: 'pacs.002 TxSts (ACSC/ACCC/RJCT/…)',
      localInstrument: iso20022.LOCAL_INSTRUMENT,
      serviceLevel: iso20022.SERVICE_LEVEL,
      identifiers: ['MsgId', 'PmtInfId', 'InstrId', 'EndToEndId', 'UETR'],
    },
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
  iso20022,
};
