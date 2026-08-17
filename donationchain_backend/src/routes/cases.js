/**
 * Cases + seeker applications (demo in-memory store).
 * Aligns with web apply form + mobile ApplyScreen.
 */
const express = require('express');
const router = express.Router();

const applications = [];
const cases = [
  {
    id: 1,
    title: 'Heart Surgery — Ali, 8 yrs',
    category: 'medical',
    city: 'Lahore',
    amount: 85000,
    raised: 62000,
    urgency: 'critical',
    verified: true,
    isZakatEligible: true,
    vendor: 'Mayo Hospital',
  },
  {
    id: 2,
    title: 'School Fees — Fatima Class 8',
    category: 'education',
    city: 'Karachi',
    amount: 42000,
    raised: 28000,
    urgency: 'high',
    verified: true,
    isZakatEligible: true,
    vendor: 'Beaconhouse',
  },
];

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

/** Public verified cases for donors */
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    cases: cases.filter((c) => c.verified),
  });
});

/** Seeker application submit */
router.post('/apply', (req, res) => {
  const b = req.body || {};
  if (!b.fullName || !b.phone || !b.city || !b.title || !b.description) {
    return res.status(400).json({
      error: 'fullName, phone, city, title, description required',
    });
  }
  const amount = Number(b.amountNeeded);
  if (!Number.isFinite(amount) || amount < 1000) {
    return res.status(400).json({ error: 'amountNeeded minimum 1000' });
  }
  const rec = {
    id: uid('APP'),
    type: 'seeker_application',
    fullName: String(b.fullName).trim(),
    phone: String(b.phone).trim(),
    city: String(b.city).trim(),
    title: String(b.title).trim(),
    description: String(b.description).trim(),
    category: b.category || 'medical',
    urgency: b.urgency || 'medium',
    amountNeeded: amount,
    vendorName: b.vendorName || null,
    status: 'pending_review',
    isZakatEligible: false,
    createdAt: new Date().toISOString(),
  };
  applications.unshift(rec);
  res.status(201).json({ ok: true, application: rec });
});

/** List applications (admin) */
router.get('/applications', (_req, res) => {
  res.json({ ok: true, applications });
});

/** Mark Zakat eligibility (admin / officer) */
router.patch('/applications/:id/zakat-eligibility', (req, res) => {
  const app = applications.find((a) => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'not found' });
  app.isZakatEligible = !!req.body.eligible;
  app.zakatReason = req.body.reason || null;
  app.zakatDecidedAt = new Date().toISOString();
  res.json({ ok: true, application: app });
});

module.exports = router;
