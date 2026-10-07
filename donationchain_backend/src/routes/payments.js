/**
 * Payments API — Raast + wallet/card gateways with real-time status.
 *
 * POST /api/payments/initiate
 * GET  /api/payments/:id
 * GET  /api/payments/:id/status   (poll-friendly)
 * GET  /api/payments/stream/:id   (SSE real-time)
 * POST /api/payments/webhook/raast
 * GET  /api/payments/config
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const store = require('../services/paymentsStore');
const raast = require('../services/raast');

const WALLET_SETTLE_MS = Number(process.env.WALLET_SANDBOX_SETTLE_MS) || 1800;

function publicPayment(p) {
  if (!p) return null;
  return {
    id: p.id,
    provider: p.provider,
    method: p.method,
    status: p.status,
    amount: p.amount,
    currency: p.currency || 'USD',
    providerRef: p.providerRef,
    mode: p.mode,
    purpose: p.purpose,
    caseId: p.caseId,
    caseTitle: p.caseTitle,
    vendorName: p.vendorName,
    beneficiaryIbanMasked: p.beneficiaryIban
      ? String(p.beneficiaryIban).slice(0, 6) + '****' + String(p.beneficiaryIban).slice(-4)
      : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt || p.createdAt,
    settledAt: p.settledAt || null,
    failureReason: p.failureReason || null,
    realtime: true,
    instrument: p.instrument || null,
    endToEndId: p.endToEndId || null,
    uetr: p.uetr || null,
  };
}


/** Never persist full card numbers / secrets — only masked instrument metadata */
function sanitizeInstrument(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type || '').toLowerCase();
  const out = { type };
  if (raw.last4) out.last4 = String(raw.last4).slice(-4);
  if (raw.brand) out.brand = String(raw.brand).slice(0, 32);
  if (raw.expMonth) out.expMonth = Number(raw.expMonth) || undefined;
  if (raw.expYear) out.expYear = Number(raw.expYear) || undefined;
  if (raw.nameOnCard) out.nameOnCard = String(raw.nameOnCard).slice(0, 80);
  if (raw.senderName) out.senderName = String(raw.senderName).slice(0, 80);
  if (raw.transferRef) out.transferRef = String(raw.transferRef).slice(0, 64);
  if (raw.msisdnLast4) out.msisdnLast4 = String(raw.msisdnLast4).slice(-4);
  if (raw.msisdnMasked) out.msisdnMasked = String(raw.msisdnMasked).slice(0, 32);
  // Explicitly drop dangerous fields if client sent them
  return out;
}

function scheduleSandboxSettle(paymentId, delayMs) {
  setTimeout(() => {
    const p = store.get(paymentId);
    if (!p || p.status === 'settled' || p.status === 'failed') return;
    store.update(paymentId, {
      status: 'processing',
    });
    setTimeout(() => {
      const cur = store.get(paymentId);
      if (!cur || cur.status === 'settled' || cur.status === 'failed') return;
      // ~4% sandbox failure for realism
      const fail = crypto.randomInt(0, 100) < 4;
      if (fail) {
        store.update(paymentId, {
          status: 'failed',
          failureReason: 'Sandbox simulated decline',
        });
      } else {
        store.update(paymentId, {
          status: 'settled',
          settledAt: new Date().toISOString(),
        });
      }
    }, Math.max(400, Math.floor(delayMs * 0.45)));
  }, Math.max(200, Math.floor(delayMs * 0.35)));
}

/** Institutional payout account — explicit IBAN preferred; else sandbox institutional account */
function resolveBeneficiaryIban(vendorName, explicitIban, country) {
  if (explicitIban) return String(explicitIban).replace(/\s/g, '').toUpperCase();
  const v = String(vendorName || '').toLowerCase();
  const cc = String(country || '').toUpperCase();
  // Pakistan utility / hospital demos (Raast-compatible sample IBANs)
  if (cc === 'PK' || /wapda|lesco|sngpl|ssgc|wasa|mayo|shifa|uet|beacon|power utility/.test(v)) {
    if (v.includes('wapda') || v.includes('lesco') || v.includes('power')) return 'PK36SCBL0000001122334455';
    if (v.includes('sngpl') || v.includes('gas')) return 'PK12HABB0000005566778899';
    if (v.includes('ssgc')) return 'PK90MEZN0000009988776655';
    if (v.includes('wasa') || v.includes('water')) return 'PK33UNIL0000001234500001';
    if (v.includes('mayo')) return 'PK45HABB0000001122330001';
    if (v.includes('shifa')) return 'PK67SCBL0000004455660002';
    if (v.includes('uet') || v.includes('beacon')) return 'PK11MEZN0000007788990003';
    return raast.MERCHANT_IBAN || 'PK00DONATIONCHAIN000000001';
  }
  // Global sandbox institutional account (not a real IBAN — live mode must pass beneficiaryIban)
  return process.env.DEFAULT_BENEFICIARY_IBAN || 'GB00DONATIONCHAININST001';
}

