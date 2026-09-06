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
const raastErrorCodes = require('./raastErrorCodes');

const MODE = (process.env.RAAST_MODE || (process.env.NODE_ENV === 'production' ? 'live' : 'sandbox')).toLowerCase();
const API_BASE = (process.env.RAAST_API_BASE || '').replace(/\/$/, '');
const API_KEY = process.env.RAAST_API_KEY || '';
const MERCHANT_IBAN = process.env.RAAST_MERCHANT_IBAN || 'PK00DEMO0000000000000000';
const MERCHANT_NAME = process.env.RAAST_MERCHANT_NAME || 'DonationChain';
const WEBHOOK_SECRET = process.env.RAAST_WEBHOOK_SECRET || 'dc-raast-webhook-dev';
const SETTLE_MS = Number(process.env.RAAST_SANDBOX_SETTLE_MS) || 2500;
/** Live API retries — same UETR + EndToEndId + Idempotency-Key on every attempt */
const RETRY_MAX = Math.max(1, Number(process.env.RAAST_RETRY_MAX) || 3);
const RETRY_BASE_MS = Number(process.env.RAAST_RETRY_BASE_MS) || 400;
const RETRY_MAX_MS = Number(process.env.RAAST_RETRY_MAX_MS) || 4000;

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

const NON_RETRYABLE = new Set([
  'INVALID_AMOUNT',
  'INVALID_IBAN',
  'INVALID_UETR',
  'INVALID_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'DUPLICATE_REJECTED',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  if (!err) return false;
  if (err.code && NON_RETRYABLE.has(String(err.code))) return false;
  const status = Number(err.status) || 0;
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 422) {
    return false;
  }
  // 408, 429, 5xx, network
  if (status === 408 || status === 429 || status >= 500) return true;
  if (err.code === 'RAAST_NETWORK' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    return true;
  }
  if (status === 0 || !status) return true;
  return status >= 500;
}

function backoffMs(attempt) {
  // attempt 0-based: 400, 800, 1600… + jitter, capped
  const exp = RETRY_BASE_MS * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * Math.min(200, RETRY_BASE_MS));
  return Math.min(RETRY_MAX_MS, exp + jitter);
}

/**
 * Retry live gateway call while keeping UETR + EndToEndId + Idempotency-Key fixed.
 * MsgId / InstrId are regenerated per attempt (new ISO message, same payment identity).
 */
