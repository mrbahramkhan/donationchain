const express = require('express');
const ledger = require('../services/ledger');

const router = express.Router();

/** GET /api/ledger — chain tip + stats */
router.get('/', (_req, res) => {
  const chain = ledger.getChain();
  const check = ledger.verifyChain(chain);
  const donations = chain.filter((b) => b.data && b.data.type === 'DONATION');
  res.json({
    ...check,
    blocks: chain.length,
    donations: donations.length,
    tip: chain[chain.length - 1]?.hash,
  });
});

/** GET /api/ledger/chain — full chain (demo; paginate in prod) */
router.get('/chain', (_req, res) => {
  res.json({ chain: ledger.getChain() });
});

/** GET /api/ledger/verify/:receiptId */
router.get('/verify/:receiptId', (req, res) => {
  const check = ledger.verifyChain();
  const block = ledger.findByReceipt(req.params.receiptId);
  if (!block) {
    return res.status(404).json({ found: false, chainValid: check.valid, error: 'Receipt not on ledger' });
  }
  res.json({ found: true, chainValid: check.valid, block });
});

/** POST /api/ledger/anchor — append donation block */
router.post('/anchor', (req, res) => {
  try {
    const body = req.body || {};
    if (!body.receiptId && !body.id) {
      return res.status(400).json({ error: 'receiptId required' });
    }
    if (body.amount == null) {
      return res.status(400).json({ error: 'amount required' });
    }
    const block = ledger.appendDonation(body);
    res.status(201).json({ success: true, block });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
