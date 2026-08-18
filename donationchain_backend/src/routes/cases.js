/**
 * Cases + seeker applications with RBAC.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requirePermission } = require('../middleware/auth');

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

/** Public verified cases — open read */
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    cases: cases.filter((c) => c.verified),
  });
});

/** Seeker application — public endpoint; role optional (seeker preferred) */
router.post('/apply', optionalAuth, (req, res) => {
  if (req.user) {
    const role = String(req.user.role || '');
    if (role === 'donor' || role === 'corporate_csr') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Donor accounts cannot submit seeker applications. Use a seeker profile.',
      });
    }
  }
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
    submittedByRole: req.user ? req.user.role : 'seeker_guest',
  };
  applications.unshift(rec);
  const publicView = {
    id: rec.id,
    status: rec.status,
    city: rec.city,
    title: rec.title,
    category: rec.category,
    urgency: rec.urgency,
    amountNeeded: rec.amountNeeded,
    vendorName: rec.vendorName,
    createdAt: rec.createdAt,
    privacy: { contactHidden: true, documentsHidden: true },
  };
  res.status(201).json({ ok: true, application: publicView, caseId: rec.id });
});

/** Admin list — staff only */
router.get(
  '/applications',
  requireAuth,
  requirePermission('cases:applications_admin'),
  (_req, res) => {
    res.json({
      ok: true,
      note: 'Admin/verification only — contains PII',
      applications,
    });
  }
);

/** Public applications — no PII */
router.get('/applications/public', (_req, res) => {
  const publicList = applications.map((a) => ({
    id: a.id,
    status: a.status,
    city: a.city,
    title: a.title,
    category: a.category,
    urgency: a.urgency,
    amountNeeded: a.amountNeeded,
    vendorName: a.vendorName,
    isZakatEligible: !!a.isZakatEligible,
    createdAt: a.createdAt,
  }));
  res.json({ ok: true, applications: publicList });
});

/** Zakat eligibility — verification staff */
router.patch(
  '/applications/:id/zakat-eligibility',
  requireAuth,
  requirePermission('cases:zakat_eligibility'),
  (req, res) => {
    const app = applications.find((a) => a.id === req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    app.isZakatEligible = !!req.body.eligible;
    app.zakatReason = req.body.reason || null;
    app.zakatDecidedAt = new Date().toISOString();
    app.zakatDecidedBy = req.user.username || req.user.sub;
    res.json({ ok: true, application: app });
  }
);

module.exports = router;
