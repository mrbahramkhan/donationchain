/**
 * Organization trust verification API
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission, optionalAuth } = require('../middleware/auth');

const orgs = [
  {
    id: 'org-mayo',
    name: 'Mayo Hospital',
    type: 'hospital',
    city: 'Lahore',
    status: 'verified',
    registrationNo: 'PHC-LHR-001',
    bankIbanMasked: 'PK00••••••••1234',
    checks: {
      legalRegistration: true,
      physicalAddress: true,
      bankAccountOwnership: true,
      contactPerson: true,
      sampleInvoice: true,
    },
  },
  {
    id: 'org-beacon',
    name: 'Beaconhouse School',
    type: 'school',
    city: 'Karachi',
    status: 'verified',
    registrationNo: 'SEF-KHI-214',
    bankIbanMasked: 'PK00••••••••5678',
    checks: {
      legalRegistration: true,
      physicalAddress: true,
      bankAccountOwnership: true,
      contactPerson: true,
      sampleInvoice: true,
    },
  },
];

function canPay(status) {
  return status === 'verified' || status === 'bank_verified';
}

/** Public list — no full IBAN */
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      city: o.city,
      status: o.status,
      canReceivePayment: canPay(o.status),
      registrationNo: o.registrationNo,
    })),
  });
});

router.get('/:id', (req, res) => {
  const o = orgs.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'not found' });
  res.json({
    ok: true,
    organization: {
      ...o,
      canReceivePayment: canPay(o.status),
      // never expose full account publicly
      bankIbanMasked: o.bankIbanMasked,
    },
  });
});

/** Staff: update verification status */
router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('cases:approve'),
  (req, res) => {
    const o = orgs.find((x) => x.id === req.params.id);
    if (!o) return res.status(404).json({ error: 'not found' });
    const { status, checks } = req.body || {};
    if (status) o.status = status;
    if (checks) o.checks = { ...o.checks, ...checks };
    if (status === 'verified') o.verifiedAt = new Date().toISOString();
    o.updatedBy = req.user.username || req.user.sub;
    res.json({ ok: true, organization: o });
  }
);

module.exports = router;
