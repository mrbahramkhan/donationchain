/**
 * Auth integration tests
 * - Isolated DONATIONCHAIN_DATA_DIR (no production data/ pollution)
 * - Full login → JWT → verify → change-password → re-login lifecycle
 * - Middleware gates with real login tokens
 * - HTTP routes via createApp when express is installed (else skipped)
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const A = require('../helpers/assert');

const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || 'Admin@DC2026';

/** Fresh temp data dir + cleared auth module cache */
function isolateAuth() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-auth-'));
  process.env.DONATIONCHAIN_DATA_DIR = dir;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-only';

  const clear = (rel) => {
    try {
      delete require.cache[require.resolve(rel)];
    } catch (_) {}
  };
  clear('../../src/services/auth');
  clear('../../src/middleware/auth');
  clear('../../src/rbac');

  const auth = require('../../src/services/auth');
  const middleware = require('../../src/middleware/auth');
  return {
    dir,
    auth,
    middleware,
    restore() {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (_) {}
      clear('../../src/services/auth');
      clear('../../src/middleware/auth');
    },
  };
}

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

function runChain(middlewares, req) {
  return new Promise((resolve) => {
    const res = mockRes();
    let settled = false;
    const settle = (nextReached) => {
      if (settled) return;
      settled = true;
      resolve({ status: res.statusCode, body: res.body, user: req.user, nextReached });
    };
    const origJson = res.json.bind(res);
    res.json = (obj) => {
      origJson(obj);
      settle(false);
      return res;
    };
    let i = 0;
    const next = (err) => {
      if (err) {
        res.status(500).json({ error: String(err.message || err) });
        return;
      }
      const mw = middlewares[i++];
      if (!mw) {
        settle(true);
        return;
      }
      mw(req, res, next);
    };
    next();
  });
}

// ── Service-level integration ──────────────────────────────────────────

describe('Auth service integration (isolated data dir)', () => {
  let ctx;

  before(() => {
    ctx = isolateAuth();
  });

  after(() => {
    if (ctx) ctx.restore();
  });

  it('creates default admin user file on first login attempt path', () => {
    const users = ctx.auth.loadUsers();
    assert.ok(Array.isArray(users) && users.length >= 1, 'default admin user seeded');
    assert.equal(users[0].username, USER);
    assert.equal(users[0].role, 'superadmin');
    const file = path.join(ctx.dir, 'admin-users.json');
    assert.ok(fs.existsSync(file), 'admin-users.json written under temp dir');
  });

  it('login succeeds with default credentials and returns Bearer JWT', () => {
    const result = ctx.auth.login(USER, PASS);
    A.isTrue(result.ok, result.error || 'login');
    assert.ok(result.token, 'token present');
    A.eq(result.tokenType, 'Bearer', 'tokenType');
    assert.ok(result.expiresIn > 0, 'expiresIn');
    A.eq(result.user.username, USER, 'user.username');
    A.eq(result.user.role, 'superadmin', 'user.role');
  });

  it('login fails with wrong password', () => {
    const result = ctx.auth.login(USER, 'wrong-password-xxx');
    A.isFalse(result.ok, 'login should fail');
    A.eq(result.status, 401, 'status');
  });

  it('login fails for unknown user', () => {
    const result = ctx.auth.login('no-such-user', PASS);
    A.isFalse(result.ok, 'login should fail');
  });

  it('JWT from login verifies and carries role claims', () => {
    const { token } = ctx.auth.login(USER, PASS);
    const verified = ctx.auth.verifyJwt(token);
    A.isTrue(verified.ok, verified.error);
    A.eq(verified.payload.username, USER, 'payload.username');
    A.eq(verified.payload.role, 'superadmin', 'payload.role');
    assert.ok(verified.payload.exp > verified.payload.iat, 'exp > iat');
    A.eq(verified.payload.iss, 'donationchain', 'issuer');
  });

  it('rejects tampered JWT', () => {
    const { token } = ctx.auth.login(USER, PASS);
    const parts = token.split('.');
    parts[2] = parts[2].slice(0, -4) + 'dead';
    const verified = ctx.auth.verifyJwt(parts.join('.'));
    A.isFalse(verified.ok, 'tampered token must fail');
  });

  it('extractBearer reads Authorization header', () => {
    const { token } = ctx.auth.login(USER, PASS);
    const extracted = ctx.auth.extractBearer({
      headers: { authorization: `Bearer ${token}` },
    });
    A.eq(extracted, token, 'extracted token');
    A.eq(ctx.auth.extractBearer({ headers: {} }), null, 'missing header');
  });

  it('change-password then login with new password', () => {
    const login1 = ctx.auth.login(USER, PASS);
    A.isTrue(login1.ok, 'initial login');

    const changed = ctx.auth.changePassword(USER, PASS, 'NewPass#2026xx');
    A.isTrue(changed.ok, changed.error || 'changePassword');

    const oldLogin = ctx.auth.login(USER, PASS);
    A.isFalse(oldLogin.ok, 'old password must fail');

    const newLogin = ctx.auth.login(USER, 'NewPass#2026xx');
    A.isTrue(newLogin.ok, newLogin.error || 'new password login');

    // restore for later tests in this suite
    const back = ctx.auth.changePassword(USER, 'NewPass#2026xx', PASS);
    A.isTrue(back.ok, back.error || 'restore password');
  });

  it('rejects short new password', () => {
    const result = ctx.auth.changePassword(USER, PASS, 'short');
    A.isFalse(result.ok, 'short password');
    A.eq(result.status, 400, 'status');
  });
});

// ── Middleware integration with real login tokens ──────────────────────

