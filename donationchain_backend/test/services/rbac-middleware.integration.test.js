/**
 * RBAC middleware integration — real JWT + requireAuth → permission chain.
 */
const { describe, it, before } = require('node:test');
const auth = require('../../src/services/auth');
const {
  requireAuth,
  requirePermission,
  requireStaff,
  requireRole,
} = require('../../src/middleware/auth');
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
  return { headers: token ? { authorization: `Bearer ${token}` } : {} };
}

function tokenFor(role, username = role) {
  return auth.signJwt({ sub: `id-${username}`, username, role });
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

  it('blocks request with no Authorization header', async () => {
    const out = await runChain([requireAuth, requirePermission('notify:send')], reqWithToken(null));
    A.deniesWith(out, 401, 'Unauthorized');
  });

  it('blocks malformed JWT', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:send')],
      reqWithToken('not.a.jwt')
    );
    A.deniesWith(out, 401, 'Unauthorized');
  });

  it('authenticates donor then denies notify:send', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:send')],
      reqWithToken(donorToken)
    );
    A.chainOutcome(out, {
      status: 403,
      nextReached: false,
      role: 'donor',
      permission: 'notify:send',
    });
  });

  it('allows regional_admin through notify:send', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:send')],
      reqWithToken(regionalToken)
    );
    A.chainOutcome(out, { nextReached: true, role: 'regional_admin' });
    A.allows(out);
  });

  it('allows superadmin through notify:events', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('notify:events')],
      reqWithToken(adminToken)
    );
    A.allows(out);
  });

  it('denies seeker donations:create', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('donations:create')],
      reqWithToken(seekerToken)
    );
    A.deniesWith(out, 403, 'donations:create');
  });

  it('allows donor donations:create', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('donations:create')],
      reqWithToken(donorToken)
    );
    A.allows(out);
  });

  it('requireStaff rejects donor with staff_only', async () => {
    const out = await runChain([requireAuth, requireStaff], reqWithToken(donorToken));
    A.deniesWith(out, 403, 'staff_only');
  });

  it('requireStaff accepts regional_admin', async () => {
    const out = await runChain([requireAuth, requireStaff], reqWithToken(regionalToken));
    A.allows(out);
  });

  it('requireRole allows donor and rejects seeker', async () => {
    const chain = [requireAuth, requireRole('donor', 'corporate_csr')];
    A.allows(await runChain(chain, reqWithToken(donorToken)));
    A.deniesWith(await runChain(chain, reqWithToken(seekerToken)), 403, 'Forbidden');
  });

  it('normalizes JWT role admin → superadmin for admin:users', async () => {
    const out = await runChain(
      [requireAuth, requirePermission('admin:users')],
      reqWithToken(tokenFor('admin', 'legacy-admin'))
    );
    A.chainOutcome(out, { nextReached: true, role: 'superadmin' });
  });
});

describe('Device register auth gate', () => {
  it('requires JWT', async () => {
    A.deniesWith(await runChain([requireAuth], reqWithToken(null)), 401, 'Unauthorized');
  });

  it('accepts donor JWT and exposes sub', async () => {
    const out = await runChain([requireAuth], reqWithToken(tokenFor('donor', 'd2')));
    A.allows(out);
    A.eq(out.user.sub, 'id-d2', 'JWT sub');
  });
});

describe('Notifications route middleware stack', () => {
  const notifyStack = [requireAuth, requirePermission('notify:send')];
  const eventsStack = [requireAuth, requirePermission('notify:events')];

  it('role × notify:send matrix', async () => {
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
      A.eq(out.nextReached, allow, `notify:send as ${role}`);
      if (!allow) A.eq(out.status, 403, `${role} status`);
    }
  });

  it('role × notify:events matrix', async () => {
    A.eq(
      (await runChain(eventsStack, reqWithToken(tokenFor('donor')))).nextReached,
      false,
      'donor notify:events'
    );
    A.eq(
      (await runChain(eventsStack, reqWithToken(tokenFor('regional_admin')))).nextReached,
      true,
      'regional_admin notify:events'
    );
  });
});
