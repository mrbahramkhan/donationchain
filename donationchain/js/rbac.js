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
  };

  const SESSION_KEY = 'dc_rbac_session';

  const PERMISSIONS = {
    'cases:list_public': true, // all authenticated + guest
    'cases:apply': ['seeker', 'superadmin'],
    'cases:applications_admin': ['superadmin', 'regional_admin', 'verification_officer'],
    'donations:create': ['donor', 'corporate_csr', 'superadmin'],
    'admin:dashboard': ['superadmin', 'regional_admin', 'auditor', 'verification_officer'],
    'admin:config': ['superadmin'],
    'zakat:calculate': ['donor', 'corporate_csr', 'superadmin', 'auditor'],
    'audit:read': ['superadmin', 'auditor', 'regional_admin'],
  };

  function normalizeRole(role) {
    if (!role) return null;
    const r = String(role).toLowerCase().replace(/\s+/g, '_');
    if (r === 'admin' || r === 'super_admin') return ROLES.SUPER_ADMIN;
    if (r === 'needy' || r === 'beneficiary' || r === 'applicant') return ROLES.SEEKER;
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

  function hasPermission(permission) {
    const sess = getSession();
    const role = sess ? sess.role : null;
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

  /** Guard admin pages — staff only */
  function guardAdminPage() {
    const sess = getSession();
    // Prefer AdminAuth JWT session if present
    try {
      if (window.AdminAuth && typeof AdminAuth.isLoggedIn === 'function' && AdminAuth.isLoggedIn()) {
        return true;
      }
    } catch (_) {}
    if (sess && ['superadmin', 'regional_admin', 'verification_officer', 'auditor'].includes(sess.role)) {
      return true;
    }
    // Demo: allow if classic admin session key exists
    try {
      if (localStorage.getItem('dc_admin_session') || localStorage.getItem('dc_admin_jwt')) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  /** Seeker cannot use donor-only donate as primary role confusion — soft guide */
  function assertDonorForDonate() {
    const sess = getSession();
    if (sess && sess.role === ROLES.SEEKER) {
      return {
        ok: false,
        message: 'You are logged in as a help seeker. Switch to a donor profile to donate, or continue as guest.',
      };
    }
    return { ok: true };
  }

  function assertSeekerForApply() {
    const sess = getSession();
    if (sess && (sess.role === ROLES.DONOR || sess.role === ROLES.CORPORATE_CSR)) {
      return {
        ok: false,
        message: 'Donor accounts cannot submit need applications. Use the separate seeker form without a donor session, or log out first.',
      };
    }
    return { ok: true };
  }

  return {
    ROLES,
    PERMISSIONS,
    normalizeRole,
    getSession,
    setSession,
    clearSession,
    hasPermission,
    requirePermission,
    guardAdminPage,
    assertDonorForDonate,
    assertSeekerForApply,
  };
})();

if (typeof window !== 'undefined') window.DCRBAC = DCRBAC;
