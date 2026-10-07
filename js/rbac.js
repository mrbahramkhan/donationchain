/**
 * Client-side Role-Based Access Control (mirrors backend/src/rbac.js)
 * Enforces UI/route guards for donor, seeker, and staff.
 */
const DCRBAC = (() => {
  const ROLES = {
    SUPER_ADMIN: 'superadmin',
    REGIONAL_ADMIN: 'regional_admin',
    VERIFICATION_OFFICER: 'verification_officer',
    DONOR: 'donor',
    SEEKER: 'seeker',
    NGO: 'ngo',
    VENDOR: 'vendor',
    AUDITOR: 'auditor',
    VOLUNTEER: 'volunteer',
    CORPORATE_CSR: 'corporate_csr',
    SHARIAH_SCHOLAR: 'shariah_scholar',
  };

  const ROLE_LABELS = {
    superadmin: 'Super Admin',
    regional_admin: 'Regional Admin',
    verification_officer: 'Verification Officer',
    donor: 'Donor',
    seeker: 'Seeker (Needy)',
    ngo: 'NGO',
    vendor: 'Vendor',
    auditor: 'Auditor',
    volunteer: 'Volunteer',
    corporate_csr: 'Corporate CSR',
    shariah_scholar: 'Shariah Scholar',
  };

  const SESSION_KEY = 'dc_rbac_session';

  /** Full permission catalog — keep in sync with donationchain_backend/src/rbac.js */
  const PERMISSIONS = {
    // Cases / applications
    'cases:list_public': true,
    'cases:apply': ['seeker', 'superadmin'],
    'cases:applications_admin': ['superadmin', 'regional_admin', 'verification_officer'],
    'cases:applications_public': [
      'superadmin',
      'regional_admin',
      'verification_officer',
      'donor',
      'ngo',
      'auditor',
      'corporate_csr',
    ],
    'cases:zakat_eligibility': ['superadmin', 'regional_admin', 'verification_officer', 'shariah_scholar'],
    'cases:approve': ['superadmin', 'regional_admin'],

    // Donations
    'donations:create': ['donor', 'corporate_csr', 'superadmin'],
    'donations:read_own': ['donor', 'corporate_csr', 'superadmin'],
    'donations:read_all': ['superadmin', 'regional_admin', 'auditor'],

    // Zakat
    'zakat:config_read': [
      'superadmin',
      'regional_admin',
      'donor',
      'corporate_csr',
      'auditor',
      'verification_officer',
      'shariah_scholar',
    ],
    'zakat:config_write': ['superadmin'],
    'zakat:calculate': ['donor', 'corporate_csr', 'superadmin', 'auditor', 'shariah_scholar'],

    // Shariah Board
    'shariah:board': ['superadmin', 'shariah_scholar', 'auditor'],
    'shariah:review': ['superadmin', 'shariah_scholar', 'regional_admin', 'verification_officer'],
    'shariah:certificate': ['superadmin', 'shariah_scholar'],
    'shariah:rulings_write': ['superadmin', 'shariah_scholar'],

    // Admin / audit
    'admin:dashboard': [
      'superadmin',
      'regional_admin',
      'auditor',
      'verification_officer',
      'shariah_scholar',
    ],
    'admin:users': ['superadmin'],
    'admin:config': ['superadmin'],
    'audit:read': ['superadmin', 'auditor', 'regional_admin', 'shariah_scholar'],

    // Notifications
    'notify:send': ['superadmin', 'regional_admin'],
    'notify:events': ['superadmin', 'regional_admin'],

    // Ledger
    'ledger:read': ['superadmin', 'auditor', 'regional_admin', 'donor'],
    'ledger:write': ['superadmin'],

    // Vendor / NGO field
    'vendor:invoices': ['vendor', 'superadmin', 'regional_admin'],
    'ngo:verify_field': ['ngo', 'superadmin', 'regional_admin', 'verification_officer'],
    'volunteer:field_tasks': ['volunteer', 'verification_officer', 'superadmin'],
  };

  const STAFF_ROLES = [
    ROLES.SUPER_ADMIN,
    ROLES.REGIONAL_ADMIN,
    ROLES.VERIFICATION_OFFICER,
    ROLES.AUDITOR,
    ROLES.SHARIAH_SCHOLAR,
  ];

  function normalizeRole(role) {
    if (!role) return null;
    const r = String(role).toLowerCase().replace(/\s+/g, '_');
    if (r === 'admin' || r === 'super_admin') return ROLES.SUPER_ADMIN;
    if (r === 'needy' || r === 'beneficiary' || r === 'applicant') return ROLES.SEEKER;
    if (r === 'shariah' || r === 'scholar' || r === 'shariah_board') return ROLES.SHARIAH_SCHOLAR;
    return r;
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem('dc_user');
      if (!raw) return null;
      const u = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!u) return null;
      return {
        name: u.name || u.fullName || u.username || '',
        phone: u.phone || '',
        role: normalizeRole(u.role || 'donor'),
      };
    } catch {
      return null;
    }
  }

  function setSession(user) {
    const sess = {
      name: user.name || '',
      phone: user.phone || '',
      role: normalizeRole(user.role || 'donor'),
      at: new Date().toISOString(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    try {
      localStorage.setItem(
        'dc_user',
        JSON.stringify({
          name: sess.name,
          phone: sess.phone,
          role: sess.role,
          loggedInAt: sess.at,
        })
      );
    } catch (_) {}
    return sess;
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    try {
      localStorage.removeItem('dc_user');
    } catch (_) {}
  }

  function hasPermission(permission, roleOverride) {
    const role = roleOverride
      ? normalizeRole(roleOverride)
      : getSession()
        ? getSession().role
        : null;
    if (permission === 'cases:list_public') return true;
    if (!role) return false;
    if (role === ROLES.SUPER_ADMIN) return true;
    const allowed = PERMISSIONS[permission];
    if (allowed === true) return true;
    if (Array.isArray(allowed)) return allowed.includes(role);
    return false;
  }

  function requirePermission(permission, redirectUrl) {
    if (hasPermission(permission)) return true;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
    return false;
  }

  function isStaffRole(role) {
    const r = normalizeRole(role || (getSession() && getSession().role));
    return STAFF_ROLES.includes(r);
  }

  /** Guard admin pages — staff only */
  function guardAdminPage() {
    const sess = getSession();
    try {
      if (window.AdminAuth && typeof AdminAuth.isLoggedIn === 'function' && AdminAuth.isLoggedIn()) {
        return true;
      }
    } catch (_) {}
    if (sess && STAFF_ROLES.includes(sess.role)) return true;
    try {
      if (localStorage.getItem('dc_admin_session') || localStorage.getItem('dc_admin_jwt')) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  function assertDonorForDonate() {
    const sess = getSession();
    if (sess && sess.role === ROLES.SEEKER) {
      return {
        ok: false,
        message:
          'You are logged in as a help seeker. Switch to a donor profile to donate, or continue as guest.',
      };
    }
    return { ok: true };
  }

  function assertSeekerForApply() {
    const sess = getSession();
    if (sess && (sess.role === ROLES.DONOR || sess.role === ROLES.CORPORATE_CSR)) {
      return {
        ok: false,
        message:
          'Donor accounts cannot submit need applications. Use the separate seeker form without a donor session, or log out first.',
      };
    }
    return { ok: true };
  }

  /** Permissions granted to a role (for matrix UI) */
  function permissionsForRole(role) {
    const r = normalizeRole(role);
    if (!r) return [];
    if (r === ROLES.SUPER_ADMIN) return Object.keys(PERMISSIONS);
    return Object.keys(PERMISSIONS).filter((p) => {
      const a = PERMISSIONS[p];
      if (a === true) return true;
      return Array.isArray(a) && a.includes(r);
    });
  }

  /** Matrix rows for admin display */
  function permissionMatrix() {
    const roles = Object.values(ROLES);
    const perms = Object.keys(PERMISSIONS);
    return {
      roles,
      labels: ROLE_LABELS,
      permissions: perms,
      cells: perms.map((p) => ({
        permission: p,
        byRole: roles.reduce((acc, role) => {
          acc[role] = hasPermission(p, role);
          return acc;
        }, {}),
      })),
    };
  }

  return {
    ROLES,
    ROLE_LABELS,
    PERMISSIONS,
    STAFF_ROLES,
    normalizeRole,
    getSession,
    setSession,
    clearSession,
    hasPermission,
    requirePermission,
    isStaffRole,
    guardAdminPage,
    assertDonorForDonate,
    assertSeekerForApply,
    permissionsForRole,
    permissionMatrix,
  };
})();

if (typeof window !== 'undefined') window.DCRBAC = DCRBAC;
