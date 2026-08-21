const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const deviceTokens = require('../../src/services/deviceTokens');

describe('deviceTokens registry', () => {
  beforeEach(() => deviceTokens.clear());

  it('registers token bound to user', () => {
    const r = deviceTokens.register('user_1', 'token-aaa');
    assert.equal(r.ok, true);
    assert.deepEqual(deviceTokens.getTokens('user_1'), ['token-aaa']);
    assert.equal(deviceTokens.getUserForToken('token-aaa'), 'user_1');
  });

  it('moves token when re-registered to another user', () => {
    deviceTokens.register('user_1', 'shared-token');
    deviceTokens.register('user_2', 'shared-token');
    assert.deepEqual(deviceTokens.getTokens('user_1'), []);
    assert.deepEqual(deviceTokens.getTokens('user_2'), ['shared-token']);
  });

  it('caps tokens per user', () => {
    for (let i = 0; i < 15; i++) {
      deviceTokens.register('u', `tok-${i}`);
    }
    assert.ok(deviceTokens.getTokens('u').length <= deviceTokens.MAX_TOKENS_PER_USER);
  });

  it('unregister and removeToken', () => {
    deviceTokens.register('u', 't1');
    deviceTokens.unregister('u', 't1');
    assert.deepEqual(deviceTokens.getTokens('u'), []);
    deviceTokens.register('u', 't2');
    deviceTokens.removeToken('t2');
    assert.equal(deviceTokens.getUserForToken('t2'), null);
  });
});
