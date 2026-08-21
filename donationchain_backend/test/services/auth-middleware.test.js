/**
 * Auth middleware behaviour with mock req/res.
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const authSvc = require('../../src/services/auth');
const { requireAuth, requirePermission, requireStaff } = require('../../src/middleware/auth');

function mockRes() {
  const res = {
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
  return res;
}

describe('requireAuth middleware', () => {
  it('rejects missing bearer', () => {
    const req = { headers: {} };
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  it('accepts valid JWT from login', () => {
    // ensure default admin exists via login
    const login = authSvc.login(
      process.env.ADMIN_USERNAME || 'admin',
      process.env.ADMIN_PASSWORD || 'Admin@DC2026'
    );
    if (!login.ok) {
      // first boot may need password from env
      assert.ok(login.ok, login.error || 'login failed');
    }
    const req = { headers: { authorization: `Bearer ${login.token}` } };
    const res = mockRes();
    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.ok(req.user);
    assert.ok(req.user.role || req.user.username);
  });
});

describe('requirePermission notify:send', () => {
  it('forbids role without permission', () => {
    const req = { user: { role: 'donor', sub: 'd1' } };
    const res = mockRes();
    let nextCalled = false;
    requirePermission('notify:send')(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  it('allows superadmin', () => {
    const req = { user: { role: 'superadmin', sub: 'a1' } };
    const res = mockRes();
    let nextCalled = false;
    requirePermission('notify:send')(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });
});

describe('requireStaff', () => {
  it('blocks donor', () => {
    const req = { user: { role: 'donor' } };
    const res = mockRes();
    let next = false;
    requireStaff(req, res, () => {
      next = true;
    });
    assert.equal(next, false);
    assert.equal(res.statusCode, 403);
  });
});
