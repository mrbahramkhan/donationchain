/**
 * RBAC middleware integration — real JWT + requireAuth → permission chain.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../../src/services/auth');
const {
  requireAuth,
  requirePermission,
  requireStaff,
  requireRole,
} = require('../../src/middleware/auth');

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

/** Express-style middleware runner */
function runChain(middlewares, req) {
  return new Promise((resolve) => {
    const res = mockRes();
    let settled = false;
    const settle = (nextReached) => {
      if (settled) return;
      settled = true;
      resolve({
        status: res.statusCode,
        body: res.body,
        user: req.user,
        nextReached,
      });
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

function reqWithToken(token) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

function tokenFor(role, username = role) {
  return auth.signJwt({
    sub: `id-${username}`,
    username,
    role,
  });
}

describe('RBAC middleware integration (JWT pipeline)', () => {
  let adminToken;
  let donorToken;
  let regionalToken;
  let seekerToken;

  before(() => {
    adminToken = tokenFor('superadmin', 'admin');
    donorToken = tokenFor('donor', 'donor1');
    regionalToken = tokenFor('regional_admin', 'reg1');
    seekerToken = tokenFor('seeker', 'seeker1');
  });

  it('unauthenticated request blocked by requireAuth', async () => {
    const out = await runChain([requireAuth, requirePermission('notify:send')], reqWithToken(null));
    assert.equal(out.status, 401);
    assert.equal(out.nextReached, false);
  });

  it('invalid token blocked', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:send')],
      reqWithToken('not.a.jwt')
    );
    assert.equal(out.status, 401);
    assert.equal(out.nextReached, false);
  });

  it('donor JWT passes auth but fails notify:send', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:send')],
      reqWithToken(donorToken)
    );
    assert.ok(out.user);
    assert.equal(out.user.role, 'donor');
    assert.equal(out.status, 403);
    assert.equal(out.body.permission, 'notify:send');
    assert.equal(out.nextReached, false);
  });

  it('regional_admin JWT passes notify:send chain', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:send')],
      reqWithToken(regionalToken)
    );
    assert.equal(out.user.role, 'regional_admin');
    assert.equal(out.nextReached, true);
    assert.equal(out.status, 200);
  });

  it('superadmin passes notify:events', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:events')],
      reqWithToken(adminToken)
    );
    assert.equal(out.nextReached, true);
  });

  it('seeker cannot donations:create', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('donations:create')],
      reqWithToken(seekerToken)
    );
    assert.equal(out.status, 403);
  });

  it('donor can donations:create', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('donations:create')],
      reqWithToken(donorToken)
    );
    assert.equal(out.nextReached, true);
  });

  it('requireStaff blocks donor after auth', async () => {
    const out = await runChain([requireAuth, requireStaff], reqWithToken(donorToken));
    assert.equal(out.status, 403);
    assert.equal(out.body.reason, 'staff_only');
  });

  it('requireStaff allows regional_admin', async () => {
    const out = await runChain([requireAuth, requireStaff], reqWithToken(regionalToken));
    assert.equal(out.nextReached, true);
  });

  it('requireRole restricts to listed roles', async () => {
    const chain = [requireAuth, requireRole('donor', 'corporate_csr')];
    const ok = await runChain(chain, reqWithToken(donorToken));
    assert.equal(ok.nextReached, true);
    const bad = await runChain(chain, reqWithToken(seekerToken));
    assert.equal(bad.status, 403);
  });

  it('admin alias in JWT normalizes for admin:users', async () => {
    const tok = tokenFor('admin', 'legacy-admin');
    const out = await runChain(
      [requireAuth, requirePermission('admin:users')],
      reqWithToken(tok)
    );
    assert.equal(out.user.role, 'superadmin');
    assert.equal(out.nextReached, true);
  });
});

describe('Device register auth gate', () => {
  it('register pipeline requires auth', async () => {
    const out = await runChain([requireAuth], reqWithToken(null));
    assert.equal(out.status, 401);
  });

  it('authenticated donor passes register auth gate', async () => {
    const tok = tokenFor('donor', 'd2');
    const out = await runChain([requireAuth], reqWithToken(tok));
    assert.equal(out.nextReached, true);
    assert.equal(out.user.sub, 'id-d2');
  });
});

describe('Notifications route middleware stack (integration)', () => {
  const notifyStack = [requireAuth, requirePermission('notify:send')];
  const eventsStack = [requireAuth, requirePermission('notify:events')];

  it('matrix: role × notify:send', async () => {
    const cases = [
      ['superadmin', true],
      ['regional_admin', true],
      ['donor', false],
      ['seeker', false],
      ['auditor', false],
      ['verification_officer', false],
    ];
    for (const [role, allow] of cases) {
      const out = await runChain(notifyStack, reqWithToken(tokenFor(role)));
      assert.equal(out.nextReached, allow, `${role} expected allow=${allow}`);
      if (!allow) assert.equal(out.status, 403);
    }
  });

  it('matrix: role × notify:events', async () => {
    const outDonor = await runChain(eventsStack, reqWithToken(tokenFor('donor')));
    assert.equal(outDonor.nextReached, false);
    const outReg = await runChain(eventsStack, reqWithToken(tokenFor('regional_admin')));
    assert.equal(outReg.nextReached, true);
  });
});
