/**
 * FX API
 * GET  /api/fx/rates
 * GET  /api/fx/currencies
 * GET  /api/fx/quote?from=GBP&to=USD&amount=50
 * POST /api/fx/quote  { from, to, amount, amountDirection? }
 * GET  /api/fx/quote/:id
 * POST /api/fx/convert { amount, from, to, rate? }
 */
const express = require('express');
const router = express.Router();
const fx = require('../services/fx');

router.get('/rates', async (_req, res) => {
  try {
    await fx.ensureRates();
    res.json({ ok: true, ...fx.getRatesSnapshot() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/currencies', async (_req, res) => {
  try {
    await fx.ensureRates();
    res.json({ ok: true, base: fx.BASE, currencies: fx.listCurrencies() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

function quoteFromQueryOrBody(src) {
  return fx.createQuote({
    from: src.from || src.source,
    to: src.to || src.target || fx.BASE,
    amount: src.amount,
    amountDirection: src.amountDirection || src.direction,
    spreadPercent: src.spreadPercent,
  });
}

router.get('/quote', async (req, res) => {
  try {
    await fx.ensureRates();
    if (!req.query.from || req.query.amount == null) {
      return res.status(400).json({
        ok: false,
        error: 'Query params required: from, amount; optional: to, amountDirection',
        code: 'FX_INVALID_REQUEST',
      });
    }
    const quote = quoteFromQueryOrBody(req.query);
    res.json({ ok: true, quote });
  } catch (e) {
    const status =
      e.code === 'FX_UNSUPPORTED_PAIR' || e.code === 'FX_INVALID_AMOUNT' || e.code === 'FX_INVALID_REQUEST'
        ? 400
        : 500;
    res.status(status).json({ ok: false, error: e.message, code: e.code || 'FX_ERROR' });
  }
});

router.post('/quote', async (req, res) => {
  try {
    await fx.ensureRates();
    const quote = quoteFromQueryOrBody(req.body || {});
    res.status(201).json({ ok: true, quote });
  } catch (e) {
    const status =
      e.code === 'FX_UNSUPPORTED_PAIR' || e.code === 'FX_INVALID_AMOUNT' || e.code === 'FX_INVALID_REQUEST'
        ? 400
        : 500;
    res.status(status).json({ ok: false, error: e.message, code: e.code || 'FX_ERROR' });
  }
});

router.get('/quote/:id', (req, res) => {
  const q = fx.getQuote(req.params.id);
  if (!q) return res.status(404).json({ ok: false, error: 'quote not found', code: 'FX_QUOTE_NOT_FOUND' });
  res.json({ ok: true, quote: q, valid: !q.expired });
});

router.post('/convert', async (req, res) => {
  try {
    await fx.ensureRates();
    const b = req.body || {};
    if (b.quoteId) {
      const q = fx.assertQuoteValid(b.quoteId);
      return res.json({
        ok: true,
        result: {
          amountIn: q.amountFrom,
          currencyIn: q.from,
          amountOut: q.amountTo,
          currencyOut: q.to,
          rate: q.rate,
          quoteId: q.quoteId,
        },
        quote: q,
      });
    }
    const result = fx.convert(b.amount, b.from, b.to || fx.BASE, {
      rate: b.rate,
      applySpread: b.applySpread !== false,
    });
    res.json({ ok: true, result });
  } catch (e) {
    const status =
      e.code === 'FX_QUOTE_EXPIRED' || e.code === 'FX_QUOTE_NOT_FOUND' || e.code === 'FX_UNSUPPORTED_PAIR'
        ? 400
        : 500;
    res.status(status).json({ ok: false, error: e.message, code: e.code || 'FX_ERROR' });
  }
});

module.exports = router;