async function withUetrRetry(runAttempt, meta) {
  const attempts = [];
  let lastErr = null;
  for (let i = 0; i < RETRY_MAX; i++) {
    try {
      const result = await runAttempt(i);
      if (i > 0) {
        result.retry = {
          attempts: i + 1,
          uetr: meta.uetr,
          endToEndId: meta.endToEndId,
          recovered: true,
        };
      }
      return result;
    } catch (err) {
      lastErr = err;
      attempts.push({
        attempt: i + 1,
        code: err.code || null,
        status: err.status || null,
        message: err.message,
      });
      if (i >= RETRY_MAX - 1 || !isRetryableError(err)) {
        err.retries = attempts;
        err.uetr = meta.uetr;
        err.endToEndId = meta.endToEndId;
        throw err;
      }
      const wait = backoffMs(i);
      console.warn(
        `[Raast] retry ${i + 1}/${RETRY_MAX} after ${wait}ms — UETR=${meta.uetr} code=${err.code || err.status}`
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

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

  // Freeze payment identity for all retries (ISO 20022 rule)
  const stableUetr = painBundle.identifiers.uetr;
  const stableE2E = painBundle.identifiers.endToEndId;

  if (isLive()) {
    return withUetrRetry(async (attemptIndex) => {
      // New MsgId/InstrId per attempt; same UETR + EndToEndId + Idempotency-Key
      const attemptBundle =
        attemptIndex === 0
          ? painBundle
          : iso20022.buildPain001CreditTransfer({
              amountPkr: amount,
              beneficiaryIban,
              beneficiaryName: opts.beneficiaryName || MERCHANT_NAME,
              debtorName: opts.debtorName,
              debtorIban: opts.debtorIban,
              endToEndId: stableE2E,
              uetr: stableUetr,
              customerReference: opts.customerReference || paymentId,
              narration: opts.narration || 'DonationChain institutional disbursement',
              caseId: opts.caseId,
              purposeCode: opts.purposeCode,
              initiatingParty: MERCHANT_NAME,
            });
      const attemptPayload = iso20022.toGatewayCreditTransferBody(attemptBundle, {
        idempotencyKey,
        customerReference: stableE2E,
        narration: (opts.narration || 'DonationChain disbursement').slice(0, 140),
        platformPaymentId: paymentId,
        retryAttempt: attemptIndex + 1,
      });

      let res;
      try {
        res = await fetch(`${API_BASE}/v1/payments/raast/credit-transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
            'Idempotency-Key': idempotencyKey,
            'X-Merchant-Id': process.env.RAAST_MERCHANT_ID || 'donationchain',
            'X-ISO20022-Message-Type': 'pain.001.001.09',
            'X-End-To-End-Id': stableE2E,
            'X-UETR': stableUetr,
            'X-Retry-Attempt': String(attemptIndex + 1),
          },
          body: JSON.stringify(attemptPayload),
        });
      } catch (netErr) {
        const err = new Error(netErr.message || 'Raast network error');
        err.code = 'RAAST_NETWORK';
        err.status = 0;
        err.cause = netErr;
        throw err;
      }

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body.message || body.error || `Raast API ${res.status}`);
        err.code = body.code || 'RAAST_API_ERROR';
        err.status = res.status;
        err.details = body;
        throw err;
      }
      // Provider returned invalid UETR — do not retry with a different one; surface error
      const extracted = iso20022.extractIdsFromProviderBody(body);
      if (extracted.uetrInvalid) {
        const err = new Error('Provider returned invalid UETR');
        err.code = 'INVALID_UETR';
        err.status = 502;
        err.field = 'uetr';
        err.provided = extracted.uetrRaw;
        throw err;
      }
      // Prefer our stable ids if provider omits them
      const outUetr = extracted.uetr || stableUetr;
      if (extracted.uetr && extracted.uetr !== stableUetr) {
        console.warn(
          `[Raast] provider UETR differs from request (keeping request UETR for chain): req=${stableUetr} res=${extracted.uetr}`
        );
      }
      return {
        provider: 'raast',
        mode: 'live',
        paymentId: extracted.paymentId || paymentId,
        providerRef: extracted.providerRef || outUetr,
        endToEndId: extracted.endToEndId || stableE2E,
        uetr: stableUetr,
        instrId: attemptBundle.identifiers.instrId,
        status: mapLiveStatus(extracted.isoTxStatus || body.status),
        amount,
        currency: 'PKR',
        creditorIban: beneficiaryIban,
        creditorName: opts.beneficiaryName || MERCHANT_NAME,
        iso20022: {
          messageType: 'pain.001.001.09',
          endToEndId: stableE2E,
          uetr: stableUetr,
          msgId: attemptBundle.identifiers.msgId,
        },
        raw: body,
        createdAt: new Date().toISOString(),
        attempts: attemptIndex + 1,
      };
    }, { uetr: stableUetr, endToEndId: stableE2E });
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
    errorCatalog: {
      platform: Object.keys(raastErrorCodes.PLATFORM),
      isoTxStatus: Object.keys(raastErrorCodes.ISO_TX_STATUS),
    },
    retry: {
      max: RETRY_MAX,
      preserves: ['UETR', 'EndToEndId', 'Idempotency-Key'],
      regenerates: ['MsgId', 'InstrId'],
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
  isRetryableError,
  withUetrRetry,
  MERCHANT_IBAN,
  SETTLE_MS,
  WEBHOOK_SECRET,
  RETRY_MAX,
  iso20022,
  raastErrorCodes,
};
