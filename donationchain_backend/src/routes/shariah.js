/**
 * Shariah Compliance Board API
 * Rulings, case Zakat eligibility, certificates, board members (demo in-memory).
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { hasPermission, ROLES } = require('../rbac');

const board = {
  members: [
    {
      id: 'sch-001',
      name: 'Mufti Ahmed Raza Khan',
      title: 'Chairman — Shariah Board',
      madhhab: 'Hanafi',
      credentials: 'Darul Uloom Karachi · 25+ years fatawa',
      active: true,
    },
    {
      id: 'sch-002',
      name: 'Dr. Ayesha Siddiqui',
      title: 'Member Scholar',
      madhhab: 'Hanafi',
      credentials: 'PhD Islamic Finance · IIUI',
      active: true,
    },
    {
      id: 'sch-003',
      name: 'Sheikh Bilal Mahmood',
      title: 'Member Scholar',
      madhhab: 'Shafi\'i',
      credentials: 'Al-Azhar · Zakat & Awqaf specialist',
      active: true,
    },
  ],
  rulings: [
    {
      id: 'rul-001',
      topic: 'Zakat eligibility — medical cases',
      summary:
        'Direct payment to registered hospitals for treatment of eligible asnaf (fuqara, masakin) is valid Zakat disbursement. Cash to beneficiary personal accounts is not permitted on this platform.',
      status: 'adopted',
      scholarId: 'sch-001',
      createdAt: '2026-06-01T10:00:00.000Z',
      references: ['Quran 9:60', 'AAOIFI Shariah Standard 35'],
    },
    {
      id: 'rul-002',
      topic: 'Nisab & Hawl policy',
      summary:
        'Platform uses gold Nisab (87.48g / 7.5 tola) and full lunar Hawl (~354 days). Hawl may be self-declared by donor with audit trail; false declaration is religiously invalid.',
      status: 'adopted',
      scholarId: 'sch-002',
      createdAt: '2026-06-01T10:05:00.000Z',
      references: ['Classical Hanafi texts', 'Pakistan Zakat & Ushr Ordinance principles'],
    },
  ],
  caseReviews: [], // { id, caseId, decision, notes, scholarId, at }
  certificates: [], // issued compliance certificates
};

function uid(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function canBoard(req) {
  const role = req.user && req.user.role;
  return (
    hasPermission(role, 'shariah:board') ||
    hasPermission(role, 'admin:dashboard') ||
    role === ROLES.SUPER_ADMIN
  );
}

/** Public: board overview + adopted rulings */
router.get('/board', (_req, res) => {
  res.json({
    ok: true,
    name: 'DonationChain Shariah Compliance Board',
    description:
      'Independent scholars oversee Zakat eligibility, Nisab/Hawl policy, and disbursement compliance. Payments never go as cash to personal accounts.',
    members: board.members.filter((m) => m.active),
    rulings: board.rulings.filter((r) => r.status === 'adopted'),
    stats: {
      members: board.members.filter((m) => m.active).length,
      rulings: board.rulings.length,
      caseReviews: board.caseReviews.length,
      certificates: board.certificates.length,
    },
  });
});

/** Public: single ruling */
router.get('/rulings/:id', (req, res) => {
  const r = board.rulings.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'ruling not found' });
  res.json({ ok: true, ruling: r });
});

/** Staff: list all reviews */
router.get('/reviews', requireAuth, (req, res) => {
  if (!canBoard(req)) return res.status(403).json({ error: 'Forbidden' });
  res.json({ ok: true, reviews: board.caseReviews.slice().reverse() });
});

/**
 * Staff / scholar: review a case for Zakat eligibility
 * body: { caseId, decision: 'eligible'|'ineligible'|'needs_info', notes, asnafCategory? }
 */
router.post('/reviews', requireAuth, (req, res) => {
  if (!canBoard(req) && !hasPermission(req.user.role, 'shariah:review')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { caseId, decision, notes, asnafCategory } = req.body || {};
  if (!caseId || !decision) {
    return res.status(400).json({ error: 'caseId and decision required' });
  }
  const allowed = ['eligible', 'ineligible', 'needs_info'];
  if (!allowed.includes(String(decision))) {
    return res.status(400).json({ error: 'decision must be eligible|ineligible|needs_info' });
  }
  const review = {
    id: uid('rev'),
    caseId: String(caseId),
    decision: String(decision),
    asnafCategory: asnafCategory || null,
    notes: notes || '',
    scholarId: req.user.id || req.user.sub || 'staff',
    scholarName: req.user.name || req.user.phone || 'Board member',
    at: new Date().toISOString(),
  };
  board.caseReviews.push(review);
  res.status(201).json({ ok: true, review });
});

/**
 * Issue Shariah compliance certificate for a Zakat distribution / period
 * body: { donorId?, amount, periodLabel, caseIds?, notes }
 */
router.post('/certificates', requireAuth, (req, res) => {
  if (!canBoard(req)) return res.status(403).json({ error: 'Forbidden' });
  const b = req.body || {};
  const amount = Number(b.amount) || 0;
  if (amount <= 0) return res.status(400).json({ error: 'amount required' });
  const cert = {
    id: uid('cert'),
    code: 'SC-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    donorId: b.donorId || null,
    amount,
    periodLabel: b.periodLabel || new Date().getFullYear().toString(),
    caseIds: Array.isArray(b.caseIds) ? b.caseIds : [],
    notes: b.notes || '',
    issuedBy: req.user.name || 'Shariah Board',
    issuedAt: new Date().toISOString(),
    statement:
      'This certificate confirms that the referenced Zakat disbursement(s) on DonationChain were routed only to institutional vendors/hospitals/schools under Board-approved asnaf eligibility rules. No cash was transferred to personal beneficiary accounts.',
  };
  board.certificates.push(cert);
  res.status(201).json({ ok: true, certificate: cert });
});

router.get('/certificates/:code', (req, res) => {
  const c = board.certificates.find(
    (x) => x.code === req.params.code || x.id === req.params.code
  );
  if (!c) return res.status(404).json({ error: 'certificate not found' });
  res.json({ ok: true, certificate: c });
});

/** Add / update ruling (board) */
router.post('/rulings', requireAuth, (req, res) => {
  if (!canBoard(req)) return res.status(403).json({ error: 'Forbidden' });
  const { topic, summary, references, status } = req.body || {};
  if (!topic || !summary) return res.status(400).json({ error: 'topic and summary required' });
  const ruling = {
    id: uid('rul'),
    topic: String(topic),
    summary: String(summary),
    status: status === 'draft' ? 'draft' : 'adopted',
    scholarId: req.user.id || 'board',
    createdAt: new Date().toISOString(),
    references: Array.isArray(references) ? references : [],
  };
  board.rulings.push(ruling);
  res.status(201).json({ ok: true, ruling });
});

module.exports = router;
