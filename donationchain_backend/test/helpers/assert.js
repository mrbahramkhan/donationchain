/**
 * Clearer assertion helpers for DonationChain tests.
 * Wraps node:assert/strict with role/permission-oriented messages.
 */
'use strict';

const assert = require('node:assert/strict');

function eq(actual, expected, label) {
  assert.equal(
    actual,
    expected,
    label ? `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` : undefined
  );
}

function isTrue(value, label) {
  assert.equal(value, true, label ? `${label}: expected true` : undefined);
}

function isFalse(value, label) {
  assert.equal(value, false, label ? `${label}: expected false` : undefined);
}

/** hasPermission(role, perm) must be allowed / denied */
function permission(role, perm, allowed) {
  const { hasPermission } = require('../../src/rbac');
  const actual = hasPermission(role, perm);
  assert.equal(
    actual,
    allowed,
    `hasPermission(${JSON.stringify(role)}, ${JSON.stringify(perm)}) expected ${allowed}, got ${actual}`
  );
}

/** Middleware chain outcome */
function chainOutcome(out, { status, nextReached, role, permission }) {
  if (status !== undefined) {
    eq(out.status, status, 'HTTP status');
  }
  if (nextReached !== undefined) {
    eq(out.nextReached, nextReached, nextReached ? 'middleware should call next()' : 'middleware should block');
  }
  if (role !== undefined) {
    assert.ok(out.user, 'req.user should be set after requireAuth');
    eq(out.user.role, role, 'JWT role on req.user');
  }
  if (permission !== undefined && out.body) {
    eq(out.body.permission, permission, '403 body.permission');
  }
}

function deniesWith(out, status, reasonHint) {
  eq(out.nextReached, false, 'request must be denied');
  eq(out.status, status, `deny status ${status}`);
  if (reasonHint && out.body) {
    const blob = JSON.stringify(out.body);
    assert.ok(
      blob.includes(reasonHint),
      `response body should mention ${JSON.stringify(reasonHint)}, got ${blob}`
    );
  }
}

function allows(out) {
  eq(out.nextReached, true, 'request must be allowed (next called)');
  assert.ok(out.status === 200 || out.status === undefined || out.body == null, 'allowed chain should not send error body');
}

module.exports = {
  eq,
  isTrue,
  isFalse,
  permission,
  chainOutcome,
  deniesWith,
  allows,
  raw: assert,
};
