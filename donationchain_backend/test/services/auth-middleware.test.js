/**
 * Auth middleware behaviour with mock req/res.
 */
const { describe, it } = require('node:test');
const authSvc = require('../../src/services/auth');
const { requireAuth, requirePermission, requireStaff } = require('../../src/middleware/auth');
const A = require('../helpers/assert');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
}

describe('requireAuth middleware', () => {
  it('rejects missing bearer token', () => {
    const res = mockRes();
    let nextCalled = false;
    requireAuth({ headers: {} }, res, () => {
      nextCalled = true;
    });
    A.eq(res.statusCode, 401, 'status');
    A.isFalse(nextCalled, 'next()');
    A.eq(res.body.error, 'Unauthorized', 'body.error');
  });

  it('accepts JWT from admin login', () => {
    const login = authSvc.login(
      process.env.ADMIN_USERNAME || 'admin',
      process.env.ADMIN_PASSWORD || 'Admin@DC2026'
    );
    A.isTrue(login.ok, `login: ${login.error || 'ok'}`);
    const res = mockRes();
    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${login.token}` } };
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    A.isTrue(nextCalled, 'next()');
    A.raw.ok(req.user, 'req.user attached');
    A.raw.ok(req.user.role || req.user.username, 'user has role or username');
  });
});

describe('requirePermission notify:send', () => {
  it('forbids donor', () => {
    const res = mockRes();
    let nextCalled = false;
    requirePermission('notify:send')({ user: { role: 'donor', sub: 'd1' } }, res, () => {
      nextCalled = true;
    });
    A.eq(res.statusCode, 403, 'status');
    A.isFalse(nextCalled, 'next()');
  });

  it('allows superadmin', () => {
    const res = mockRes();
    let nextCalled = false;
    requirePermission('notify:send')({ user: { role: 'superadmin', sub: 'a1' } }, res, () => {
      nextCalled = true;
    });
    A.isTrue(nextCalled, 'next()');
  });
});

describe('requireStaff', () => {
  it('blocks donor', () => {
    const res = mockRes();
    let next = false;
    requireStaff({ user: { role: 'donor' } }, res, () => {
      next = true;
    });
    A.eq(res.statusCode, 403, 'status');
    A.eq(res.body.reason, 'staff_only', 'reason');
    A.isFalse(next, 'next()');
  });
});