describe('Auth middleware integration (real login JWT)', () => {
  let ctx;
  let token;

  before(() => {
    ctx = isolateAuth();
    const login = ctx.auth.login(USER, PASS);
    assert.ok(login.ok, login.error);
    token = login.token;
  });

  after(() => {
    if (ctx) ctx.restore();
  });

  it('requireAuth accepts login token', async () => {
    const { requireAuth } = ctx.middleware;
    const out = await runChain([requireAuth], {
      headers: { authorization: `Bearer ${token}` },
    });
    A.allows(out);
    A.eq(out.user.username, USER, 'username');
    A.eq(out.user.role, 'superadmin', 'normalized role');
  });

  it('requireAuth rejects missing token', async () => {
    const { requireAuth } = ctx.middleware;
    const out = await runChain([requireAuth], { headers: {} });
    A.deniesWith(out, 401, 'Unauthorized');
  });

  it('requirePermission admin:config allowed for superadmin login', async () => {
    const { requireAuth, requirePermission } = ctx.middleware;
    const out = await runChain([requireAuth, requirePermission('admin:config')], {
      headers: { authorization: `Bearer ${token}` },
    });
    A.allows(out);
  });

  it('requireStaff allows superadmin login', async () => {
    const { requireAuth, requireStaff } = ctx.middleware;
    const out = await runChain([requireAuth, requireStaff], {
      headers: { authorization: `Bearer ${token}` },
    });
    A.allows(out);
  });
});

// ── HTTP integration (createApp) when express available ────────────────

describe('Auth HTTP routes integration', () => {
  let server;
  let baseUrl;
  let available = false;
  let dataDir;

  before(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-auth-http-'));
    process.env.DONATIONCHAIN_DATA_DIR = dataDir;
    process.env.JWT_SECRET = 'test-jwt-secret-http-integration';
    process.env.SMS_PROVIDER = 'mock';

    // Clear cached modules so DATA_DIR is picked up
    for (const key of Object.keys(require.cache)) {
      if (key.includes('donationchain_backend/src')) delete require.cache[key];
    }

    try {
      require.resolve('express');
      const { createApp } = require('../../src/app');
      const app = createApp({ quiet: true });
      server = http.createServer(app);
      await new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
      });
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      available = true;
    } catch (err) {
      console.log('Skipping HTTP auth tests —', err.message);
    }
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch (_) {}
  });

  async function request(method, urlPath, { body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  }

  it('POST /api/auth/login success', async (t) => {
    if (!available) return t.skip('express not installed');
    const res = await request('POST', '/api/auth/login', {
      body: { username: USER, password: PASS },
    });
    A.eq(res.status, 200, 'status');
    assert.ok(res.body.token, 'token');
    A.eq(res.body.user.role, 'superadmin', 'role');
  });

  it('POST /api/auth/login invalid credentials', async (t) => {
    if (!available) return t.skip('express not installed');
    const res = await request('POST', '/api/auth/login', {
      body: { username: USER, password: 'bad' },
    });
    A.eq(res.status, 401, 'status');
  });

  it('GET /api/auth/me without token → 401', async (t) => {
    if (!available) return t.skip('express not installed');
    const res = await request('GET', '/api/auth/me');
    A.eq(res.status, 401, 'status');
  });

  it('GET /api/auth/me with token returns user + permissions', async (t) => {
    if (!available) return t.skip('express not installed');
    const login = await request('POST', '/api/auth/login', {
      body: { username: USER, password: PASS },
    });
    const res = await request('GET', '/api/auth/me', { token: login.body.token });
    A.eq(res.status, 200, 'status');
    A.eq(res.body.user.username, USER, 'username');
    A.eq(res.body.user.isStaff, true, 'isStaff');
    A.eq(res.body.permissions['admin:config'], true, 'admin:config permission');
  });

  it('POST /api/auth/logout requires auth', async (t) => {
    if (!available) return t.skip('express not installed');
    const denied = await request('POST', '/api/auth/logout');
    A.eq(denied.status, 401, 'no token');
    const login = await request('POST', '/api/auth/login', {
      body: { username: USER, password: PASS },
    });
    const ok = await request('POST', '/api/auth/logout', { token: login.body.token });
    A.eq(ok.status, 200, 'logout');
    A.eq(ok.body.success, true, 'success');
  });

  it('POST /api/auth/change-password full flow', async (t) => {
    if (!available) return t.skip('express not installed');
    const login = await request('POST', '/api/auth/login', {
      body: { username: USER, password: PASS },
    });
    const bad = await request('POST', '/api/auth/change-password', {
      token: login.body.token,
      body: { currentPassword: PASS, newPassword: 'short' },
    });
    A.eq(bad.status, 400, 'short password rejected');

    const changed = await request('POST', '/api/auth/change-password', {
      token: login.body.token,
      body: { currentPassword: PASS, newPassword: 'TempPass#9999' },
    });
    A.eq(changed.status, 200, 'change ok');

    const oldDenied = await request('POST', '/api/auth/login', {
      body: { username: USER, password: PASS },
    });
    A.eq(oldDenied.status, 401, 'old password denied');

    const newOk = await request('POST', '/api/auth/login', {
      body: { username: USER, password: 'TempPass#9999' },
    });
    A.eq(newOk.status, 200, 'new password works');

    // restore
    await request('POST', '/api/auth/change-password', {
      token: newOk.body.token,
      body: { currentPassword: 'TempPass#9999', newPassword: PASS },
    });
  });

  it('protected notifications route rejects unauthenticated', async (t) => {
    if (!available) return t.skip('express not installed');
    const res = await request('POST', '/api/notifications/send', {
      body: { token: 'x', title: 't', body: 'b' },
    });
    A.eq(res.status, 401, 'notifications require auth');
  });
});
