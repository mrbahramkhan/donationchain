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
    currency: p.currency || 'PKR',
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
  };
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

/** Demo institutional IBANs by vendor keyword */
function resolveBeneficiaryIban(vendorName, explicitIban) {
  if (explicitIban) return String(explicitIban).replace(/\s/g, '').toUpperCase();
  const v = String(vendorName || '').toLowerCase();
  if (v.includes('wapda') || v.includes('lesco')) return 'PK36SCBL0000001122334455';
  if (v.includes('sngpl')) return 'PK12HABB0000005566778899';
  if (v.includes('ssgc')) return 'PK90MEZN0000009988776655';
  if (v.includes('wasa')) return 'PK33UNIL0000001234500001';
  if (v.includes('mayo')) return 'PK45HABB0000001122330001';
  if (v.includes('shifa')) return 'PK67SCBL0000004455660002';
  if (v.includes('uet') || v.includes('beacon')) return 'PK11MEZN0000007788990003';
  return raast.MERCHANT_IBAN;
}

router.get('/config', (_req, res) => {
  res.json({
    ok: true,
    methods: {
      raast: { enabled: true, ...raast.configPublic() },
      jazzcash: {
        enabled: process.env.JAZZCASH_ENABLED !== 'false',
        mode: process.env.JAZZCASH_MERCHANT_ID ? 'live' : 'sandbox',
      },
      easypaisa: {
        enabled: process.env.EASYPAISA_ENABLED !== 'false',
        mode: process.env.EASYPAISA_STORE_ID ? 'live' : 'sandbox',
      },
      card: {
        enabled: process.env.STRIPE_SECRET_KEY ? true : process.env.CARD_ENABLED !== 'false',
        mode: process.env.STRIPE_SECRET_KEY ? 'live' : 'sandbox',
      },
    },
    realtime: { polling: true, sse: true, webhook: true },
  });
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
    let method = String(b.method || 'raast').toLowerCase();
    if (method === 'stripe') method = 'card';
    if (amount < 100) {
      return res.status(400).json({ ok: false, error: 'Minimum amount PKR 100' });
    }
    if (amount > 2000000) {
      return res.status(400).json({ ok: false, error: 'Amount exceeds limit' });
    }

    const idempotencyKey = b.idempotencyKey ? String(b.idempotencyKey) : null;
    if (idempotencyKey) {
      const existing = store.getByIdempotency(idempotencyKey);
      if (existing) return res.json({ ok: true, payment: publicPayment(existing), resumed: true });
    }

    const vendorName = b.vendorName || b.caseTitle || 'DonationChain Institutional';
    const beneficiaryIban = resolveBeneficiaryIban(vendorName, b.beneficiaryIban);
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
      });
      status = providerResult.status;
      mode = providerResult.mode;
      providerRef = providerResult.providerRef;
      provider = 'raast';
      settleMs = providerResult.settleAfterMs || raast.SETTLE_MS;
    } else {
      // JazzCash / EasyPaisa / Card — sandbox async; live hooks via env
      mode =
        (method === 'jazzcash' && process.env.JAZZCASH_MERCHANT_ID) ||
        (method === 'easypaisa' && process.env.EASYPAISA_STORE_ID) ||
        (method === 'card' && process.env.STRIPE_SECRET_KEY)
          ? 'live'
          : 'sandbox';
      providerRef = method.toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      status = 'pending';
      if (mode === 'live') {
        // Placeholder: mark processing; production would redirect to hosted checkout
        status = 'processing';
        providerRef = await initiateWalletLive(method, amount, id);
      }
    }

    const payment = store.save({
      id,
      idempotencyKey,
      provider,
      method,
      status,
      amount,
      currency: 'PKR',
      mode,
      providerRef,
      purpose,
      caseId: b.caseId || null,
      caseTitle: b.caseTitle || null,
      vendorName,
      beneficiaryIban,
      billReference: b.billReference || null,
      anonymous: !!b.anonymous,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: status === 'settled' ? new Date().toISOString() : null,
      providerResult,
    });

    if (mode === 'sandbox' && status !== 'settled' && status !== 'failed') {
      scheduleSandboxSettle(id, settleMs);
    }

    res.status(201).json({
      ok: true,
      payment: publicPayment(payment),
      pollUrl: `/api/payments/${id}/status`,
      streamUrl: `/api/payments/stream/${id}`,
    });
  } catch (e) {
    res.status(e.status && e.status < 500 ? e.status : 502).json({
      ok: false,
      error: e.message || 'Payment initiation failed',
      code: e.code || 'INIT_FAILED',
    });
  }
});

async function initiateWalletLive(method, amount, orderId) {
  // Extension points for JazzCash Mobile Account / EasyPaisa MA / Stripe PaymentIntent
  if (method === 'card' && process.env.STRIPE_SECRET_KEY) {
    // Stripe PaymentIntent would be created here
    return 'stripe_pi_pending_' + orderId;
  }
  if (method === 'jazzcash' && process.env.JAZZCASH_MERCHANT_ID) {
    return 'jc_pending_' + orderId;
  }
  if (method === 'easypaisa' && process.env.EASYPAISA_STORE_ID) {
    return 'ep_pending_' + orderId;
  }
  return method + '_live_' + orderId;
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
  const providerRef = body.transactionId || body.rrn || body.endToEndId || body.providerRef;
  const paymentId = body.paymentId || body.merchantReference || body.customerReference;
  let p = paymentId ? store.get(String(paymentId)) : null;
  if (!p && providerRef) {
    p = store.list(200).find((x) => x.providerRef === providerRef) || null;
  }
  if (!p) {
    return res.status(404).json({ ok: false, error: 'payment not found' });
  }
  const status = raast.mapLiveStatus(body.status);
  store.update(p.id, {
    status,
    providerRef: providerRef || p.providerRef,
    settledAt: status === 'settled' ? new Date().toISOString() : p.settledAt,
    failureReason: status === 'failed' ? body.reason || body.message || 'Declined' : null,
    webhookAt: new Date().toISOString(),
    webhookVerified: true,
  });
  res.json({ ok: true, id: p.id, status, signature: verified.reason });
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

router.get('/', (_req, res) => {
  res.json({ ok: true, payments: store.list(30).map(publicPayment) });
});

module.exports = router;
