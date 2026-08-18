/**
 * Role-Based Access Control — DonationChain
 * Aligns with SRS roles (subset fully enforced in API).
 */

const ROLES = {
  SUPER_ADMIN: 'superadmin',
  REGIONAL_ADMIN: 'regional_admin',
  VERIFICATION_OFFICER: 'verification_officer',
  DONOR: 'donor',
  SEEKER: 'seeker', // needy / beneficiary
  NGO: 'ngo',
  VENDOR: 'vendor',
  AUDITOR: 'auditor',
  VOLUNTEER: 'volunteer',
  CORPORATE_CSR: 'corporate_csr',
  SHARIAH_SCHOLAR: 'shariah_scholar',
};

/** Permission catalog */
const PERMISSIONS = {
  // Cases / applications
  'cases:list_public': ['superadmin', 'regional_admin', 'verification_officer', 'donor', 'seeker', 'ngo', 'vendor', 'auditor', 'volunteer', 'corporate_csr'],
  'cases:apply': ['seeker', 'superadmin'],
  'cases:applications_admin': ['superadmin', 'regional_admin', 'verification_officer'],
  'cases:applications_public': ['superadmin', 'regional_admin', 'verification_officer', 'donor', 'ngo', 'auditor', 'corporate_csr'],
  'cases:zakat_eligibility': ['superadmin', 'regional_admin', 'verification_officer'],
  'cases:approve': ['superadmin', 'regional_admin'],

  // Donations / payments (API surface)
  'donations:create': ['donor', 'corporate_csr', 'superadmin'],
  'donations:read_own': ['donor', 'corporate_csr', 'superadmin'],
  'donations:read_all': ['superadmin', 'regional_admin', 'auditor'],

  // Zakat
  'zakat:config_read': ['superadmin', 'regional_admin', 'donor', 'corporate_csr', 'auditor', 'verification_officer', 'shariah_scholar'],
  'zakat:config_write': ['superadmin'],
  'zakat:calculate': ['donor', 'corporate_csr', 'superadmin', 'auditor', 'shariah_scholar'],

  // Shariah Compliance Board
  'shariah:board': ['superadmin', 'shariah_scholar', 'auditor'],
  'shariah:review': ['superadmin', 'shariah_scholar', 'regional_admin', 'verification_officer'],
  'shariah:certificate': ['superadmin', 'shariah_scholar'],
  'shariah:rulings_write': ['superadmin', 'shariah_scholar'],

  // Admin / audit
  'admin:dashboard': ['superadmin', 'regional_admin', 'auditor', 'shariah_scholar'],
  'admin:users': ['superadmin'],
  'admin:config': ['superadmin'],
  'audit:read': ['superadmin', 'auditor', 'regional_admin', 'shariah_scholar'],

  // Notifications
  'notify:send': ['superadmin', 'regional_admin'],
  'notify:events': ['superadmin', 'regional_admin'],

  // Ledger
  'ledger:read': ['superadmin', 'auditor', 'regional_admin', 'donor'],
  'ledger:write': ['superadmin'],

  // Vendor
  'vendor:invoices': ['vendor', 'superadmin', 'regional_admin'],
};

function normalizeRole(role) {
  if (!role) return null;
  const r = String(role).toLowerCase().replace(/\s+/g, '_');
  if (r === 'admin' || r === 'super_admin') return ROLES.SUPER_ADMIN;
  if (r === 'needy' || r === 'beneficiary' || r === 'applicant') return ROLES.SEEKER;
  return r;
}

function hasPermission(role, permission) {
  const r = normalizeRole(role);
  if (!r) return false;
  if (r === ROLES.SUPER_ADMIN) return true;
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(r);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        permission,
        role: req.user.role,
      });
    }
    next();
  };
}

/** Roles that may access admin HTML / API dashboards */
function isStaffRole(role) {
  const r = normalizeRole(role);
  return [
    ROLES.SUPER_ADMIN,
    ROLES.REGIONAL_ADMIN,
    ROLES.VERIFICATION_OFFICER,
    ROLES.AUDITOR,
    ROLES.SHARIAH_SCHOLAR,
  ].includes(r);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  normalizeRole,
  hasPermission,
  requirePermission,
  isStaffRole,
};
