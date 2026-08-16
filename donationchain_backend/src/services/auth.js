/**
 * Server-side admin auth: scrypt password hash + HMAC-SHA256 JWT (no external deps).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'admin-users.json');

const JWT_SECRET = process.env.JWT_SECRET || 'donationchain-dev-secret-change-me';
const JWT_ISSUER = 'donationchain';
const ACCESS_TTL_SEC = Number(process.env.JWT_TTL_SEC || 2 * 60 * 60); // 2h
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

const DEFAULT_ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  // Will be hashed on first boot if file missing
  password: process.env.ADMIN_PASSWORD || 'Admin@DC2026',
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function fromB64url(str) {
  const pad = 4 - (str.length % 4 || 4);
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad === 4 ? 0 : pad);
  return Buffer.from(s, 'base64');
}

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), s, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return {
    salt: s.toString('hex'),
    hash: hash.toString('hex'),
  };
}

function verifyPassword(password, saltHex, hashHex) {
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  const expected = Buffer.from(hashHex, 'hex');
  if (hash.length !== expected.length) return false;
  return crypto.timingSafeEqual(hash, expected);
}

function loadUsers() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    const { salt, hash } = hashPassword(DEFAULT_ADMIN.password);
    const users = [
      {
        id: 'admin-1',
        username: DEFAULT_ADMIN.username,
        role: 'superadmin',
        salt,
        hash,
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return users;
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function findUser(username) {
  return loadUsers().find((u) => u.username === username);
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iss: JWT_ISSUER,
    iat: now,
    exp: now + ACCESS_TTL_SEC,
  };
  const h = b64urlJson(header);
  const p = b64urlJson(body);
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function verifyJwt(token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'missing_token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed' };
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest();
  let got;
  try {
    got = fromB64url(s);
  } catch {
    return { ok: false, error: 'bad_signature' };
  }
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
    return { ok: false, error: 'invalid_signature' };
  }
  let payload;
  try {
    payload = JSON.parse(fromB64url(p).toString('utf8'));
  } catch {
    return { ok: false, error: 'bad_payload' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return { ok: false, error: 'expired' };
  if (payload.iss && payload.iss !== JWT_ISSUER) return { ok: false, error: 'bad_issuer' };
  return { ok: true, payload };
}

function login(username, password) {
  const user = findUser(String(username || '').trim());
  if (!user) return { ok: false, error: 'Invalid credentials', status: 401 };
  if (!verifyPassword(password, user.salt, user.hash)) {
    return { ok: false, error: 'Invalid credentials', status: 401 };
  }
  const token = signJwt({
    sub: user.id,
    username: user.username,
    role: user.role || 'admin',
  });
  return {
    ok: true,
    token,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL_SEC,
    user: { id: user.id, username: user.username, role: user.role || 'admin' },
  };
}

function changePassword(username, currentPassword, newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    return { ok: false, error: 'New password must be at least 8 characters', status: 400 };
  }
  const users = loadUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx < 0) return { ok: false, error: 'User not found', status: 404 };
  const user = users[idx];
  if (!verifyPassword(currentPassword, user.salt, user.hash)) {
    return { ok: false, error: 'Current password incorrect', status: 401 };
  }
  const { salt, hash } = hashPassword(newPassword);
  users[idx] = { ...user, salt, hash, updatedAt: new Date().toISOString() };
  saveUsers(users);
  return { ok: true };
}

function extractBearer(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (typeof h === 'string' && h.toLowerCase().startsWith('bearer ')) {
    return h.slice(7).trim();
  }
  return null;
}

module.exports = {
  login,
  changePassword,
  signJwt,
  verifyJwt,
  extractBearer,
  loadUsers,
  hashPassword,
  ACCESS_TTL_SEC,
};
