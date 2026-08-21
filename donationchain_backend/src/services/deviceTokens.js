/**
 * Device FCM token registry (in-memory demo — replace with DB).
 * Tokens are bound to authenticated user IDs; never trust client-supplied userId alone.
 */
'use strict';

/** userId -> Set of FCM tokens */
const byUser = new Map();
/** token -> userId (reverse index for cleanup) */
const byToken = new Map();

const MAX_TOKENS_PER_USER = 10;

function register(userId, token) {
  const uid = String(userId);
  const t = String(token).trim();
  if (!uid || !t) {
    return { ok: false, error: 'userId and token required' };
  }

  // If token was on another user, move it
  const prev = byToken.get(t);
  if (prev && prev !== uid) {
    const set = byUser.get(prev);
    if (set) {
      set.delete(t);
      if (!set.size) byUser.delete(prev);
    }
  }

  let set = byUser.get(uid);
  if (!set) {
    set = new Set();
    byUser.set(uid, set);
  }
  set.add(t);
  byToken.set(t, uid);

  // Cap tokens per user (drop oldest insertion order approx via Array)
  if (set.size > MAX_TOKENS_PER_USER) {
    const arr = [...set];
    const drop = arr.slice(0, arr.length - MAX_TOKENS_PER_USER);
    for (const old of drop) {
      set.delete(old);
      byToken.delete(old);
    }
  }

  return {
    ok: true,
    userId: uid,
    tokenCount: set.size,
    registered: byToken.size,
  };
}

function unregister(userId, token) {
  const uid = String(userId);
  const t = String(token).trim();
  const set = byUser.get(uid);
  if (set) {
    set.delete(t);
    if (!set.size) byUser.delete(uid);
  }
  if (byToken.get(t) === uid) byToken.delete(t);
  return { ok: true, userId: uid };
}

function unregisterAll(userId) {
  const uid = String(userId);
  const set = byUser.get(uid);
  if (set) {
    for (const t of set) byToken.delete(t);
    byUser.delete(uid);
  }
  return { ok: true, userId: uid };
}

function getTokens(userId) {
  const set = byUser.get(String(userId));
  return set ? [...set] : [];
}

function getUserForToken(token) {
  return byToken.get(String(token)) || null;
}

function removeToken(token) {
  const t = String(token);
  const uid = byToken.get(t);
  if (!uid) return { ok: false };
  const set = byUser.get(uid);
  if (set) {
    set.delete(t);
    if (!set.size) byUser.delete(uid);
  }
  byToken.delete(t);
  return { ok: true, userId: uid };
}

function stats() {
  return { users: byUser.size, tokens: byToken.size };
}

function clear() {
  byUser.clear();
  byToken.clear();
}

module.exports = {
  register,
  unregister,
  unregisterAll,
  getTokens,
  getUserForToken,
  removeToken,
  stats,
  clear,
  MAX_TOKENS_PER_USER,
};
