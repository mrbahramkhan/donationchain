/**
 * Unit tests — health endpoint
 * Pure tests always run (src/health.js — zero deps).
 * HTTP integration runs when Express stack is available.
 *
 * Run: npm test
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { healthPayload } = require('../src/health');

describe('healthPayload()', () => {
  it('returns ok: true', () => {
    assert.equal(healthPayload().ok, true);
  });

  it('returns service donationchain-backend', () => {
    assert.equal(healthPayload().service, 'donationchain-backend');
  });

  it('returns non-empty fcm path string', () => {
    const body = healthPayload();
    assert.equal(typeof body.fcm, 'string');
    assert.ok(body.fcm.length > 0);
  });

  it('returns valid ISO time within last 60s', () => {
    const body = healthPayload();
    assert.equal(typeof body.time, 'string');
    const parsed = Date.parse(body.time);
    assert.ok(!Number.isNaN(parsed), 'time must be parseable ISO');
    assert.ok(Date.now() - parsed < 60_000);
  });

  it('respects GOOGLE_APPLICATION_CREDENTIALS env', () => {
    const prev = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/fake-sa.json';
    try {
      assert.equal(healthPayload().fcm, '/tmp/fake-sa.json');
    } finally {
      if (prev === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      else process.env.GOOGLE_APPLICATION_CREDENTIALS = prev;
    }
  });

  it('defaults fcm path when env unset', () => {
    const prev = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    try {
      assert.equal(healthPayload().fcm, 'config/serviceAccountKey.json');
    } finally {
      if (prev !== undefined) process.env.GOOGLE_APPLICATION_CREDENTIALS = prev;
    }
  });
});

describe('GET /health (HTTP)', () => {
  let server;
  let baseUrl;
  let available = false;

  before(async () => {
    try {
      const http = require('node:http');
      const { createApp } = require('../src/app');
      const app = createApp({ quiet: true });
      server = http.createServer(app);
      await new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
      });
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      available = true;
    } catch (err) {
      console.log('Skipping HTTP tests —', err.message);
    }
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  async function get(path) {
    const res = await fetch(`${baseUrl}${path}`);
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: res.status, headers: res.headers, body };
  }

  it('returns 200 with ok:true JSON', async (t) => {
    if (!available) return t.skip('express stack unavailable');
    const { status, body, headers } = await get('/health');
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'donationchain-backend');
    assert.match(headers.get('content-type') || '', /application\/json/);
  });

  it('unknown route returns 404 JSON', async (t) => {
    if (!available) return t.skip('express stack unavailable');
    const { status, body } = await get('/no-such-route');
    assert.equal(status, 404);
    assert.equal(body.error, 'not found');
  });
});
