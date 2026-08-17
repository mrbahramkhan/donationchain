/**
 * Zakat config + Nisab helpers (demo).
 * Hawl tracking remains primarily client-side; server exposes rates/Nisab.
 */
const express = require('express');
const router = express.Router();

const config = {
  ratePercent: 2.5,
  goldPricePerTola: Number(process.env.ZAKAT_GOLD_PER_TOLA) || 240000,
  silverPricePerTola: Number(process.env.ZAKAT_SILVER_PER_TOLA) || 2800,
  nisabGoldTola: 7.5,
  lunarYearDays: 354.367,
  nisabGoldGrams: 87.48,
};

router.get('/config', (_req, res) => {
  const nisabPkr = Math.round(config.nisabGoldTola * config.goldPricePerTola);
  res.json({
    ok: true,
    ...config,
    nisabPkr,
    updatedAt: new Date().toISOString(),
  });
});

/** Stateless calculate (client can also compute offline) */
router.post('/calculate', (req, res) => {
  const b = req.body || {};
  const goldTola = Number(b.goldTola) || 0;
  const silverTola = Number(b.silverTola) || 0;
  const cash = Number(b.cash) || 0;
  const business = Number(b.business) || 0;
  const liabilities = Number(b.liabilities) || 0;
  const hawlCompleted = !!b.hawlCompleted;

  const net =
    goldTola * config.goldPricePerTola +
    silverTola * config.silverPricePerTola +
    cash +
    business -
    liabilities;
  const netWealth = Math.max(0, net);
  const nisabPkr = Math.round(config.nisabGoldTola * config.goldPricePerTola);
  const aboveNisab = netWealth >= nisabPkr;
  const rate = config.ratePercent / 100;
  const zakatDue = aboveNisab && hawlCompleted ? Math.round(netWealth * rate) : 0;

  res.json({
    ok: true,
    netWealth,
    nisabPkr,
    aboveNisab,
    hawlCompleted,
    ratePercent: config.ratePercent,
    zakatDue,
    message: !aboveNisab
      ? 'Below Nisab — Zakat not due'
      : !hawlCompleted
        ? 'Above Nisab but Hawl incomplete — Zakat not yet due'
        : 'Zakat due',
  });
});

module.exports = router;
