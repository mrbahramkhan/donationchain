/**
 * Cases + seeker applications with RBAC.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requirePermission } = require('../middleware/auth');

const applications = [];
/** Sample cases aligned with web (js/app.js) + mobile DataService */
const cases = [
  {
    id: 1,
    title: 'Heart Surgery — Amina, 7 yrs',
    category: 'medical',
    city: 'Cairo',
    country: 'EG',
    currency: 'EGP',
    amount: 185000,
    raised: 120000,
    urgency: 'critical',
    verified: true,
    isZakatEligible: true,
    vendor: "Children's Cancer Hospital Egypt",
    desc: 'Congenital heart repair. Hospital invoice verified; direct institutional payout.',
  },
  {
    id: 2,
    title: 'Secondary School Fees — Fatima',
    category: 'education',
    city: 'Jakarta',
    country: 'ID',
    currency: 'IDR',
    amount: 8500000,
    raised: 5200000,
    urgency: 'high',
    verified: true,
    isZakatEligible: true,
    vendor: 'SMA Negeri Partner School',
    desc: 'Annual fees + books. Enrollment confirmed by school accounts office.',
  },
  {
    id: 3,
    title: 'Monthly Food Package — Family of 6',
    category: 'food',
    city: 'Nairobi',
    country: 'KE',
    currency: 'KES',
    amount: 18000,
    raised: 11000,
    urgency: 'medium',
    verified: true,
    isZakatEligible: true,
    vendor: 'Verified Grocery Cooperative',
    desc: 'Staples for 30 days. GPS delivery with photo proof.',
  },
  {
    id: 4,
    title: 'Electricity Arrears — Widow Household',
    category: 'utility',
    city: 'Lahore',
    country: 'PK',
    currency: 'PKR',
    amount: 18500,
    raised: 12000,
    urgency: 'high',
    verified: true,
    isZakatEligible: false,
    vendor: 'Regional Power Utility',
    desc: 'Overdue electricity bill. Direct payment to utility account only.',
  },
  {
    id: 5,
    title: 'Cancer Treatment — Cycle 3',
    category: 'medical',
    city: 'Istanbul',
    country: 'TR',
    currency: 'TRY',
    amount: 95000,
    raised: 61000,
    urgency: 'critical',
    verified: true,
    isZakatEligible: true,
    vendor: 'Acibadem Healthcare Group',
    desc: 'Chemotherapy cycle. Hospital invoice verified.',
  },
  {
    id: 6,
    title: 'University Semester Fee — Engineering',
    category: 'education',
    city: 'Dhaka',
    country: 'BD',
    currency: 'BDT',
    amount: 45000,
    raised: 28000,
    urgency: 'medium',
    verified: true,
    isZakatEligible: true,
    vendor: 'BUET Partner Accounts',
    desc: 'Semester fee. Direct transfer to university account.',
  },
  {
    id: 7,
    title: 'Emergency Medicines — Elderly Couple',
    category: 'medical',
    city: 'Kuala Lumpur',
    country: 'MY',
    currency: 'MYR',
    amount: 2200,
    raised: 900,
    urgency: 'high',
    verified: true,
    isZakatEligible: true,
    vendor: 'Verified Community Pharmacy',
    desc: 'Prescription verified. Pharmacy fulfillment only.',
  },
  {
    id: 8,
    title: 'Ramadan Food Drive — 20 Families',
    category: 'food',
    city: 'Amman',
    country: 'JO',
    currency: 'JOD',
    amount: 3200,
    raised: 2100,
    urgency: 'medium',
    verified: true,
    isZakatEligible: true,
    vendor: 'Local NGO Partner',
    desc: 'Bulk ration packs. Community distribution with OTP confirmation.',
  },
  {
    id: 9,
    title: 'Gas Utility Bill — Low-income Family',
    category: 'utility',
    city: 'Casablanca',
    country: 'MA',
    currency: 'MAD',
    amount: 1450,
    raised: 400,
    urgency: 'high',
    verified: true,
    isZakatEligible: false,
    vendor: 'National Gas Utility',
    desc: 'Winter arrears. Pay exact bill to utility account only.',
  },
  {
    id: 10,
    title: 'Water Board Bill — Orphan Household',
    category: 'utility',
    city: 'Lagos',
    country: 'NG',
    currency: 'NGN',
    amount: 85000,
    raised: 12000,
    urgency: 'medium',
    verified: true,
    isZakatEligible: false,
    vendor: 'Municipal Water Board',
    desc: 'Connection at risk. Direct board payment.',
  },
]


function uid(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

/** Public verified cases — open read */
router.get('/', (req, res) => {
  let list = cases.filter((c) => c.verified);
  const country = (req.query.country || req.query.country_code || '').toString().trim().toUpperCase();
  if (country) list = list.filter((c) => String(c.country || '').toUpperCase() === country);
  const currency = (req.query.currency || '').toString().trim().toUpperCase();
  if (currency) list = list.filter((c) => String(c.currency || '').toUpperCase() === currency);
  res.json({
    ok: true,
    cases: list,
    meta: { total: list.length, country: country || null, currency: currency || null },
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


/** Review status — verification / admin */
router.patch(
  '/applications/:id/status',
  requireAuth,
  requirePermission('cases:applications_admin'),
  (req, res) => {
    const app = applications.find((a) => a.id === req.params.id);
    if (!app) return res.status(404).json({ error: 'not found' });
    const status = String(req.body.status || '').trim();
    const allowed = ['pending_review', 'approved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'status must be pending_review|approved|rejected' });
    }
    app.status = status;
    app.reviewedAt = new Date().toISOString();
    app.reviewedBy = req.user.username || req.user.sub;
    res.json({ ok: true, application: app });
  }
);

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
