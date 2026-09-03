const express = require('express');
const auth = require('../services/auth');
const otp = require('../services/otp');
const users = require('../services/users');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// In-memory rate limit (per IP) — login + OTP
const attempts = new Map();
const MAX = 8;
const WINDOW_MS = 15 * 60 * 1000;

function rateLimit(ip) {
  const now = Date.now();
  let a = attempts.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > a.reset) a = { count: 0, reset: now + WINDOW_MS };
  a.count += 1;
  attempts.set(ip, a);
  if (a.count > MAX) return { limited: true, retryAfter: Math.ceil((a.reset - now) / 1000) };
  return { limited: false };
}

function clientIp(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/** Admin username/password login (staff) */
router.post('/login', (req, res) => {
  const ip = clientIp(req);
  const rl = rateLimit(ip);
  if (rl.limited) {
    return res.status(429).json({ error: 'Too many attempts', retryAfter: rl.retryAfter });
  }
  const { username, password } = req.body || {};
  const result = auth.login(username || 'admin', password);
  if (!result.ok) return res.status(result.status || 401).json({ error: result.error });
  attempts.delete(ip);
  res.json(result);
});

/**
 * Public user: request phone OTP
 * body: { phone, role?: "donor"|"seeker"|"needy" }
 */
router.post('/otp/request', (req, res) => {
  const ip = clientIp(req);
  const rl = rateLimit(ip);
  if (rl.limited) {
    return res.status(429).json({ error: 'Too many attempts', retryAfter: rl.retryAfter });
  }
  const { phone, role } = req.body || {};
  const result = otp.requestOtp(phone, role);
  if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
  res.json(result);
});

/**
 * Public user: verify OTP → JWT + user profile
 * body: { phone, code, role?, name? }
 */
router.post('/otp/verify', (req, res) => {
  const ip = clientIp(req);
  const rl = rateLimit(ip);
  if (rl.limited) {
    return res.status(429).json({ error: 'Too many attempts', retryAfter: rl.retryAfter });
  }
  const { phone, code, role, name } = req.body || {};
  const checked = otp.verifyOtp(phone, code);
  if (!checked.ok) return res.status(checked.status || 401).json({ error: checked.error });

  const preferredRole = role || checked.role || 'donor';
  const up = users.upsertOnLogin({
    phone: checked.phone,
    name: name || undefined,
    role: preferredRole,
  });
  if (!up.ok) return res.status(up.status || 400).json({ error: up.error });

  const u = up.user;
  const token = auth.signJwt({
    sub: u.id,
    phone: u.phone,
    username: u.phone,
    name: u.name,
    role: u.role,
  });
  attempts.delete(ip);
  res.json({
    ok: true,
    token,
    tokenType: 'Bearer',
    expiresIn: auth.ACCESS_TTL_SEC,
    user: users.publicUser(u),
    created: up.created,
  });
});

/**
 * Register donor/seeker profile (optional fields) — requires prior session or creates after OTP verify preferred.
 * body: { phone, code, name, role, email?, city?, country? }
 */
router.post('/register', (req, res) => {
  const ip = clientIp(req);
  const rl = rateLimit(ip);
  if (rl.limited) {
    return res.status(429).json({ error: 'Too many attempts', retryAfter: rl.retryAfter });
  }
  const { phone, code, name, role, email, city, country } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const checked = otp.verifyOtp(phone, code);
  if (!checked.ok) return res.status(checked.status || 401).json({ error: checked.error });

  const existing = users.findByPhone(checked.phone);
  if (existing) {
    const token = auth.signJwt({
      sub: existing.id,
      phone: existing.phone,
      username: existing.phone,
      name: existing.name,
      role: existing.role,
    });
    return res.json({
      ok: true,
      token,
      tokenType: 'Bearer',
      expiresIn: auth.ACCESS_TTL_SEC,
      user: users.publicUser(existing),
      created: false,
      message: 'Already registered — logged in',
    });
  }

  const created = users.createUser({
    phone: checked.phone,
    name,
    role: role || checked.role,
    email,
    city,
    country,
  });
  if (!created.ok) return res.status(created.status || 400).json({ error: created.error });

  const u = created.user;
  u.lastLoginAt = new Date().toISOString();
  const token = auth.signJwt({
    sub: u.id,
    phone: u.phone,
    username: u.phone,
    name: u.name,
    role: u.role,
  });
  attempts.delete(ip);
  res.status(201).json({
    ok: true,
    token,
    tokenType: 'Bearer',
    expiresIn: auth.ACCESS_TTL_SEC,
    user: users.publicUser(u),
    created: true,
  });
});

router.get('/me', requireAuth, (req, res) => {
  const { hasPermission, isStaffRole } = require('../rbac');
  const role = req.user.role;
  // Prefer DB profile for public users
  let profile = null;
  if (req.user.sub && String(req.user.sub).startsWith('usr_')) {
    profile = users.publicUser(users.findById(req.user.sub));
  } else if (req.user.phone) {
    profile = users.publicUser(users.findByPhone(req.user.phone));
  }

  res.json({
    user: profile || {
      id: req.user.sub,
      username: req.user.username,
      phone: req.user.phone,
      name: req.user.name,
      role: role,
      isStaff: isStaffRole(role),
    },
    permissions: {
      'cases:applications_admin': hasPermission(role, 'cases:applications_admin'),
      'cases:zakat_eligibility': hasPermission(role, 'cases:zakat_eligibility'),
      'admin:dashboard': hasPermission(role, 'admin:dashboard'),
      'admin:config': hasPermission(role, 'admin:config'),
      'audit:read': hasPermission(role, 'audit:read'),
    },
    exp: req.user.exp,
  });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!req.user.username || String(req.user.sub || '').startsWith('usr_')) {
    return res.status(400).json({ error: 'Password change is for staff accounts only' });
  }
  const result = auth.changePassword(req.user.username, currentPassword, newPassword);
  if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
  res.json({ success: true });
});

router.post('/logout', requireAuth, (_req, res) => {
  res.json({ success: true });
});

module.exports = router;
