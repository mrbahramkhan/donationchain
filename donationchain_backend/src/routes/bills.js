/**
 * Utility bill lookup + payment (demo).
 * Production: integrate WAPDA/SNGPL/Raast bill APIs; payout only to registered utility accounts.
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const PROVIDERS = {
  wapda: { name: 'WAPDA / LESCO / MEPCO', type: 'electricity' },
  sngpl: { name: 'SNGPL (Gas)', type: 'gas' },
  ssgc: { name: 'SSGC (Gas — South)', type: 'gas' },
  ptcl: { name: 'PTCL / landline', type: 'telecom' },
  water: { name: 'Water board (WASA / KWSB)', type: 'water' },
};

const payments = [];

function hashRef(providerId, reference) {
  let h = 0;
  const s = String(providerId) + '|' + String(reference).replace(/\s/g, '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

router.get('/providers', (_req, res) => {
  res.json({
    ok: true,
    providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p })),
  });
});

router.post('/lookup', (req, res) => {
  const providerId = String((req.body && req.body.providerId) || '').toLowerCase();
  const reference = String((req.body && req.body.reference) || '').trim();
  const p = PROVIDERS[providerId];
  if (!p) return res.status(400).json({ ok: false, error: 'Unknown provider' });
  if (reference.length < 6) {
    return res.status(400).json({ ok: false, error: 'Reference too short' });
  }
  const h = hashRef(providerId, reference);
  const amountDue = 1500 + (h % 45000);
  const due = new Date();
  due.setDate(due.getDate() + (h % 20) - 5);
  res.json({
    ok: true,
    bill: {
      providerId,
      providerName: p.name,
      type: p.type,
      reference,
      consumerName: 'Account holder (masked)',
      amountDue,
      arrears: h % 3 === 0 ? Math.round(amountDue * 0.15) : 0,
      billingMonth: due.toLocaleString('en', { month: 'short', year: 'numeric' }),
      dueDate: due.toISOString().slice(0, 10),
      status: h % 20 < 5 ? 'overdue' : 'payable',
      demo: true,
    },
  });
});

/**
 * Pay bill — funds conceptually to utility institutional account only.
 * body: { providerId, reference, amount, method }
 */
router.post('/pay', (req, res) => {
  const b = req.body || {};
  const providerId = String(b.providerId || '').toLowerCase();
  const reference = String(b.reference || '').trim();
  const amount = Number(b.amount) || 0;
  const method = String(b.method || 'raast');
  const p = PROVIDERS[providerId];
  if (!p) return res.status(400).json({ ok: false, error: 'Unknown provider' });
  if (!reference || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'reference and amount required' });
  }
  if (amount > 500000) {
    return res.status(400).json({ ok: false, error: 'Amount exceeds limit' });
  }
  const payment = {
    id: 'BILL-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    providerId,
    providerName: p.name,
    reference,
    amount,
    method,
    status: 'paid',
    paidAt: new Date().toISOString(),
    payoutTarget: 'utility_institutional_account',
    note: 'Direct to utility — no personal beneficiary account',
  };
  payments.unshift(payment);
  if (payments.length > 200) payments.length = 200;
  res.status(201).json({ ok: true, payment });
});

router.get('/payments', (_req, res) => {
  res.json({ ok: true, payments: payments.slice(0, 50) });
});

module.exports = router;