router.get('/config', (_req, res) => {
  res.json({
    ok: true,
    methods: {
      raast: { enabled: process.env.RAAST_ENABLED !== 'false', ...raast.configPublic() },
      jazzcash: {
        enabled: process.env.JAZZCASH_ENABLED !== 'false',
        mode: process.env.JAZZCASH_MERCHANT_ID ? 'live' : 'sandbox',
        label: 'JazzCash',
      },
      easypaisa: {
        enabled: process.env.EASYPAISA_ENABLED !== 'false',
        mode: process.env.EASYPAISA_STORE_ID ? 'live' : 'sandbox',
        label: 'EasyPaisa',
      },
      card: {
        enabled: process.env.CARD_ENABLED !== 'false',
        mode: process.env.STRIPE_SECRET_KEY ? 'live' : 'sandbox',
        label: 'Card',
        stripe: !!process.env.STRIPE_SECRET_KEY,
      },
      bank: {
        enabled: process.env.BANK_ENABLED !== 'false',
        mode: process.env.BANK_LIVE === 'true' ? 'live' : 'sandbox',
        label: 'Bank transfer',
      },
    },
    currencies: ['USD', 'EUR', 'GBP', 'PKR', 'SAR', 'AED', 'TRY', 'IDR', 'MYR', 'BDT', 'EGP', 'NGN', 'KES'],
    realtime: { polling: true, sse: true, webhook: true },
    institutionalOnly: true,
  });
});

router.get('/', (_req, res) => {
  res.json({ ok: true, payments: store.list(30).map(publicPayment) });
});

