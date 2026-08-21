/**
 * RBAC unit tests — normalizeRole, hasPermission matrix, isStaffRole.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  ROLES,
  PERMISSIONS,
  normalizeRole,
  hasPermission,
  isStaffRole,
  requirePermission,
} = require('../../src/rbac');

describe('normalizeRole', () => {
  it('maps admin aliases to superadmin', () => {
    assert.equal(normalizeRole('admin'), ROLES.SUPER_ADMIN);
    assert.equal(normalizeRole('super_admin'), ROLES.SUPER_ADMIN);
    assert.equal(normalizeRole('Super Admin'), ROLES.SUPER_ADMIN);
  });

  it('maps needy/beneficiary/applicant to seeker', () => {
    assert.equal(normalizeRole('needy'), ROLES.SEEKER);
    assert.equal(normalizeRole('beneficiary'), ROLES.SEEKER);
    assert.equal(normalizeRole('applicant'), ROLES.SEEKER);
  });

  it('lowercases and underscores spaces', () => {
    assert.equal(normalizeRole('Regional Admin'), 'regional_admin');
    assert.equal(normalizeRole('DONOR'), 'donor');
  });

  it('returns null for empty', () => {
    assert.equal(normalizeRole(null), null);
    assert.equal(normalizeRole(''), null);
    assert.equal(normalizeRole(undefined), null);
  });
});

describe('hasPermission — superadmin bypass', () => {
  it('superadmin has every known permission', () => {
    for (const perm of Object.keys(PERMISSIONS)) {
      assert.equal(hasPermission('superadmin', perm), true, perm);
      assert.equal(hasPermission('admin', perm), true, perm);
    }
  });

  it('superadmin has unknown permission keys too', () => {
    assert.equal(hasPermission('superadmin', 'future:unknown_perm'), true);
  });
});

describe('hasPermission — notify matrix', () => {
  it('only superadmin and regional_admin can notify:send', () => {
    assert.equal(hasPermission('superadmin', 'notify:send'), true);
    assert.equal(hasPermission('regional_admin', 'notify:send'), true);
    assert.equal(hasPermission('donor', 'notify:send'), false);
    assert.equal(hasPermission('seeker', 'notify:send'), false);
    assert.equal(hasPermission('auditor', 'notify:send'), false);
    assert.equal(hasPermission('verification_officer', 'notify:send'), false);
    assert.equal(hasPermission('ngo', 'notify:send'), false);
  });

  it('notify:events same staff gate', () => {
    assert.equal(hasPermission('regional_admin', 'notify:events'), true);
    assert.equal(hasPermission('donor', 'notify:events'), false);
  });
});

describe('hasPermission — cases & donations', () => {
  it('seeker can apply, donor cannot', () => {
    assert.equal(hasPermission('seeker', 'cases:apply'), true);
    assert.equal(hasPermission('needy', 'cases:apply'), true);
    assert.equal(hasPermission('donor', 'cases:apply'), false);
  });

  it('donor can create donation, seeker cannot', () => {
    assert.equal(hasPermission('donor', 'donations:create'), true);
    assert.equal(hasPermission('corporate_csr', 'donations:create'), true);
    assert.equal(hasPermission('seeker', 'donations:create'), false);
  });

  it('only admins approve cases', () => {
    assert.equal(hasPermission('regional_admin', 'cases:approve'), true);
    assert.equal(hasPermission('verification_officer', 'cases:approve'), false);
    assert.equal(hasPermission('donor', 'cases:approve'), false);
  });

  it('auditor can read all donations, not create', () => {
    assert.equal(hasPermission('auditor', 'donations:read_all'), true);
    assert.equal(hasPermission('auditor', 'donations:create'), false);
  });
});

describe('hasPermission — shariah & admin', () => {
  it('shariah scholar board access', () => {
    assert.equal(hasPermission('shariah_scholar', 'shariah:board'), true);
    assert.equal(hasPermission('shariah_scholar', 'shariah:certificate'), true);
    assert.equal(hasPermission('donor', 'shariah:certificate'), false);
  });

  it('only superadmin admin:users and admin:config', () => {
    assert.equal(hasPermission('superadmin', 'admin:users'), true);
    assert.equal(hasPermission('regional_admin', 'admin:users'), false);
    assert.equal(hasPermission('regional_admin', 'admin:config'), false);
  });
});

describe('hasPermission — edge cases', () => {
  it('unknown permission is false for non-superadmin', () => {
    assert.equal(hasPermission('donor', 'does:not:exist'), false);
    assert.equal(hasPermission('regional_admin', 'does:not:exist'), false);
  });

  it('null role is false', () => {
    assert.equal(hasPermission(null, 'notify:send'), false);
    assert.equal(hasPermission('', 'cases:list_public'), false);
  });
});

describe('isStaffRole', () => {
  it('staff roles', () => {
    for (const r of [
      'superadmin',
      'admin',
      'regional_admin',
      'verification_officer',
      'auditor',
      'shariah_scholar',
    ]) {
      assert.equal(isStaffRole(r), true, r);
    }
  });

  it('non-staff roles', () => {
    for (const r of ['donor', 'seeker', 'ngo', 'vendor', 'volunteer', 'corporate_csr']) {
      assert.equal(isStaffRole(r), false, r);
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

  it('401 without user', () => {
    const res = mockRes();
    let next = false;
    requirePermission('notify:send')({}, res, () => {
      next = true;
    });
    assert.equal(res.statusCode, 401);
    assert.equal(next, false);
  });

  it('403 donor on notify:send', () => {
    const res = mockRes();
    let next = false;
    requirePermission('notify:send')({ user: { role: 'donor' } }, res, () => {
      next = true;
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.permission, 'notify:send');
    assert.equal(next, false);
  });

  it('next() for regional_admin on notify:send', () => {
    const res = mockRes();
    let next = false;
    requirePermission('notify:send')({ user: { role: 'regional_admin' } }, res, () => {
      next = true;
    });
    assert.equal(next, true);
    assert.equal(res.statusCode, 200);
  });
});

describe('PERMISSIONS catalog integrity', () => {
  it('every permission lists only known role strings or valid names', () => {
    const known = new Set(Object.values(ROLES));
    for (const [perm, roles] of Object.entries(PERMISSIONS)) {
      assert.ok(Array.isArray(roles), perm);
      assert.ok(roles.length > 0, perm);
      for (const r of roles) {
        assert.equal(typeof r, 'string', `${perm}:${r}`);
        assert.ok(r.length > 0, `${perm} empty role`);
        // catalog uses canonical role ids
        assert.ok(
          known.has(r) || r === 'superadmin',
          `${perm} has unexpected role ${r}`
        );
      }
    }
  });

  it('exports stable role constants', () => {
    assert.equal(ROLES.DONOR, 'donor');
    assert.equal(ROLES.SEEKER, 'seeker');
    assert.equal(ROLES.SHARIAH_SCHOLAR, 'shariah_scholar');
  });
});
