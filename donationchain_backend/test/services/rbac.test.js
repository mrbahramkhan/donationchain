/**
 * RBAC unit tests — normalizeRole, hasPermission matrix, isStaffRole.
 */
const { describe, it } = require('node:test');
const {
  ROLES,
  PERMISSIONS,
  normalizeRole,
  hasPermission,
  isStaffRole,
  requirePermission,
} = require('../../src/rbac');
const A = require('../helpers/assert');

describe('normalizeRole', () => {
  it('maps admin aliases to superadmin', () => {
    A.eq(normalizeRole('admin'), ROLES.SUPER_ADMIN, 'admin');
    A.eq(normalizeRole('super_admin'), ROLES.SUPER_ADMIN, 'super_admin');
    A.eq(normalizeRole('Super Admin'), ROLES.SUPER_ADMIN, 'Super Admin');
  });

  it('maps needy/beneficiary/applicant to seeker', () => {
    A.eq(normalizeRole('needy'), ROLES.SEEKER, 'needy');
    A.eq(normalizeRole('beneficiary'), ROLES.SEEKER, 'beneficiary');
    A.eq(normalizeRole('applicant'), ROLES.SEEKER, 'applicant');
  });

  it('lowercases and underscores spaces', () => {
    A.eq(normalizeRole('Regional Admin'), 'regional_admin', 'Regional Admin');
    A.eq(normalizeRole('DONOR'), 'donor', 'DONOR');
  });

  it('returns null for empty input', () => {
    A.eq(normalizeRole(null), null, 'null');
    A.eq(normalizeRole(''), null, 'empty string');
    A.eq(normalizeRole(undefined), null, 'undefined');
  });
});

describe('hasPermission — superadmin bypass', () => {
  it('grants every catalog permission', () => {
    for (const perm of Object.keys(PERMISSIONS)) {
      A.permission('superadmin', perm, true);
      A.permission('admin', perm, true);
    }
  });

  it('grants unknown permission keys', () => {
    A.permission('superadmin', 'future:unknown_perm', true);
  });
});

describe('hasPermission — notify matrix', () => {
  it('allows only superadmin and regional_admin for notify:send', () => {
    A.permission('superadmin', 'notify:send', true);
    A.permission('regional_admin', 'notify:send', true);
    A.permission('donor', 'notify:send', false);
    A.permission('seeker', 'notify:send', false);
    A.permission('auditor', 'notify:send', false);
    A.permission('verification_officer', 'notify:send', false);
    A.permission('ngo', 'notify:send', false);
  });

  it('gates notify:events the same way', () => {
    A.permission('regional_admin', 'notify:events', true);
    A.permission('donor', 'notify:events', false);
  });
});

describe('hasPermission — cases & donations', () => {
  it('seeker can apply; donor cannot', () => {
    A.permission('seeker', 'cases:apply', true);
    A.permission('needy', 'cases:apply', true);
    A.permission('donor', 'cases:apply', false);
  });

  it('donor and CSR can create donations; seeker cannot', () => {
    A.permission('donor', 'donations:create', true);
    A.permission('corporate_csr', 'donations:create', true);
    A.permission('seeker', 'donations:create', false);
  });

  it('only regional_admin and superadmin approve cases', () => {
    A.permission('regional_admin', 'cases:approve', true);
    A.permission('verification_officer', 'cases:approve', false);
    A.permission('donor', 'cases:approve', false);
  });

  it('auditor can read_all donations but not create', () => {
    A.permission('auditor', 'donations:read_all', true);
    A.permission('auditor', 'donations:create', false);
  });
});

describe('hasPermission — shariah & admin', () => {
  it('shariah scholar can access board and certificates', () => {
    A.permission('shariah_scholar', 'shariah:board', true);
    A.permission('shariah_scholar', 'shariah:certificate', true);
    A.permission('donor', 'shariah:certificate', false);
  });

  it('only superadmin can manage users and config', () => {
    A.permission('superadmin', 'admin:users', true);
    A.permission('regional_admin', 'admin:users', false);
    A.permission('regional_admin', 'admin:config', false);
  });
});

describe('hasPermission — edge cases', () => {
  it('unknown permission denied for non-superadmin', () => {
    A.permission('donor', 'does:not:exist', false);
    A.permission('regional_admin', 'does:not:exist', false);
  });

  it('null/empty role always denied', () => {
    A.permission(null, 'notify:send', false);
    A.permission('', 'cases:list_public', false);
  });
});

describe('isStaffRole', () => {
  it('treats ops/compliance roles as staff', () => {
    for (const r of [
      'superadmin',
      'admin',
      'regional_admin',
      'verification_officer',
      'auditor',
      'shariah_scholar',
    ]) {
      A.isTrue(isStaffRole(r), `staff:${r}`);
    }
  });

  it('treats public roles as non-staff', () => {
    for (const r of ['donor', 'seeker', 'ngo', 'vendor', 'volunteer', 'corporate_csr']) {
      A.isFalse(isStaffRole(r), `non-staff:${r}`);
    }
  });
});

describe('rbac requirePermission middleware', () => {
  function mockRes() {
    return {
      statusCode: 200,
      body: null,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(o) {
        this.body = o;
        return this;
      },
    };
  }

  it('responds 401 when req.user is missing', () => {
    const res = mockRes();
    let next = false;
    requirePermission('notify:send')({}, res, () => {
      next = true;
    });
    A.eq(res.statusCode, 401, 'status');
    A.isFalse(next, 'next() must not run');
  });

  it('responds 403 when donor lacks notify:send', () => {
    const res = mockRes();
    let next = false;
    requirePermission('notify:send')({ user: { role: 'donor' } }, res, () => {
      next = true;
    });
    A.eq(res.statusCode, 403, 'status');
    A.eq(res.body.permission, 'notify:send', 'body.permission');
    A.isFalse(next, 'next() must not run');
  });

  it('calls next() when regional_admin has notify:send', () => {
    const res = mockRes();
    let next = false;
    requirePermission('notify:send')({ user: { role: 'regional_admin' } }, res, () => {
      next = true;
    });
    A.isTrue(next, 'next() must run');
    A.eq(res.statusCode, 200, 'status unchanged');
  });
});

describe('PERMISSIONS catalog integrity', () => {
  it('lists only known role ids', () => {
    const known = new Set(Object.values(ROLES));
    for (const [perm, roles] of Object.entries(PERMISSIONS)) {
      A.raw.ok(Array.isArray(roles) && roles.length > 0, `${perm} must be non-empty array`);
      for (const r of roles) {
        A.raw.ok(known.has(r), `${perm} contains unknown role "${r}"`);
      }
    }
  });

  it('exports stable role constants', () => {
    A.eq(ROLES.DONOR, 'donor', 'ROLES.DONOR');
    A.eq(ROLES.SEEKER, 'seeker', 'ROLES.SEEKER');
    A.eq(ROLES.SHARIAH_SCHOLAR, 'shariah_scholar', 'ROLES.SHARIAH_SCHOLAR');
  });
});