router.get('/errors', (_req, res) => {
  try {
    const catalog = require('../services/raastErrorCodes');
    res.json({
      ok: true,
      platform: catalog.PLATFORM,
      isoTxStatus: catalog.ISO_TX_STATUS,
      isoStatusReason: catalog.ISO_STATUS_REASON,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});



/**
 * body: {
 *   amount, method: raast|jazzcash|easypaisa|card|stripe,
 *   caseId?, caseTitle?, vendorName?, beneficiaryIban?,
 *   purpose?: donation|bill|zakat,
 *   billReference?, idempotencyKey?, anonymous?
 * }
 */
router.post('/initiate', async (req, res) => {
  try {
    const b = req.body || {};
    const amount = Math.round(Number(b.amount) || 0);
    let method = String(b.method || 'card').toLowerCase();
    if (method === 'stripe') method = 'card';
    if (method === 'local' || method === 'instant') method = 'raast';
    const allowed = new Set(['raast', 'jazzcash', 'easypaisa', 'card', 'bank']);
    if (!allowed.has(method)) {
      return res.status(400).json({ ok: false, error: 'Unsupported payment method: ' + method, code: 'INVALID_METHOD' });
    }
    const currency = String(b.currency || 'USD').toUpperCase().slice(0, 3);
    const country = String(b.country || '').toUpperCase().slice(0, 2);
    const minAmt = Number(process.env.PAYMENT_MIN_AMOUNT) || 1;
    // High ceiling for weak currencies (IDR, NGN, etc.); live gateways enforce their own caps
    const maxAmt = Number(process.env.PAYMENT_MAX_AMOUNT) || 500000000;
    if (!Number.isFinite(amount) || amount < minAmt) {
      return res.status(400).json({ ok: false, error: 'Amount below minimum (' + minAmt + ')', code: 'INVALID_AMOUNT' });
    }
    if (amount > maxAmt) {
      return res.status(400).json({ ok: false, error: 'Amount exceeds limit', code: 'AMOUNT_LIMIT' });
    }

    const idempotencyKey = b.idempotencyKey ? String(b.idempotencyKey) : null;
    if (idempotencyKey) {
      const existing = store.getByIdempotency(idempotencyKey);
      if (existing) return res.json({ ok: true, payment: publicPayment(existing), resumed: true });
    }

    const vendorName = b.vendorName || b.caseTitle || 'DonationChain Institutional';
    const beneficiaryIban = resolveBeneficiaryIban(vendorName, b.beneficiaryIban, country || b.country);
    const purpose = b.purpose || (b.billReference ? 'bill' : 'donation');
    const id = 'PAY_' + crypto.randomBytes(6).toString('hex').toUpperCase();

    let providerResult = null;
    let status = 'pending';
    let provider = method;
    let mode = 'sandbox';
    let providerRef = null;
    let settleMs = WALLET_SETTLE_MS;

    if (method === 'raast') {
      providerResult = await raast.initiateTransfer({
        amountPkr: amount,
        beneficiaryIban,
        beneficiaryName: vendorName,
        customerReference: b.billReference || b.caseId || id,
        narration: `${purpose} ${b.caseTitle || ''}`.trim(),
        idempotencyKey: idempotencyKey || id,
        caseId: b.caseId || null,
        purposeCode: purpose === 'bill' ? 'UTLT' : 'CHAR',
        endToEndId: b.endToEndId || null,
        uetr: b.uetr || null,
      });
      status = providerResult.status;
      mode = providerResult.mode;
      providerRef = providerResult.providerRef;
      provider = 'raast';
      settleMs = providerResult.settleAfterMs || raast.SETTLE_MS;
    } else {
      // JazzCash / EasyPaisa / Card / Bank — sandbox async settle; live via env credentials
      const liveConfigured =
        (method === 'jazzcash' && process.env.JAZZCASH_MERCHANT_ID) ||
        (method === 'easypaisa' && process.env.EASYPAISA_STORE_ID) ||
        (method === 'card' && process.env.STRIPE_SECRET_KEY) ||
        (method === 'bank' && process.env.BANK_LIVE === 'true');
      mode = liveConfigured ? 'live' : 'sandbox';
      providerRef = method.toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      status = 'pending';
      if (mode === 'live') {
        const live = await initiateWalletLive(method, amount, id, currency);
        providerRef = live.providerRef || providerRef;
        status = live.status || 'processing';
      }
    }

    const payment = store.save({
      id,
      idempotencyKey,
      provider,
      method,
      status,
      amount,
      currency,
      country: country || null,
      mode,
      providerRef,
      endToEndId: providerResult && providerResult.endToEndId,
      uetr: providerResult && providerResult.uetr,
      instrId: providerResult && providerResult.instrId,
      purpose,
      caseId: b.caseId || null,
      caseTitle: b.caseTitle || null,
      vendorName,
      beneficiaryIban,
      billReference: b.billReference || null,
      anonymous: !!b.anonymous,
      instrument: sanitizeInstrument(b.instrument),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: status === 'settled' ? new Date().toISOString() : null,
      providerResult,
      iso20022: providerResult && providerResult.iso20022,
    });

    // Sandbox always settles async; live only if PAYMENT_LIVE_AUTO_SETTLE (dev convenience)
    const shouldAutoSettle =
      status !== 'settled' &&
      status !== 'failed' &&
      (mode === 'sandbox' || process.env.PAYMENT_LIVE_AUTO_SETTLE === 'true');
    if (shouldAutoSettle) {
      scheduleSandboxSettle(id, settleMs);
    }

    res.status(201).json({
      ok: true,
      payment: publicPayment(payment),
      pollUrl: `/api/payments/${id}/status`,
      streamUrl: `/api/payments/stream/${id}`,
    });
  } catch (e) {
    const code = e.code || 'INIT_FAILED';
    let status = e.status && e.status < 500 ? e.status : 502;
    if (code === 'INVALID_UETR' || code === 'INVALID_IBAN' || code === 'INVALID_AMOUNT') {
      status = 400;
    }
    res.status(status).json({
      ok: false,
      error: e.message || 'Payment initiation failed',
      code,
      field: e.field || undefined,
    });
  }
});

async function initiateWalletLive(method, amount, orderId, currency) {
  // Extension points — returns { providerRef, status, checkoutUrl? }
  const cur = currency || 'USD';
  if (method === 'card' && process.env.STRIPE_SECRET_KEY) {
    // Production: create Stripe PaymentIntent / Checkout Session here
    return {
      providerRef: 'stripe_pi_' + orderId,
      status: 'processing',
      checkoutUrl: null,
      note: 'Stripe PaymentIntent placeholder — set webhook to /api/payments/webhook/stripe when wired',
    };
  }
  if (method === 'jazzcash' && process.env.JAZZCASH_MERCHANT_ID) {
    return {
      providerRef: 'jc_' + orderId,
      status: 'processing',
      checkoutUrl: process.env.JAZZCASH_CHECKOUT_URL || null,
    };
  }
  if (method === 'easypaisa' && process.env.EASYPAISA_STORE_ID) {
    return {
      providerRef: 'ep_' + orderId,
      status: 'processing',
      checkoutUrl: process.env.EASYPAISA_CHECKOUT_URL || null,
    };
  }
  if (method === 'bank') {
    return {
      providerRef: 'BANK_' + orderId,
      status: 'pending',
      note: 'Awaiting bank credit confirmation',
    };
  }
  return { providerRef: method + '_live_' + orderId, status: 'processing', currency: cur };
}

/** Server-Sent Events for real-time status (before /:id) */
router.get('/stream/:id', (req, res) => {
  const id = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const send = () => {
    const p = store.get(id);
    if (!p) {
      res.write(`data: ${JSON.stringify({ ok: false, error: 'not found' })}\n\n`);
      res.end();
      return true;
    }
    res.write(
      `data: ${JSON.stringify({
        ok: true,
        id: p.id,
        status: p.status,
        amount: p.amount,
        providerRef: p.providerRef,
        terminal: p.status === 'settled' || p.status === 'failed',
        settledAt: p.settledAt,
      })}\n\n`
    );
    return p.status === 'settled' || p.status === 'failed';
  };

  if (send()) return;
  const timer = setInterval(() => {
    if (send()) {
      clearInterval(timer);
      res.end();
    }
  }, 500);
  req.on('close', () => clearInterval(timer));
});

router.get('/:id/status', async (req, res) => {
  let p = store.get(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not found' });

  if (p.provider === 'raast' && p.mode === 'live' && p.providerRef) {
    try {
      const remote = await raast.fetchRemoteStatus(p.providerRef);
      if (remote && remote.status && remote.status !== p.status) {
        p =
          store.update(p.id, {
            status: remote.status,
            settledAt: remote.status === 'settled' ? new Date().toISOString() : p.settledAt,
          }) || p;
      }
    } catch (_) {}
  }

  res.json({
    ok: true,
    id: p.id,
    status: p.status,
    amount: p.amount,
    provider: p.provider,
    providerRef: p.providerRef,
    settledAt: p.settledAt,
    updatedAt: p.updatedAt,
    terminal: p.status === 'settled' || p.status === 'failed',
  });
});

router.get('/:id', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not found' });
  res.json({ ok: true, payment: publicPayment(p) });
});

router.post('/webhook/raast', (req, res) => {
  const sig =
    req.headers['x-raast-signature'] ||
    req.headers['x-signature'] ||
    req.headers['x-hub-signature-256'] ||
    '';
  // Prefer exact raw bytes used for HMAC; fall back to re-serialized JSON
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8');
  const verified = raast.verifyWebhookSignature(raw, sig);
  if (!verified.ok) {
    return res.status(401).json({
      ok: false,
      error: 'invalid signature',
      reason: verified.reason,
    });
  }
  const body = req.body || {};
  const extracted = raast.iso20022
    ? raast.iso20022.extractIdsFromProviderBody(body)
    : {};
  // Reject malformed UETR on webhook when the field is present
  if (extracted.uetrInvalid) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid UETR format',
      code: 'INVALID_UETR',
      field: 'uetr',
      provided: extracted.uetrRaw,
      expected: 'UUID 8-4-4-4-12 hex (RFC 4122)',
    });
  }
  const providerRef =
    extracted.providerRef ||
    body.transactionId ||
    body.rrn ||
    body.endToEndId ||
    body.providerRef;
  const paymentId = body.paymentId || body.merchantReference || body.customerReference || body.platformPaymentId;
  const endToEndId = extracted.endToEndId || body.endToEndId || body.EndToEndId;
  const uetr = extracted.uetr || null;
  let p = paymentId ? store.get(String(paymentId)) : null;
  if (!p && providerRef) {
    p = store.list(200).find((x) => x.providerRef === providerRef) || null;
  }
  if (!p && endToEndId) {
    p = store.list(200).find((x) => x.endToEndId === endToEndId) || null;
  }
  if (!p && uetr) {
    p = store.list(200).find((x) => x.uetr === uetr) || null;
  }
  if (!p) {
    return res.status(404).json({ ok: false, error: 'payment not found' });
  }
  const status = raast.mapLiveStatus(extracted.isoTxStatus || body.status || body.txSts || body.TxSts);
  store.update(p.id, {
    status,
    providerRef: providerRef || p.providerRef,
    endToEndId: endToEndId || p.endToEndId,
    uetr: uetr || p.uetr,
    settledAt: status === 'settled' ? new Date().toISOString() : p.settledAt,
    failureReason: status === 'failed' ? body.reason || body.message || 'Declined' : null,
    webhookAt: new Date().toISOString(),
    webhookVerified: true,
  });
  res.json({
    ok: true,
    id: p.id,
    status,
    endToEndId: endToEndId || p.endToEndId,
    uetr: uetr || p.uetr,
    signature: verified.reason,
  });
});

/** Sandbox helper: sign a sample payload (dev only) */
router.post('/webhook/raast/sign-test', (req, res) => {
  if (raast.isLive()) {
    return res.status(403).json({ ok: false, error: 'disabled in live mode' });
  }
  const body = req.body || { status: 'settled', paymentId: 'demo' };
  const raw = JSON.stringify(body);
  const ts = Math.floor(Date.now() / 1000);
  res.json({
    ok: true,
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-Raast-Signature': raast.signWebhookPayload(raw, null, ts),
      'X-Raast-Signature-Simple': raast.signWebhookPayload(raw),
    },
    note: 'POST the same body + X-Raast-Signature to /api/payments/webhook/raast',
  });
});

module.exports = router;
