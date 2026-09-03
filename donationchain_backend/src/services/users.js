/**
 * Public users (donor / seeker) — phone-keyed, file-backed.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DONATIONCHAIN_DATA_DIR
  ? path.resolve(process.env.DONATIONCHAIN_DATA_DIR)
  : path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers() {
  ensureDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  ensureDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function normalizePhone(phone) {
  let s = String(phone || '').replace(/[\s\-()]/g, '');
  if (/^03\d{9}$/.test(s)) s = '+92' + s.slice(1);
  if (/^3\d{9}$/.test(s)) s = '+92' + s;
  if (/^92\d{10}$/.test(s)) s = '+' + s;
  if (!s.startsWith('+') && /^\d{10,15}$/.test(s)) s = '+' + s;
  return s;
}

function isValidPhone(phone) {
  const p = normalizePhone(phone);
  return /^\+\d{10,15}$/.test(p);
}

function findByPhone(phone) {
  const p = normalizePhone(phone);
  return loadUsers().find((u) => u.phone === p) || null;
}

function findById(id) {
  return loadUsers().find((u) => u.id === id) || null;
}

function createUser({ phone, name, role, email, city, country }) {
  const p = normalizePhone(phone);
  const existing = findByPhone(p);
  if (existing) {
    return { ok: false, error: 'User already exists', user: existing, status: 409 };
  }
  const r = String(role || 'donor').toLowerCase();
  if (!['donor', 'seeker', 'needy'].includes(r)) {
    return { ok: false, error: 'Invalid role', status: 400 };
  }
  const roleNorm = r === 'needy' ? 'seeker' : r;
  const users = loadUsers();
  const user = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    phone: p,
    name: String(name || '').trim() || (roleNorm === 'donor' ? 'Donor' : 'Seeker'),
    role: roleNorm,
    email: email ? String(email).trim() : null,
    city: city || null,
    country: country || 'PK',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

function upsertOnLogin({ phone, name, role }) {
  const p = normalizePhone(phone);
  const users = loadUsers();
  const idx = users.findIndex((u) => u.phone === p);
  const r = String(role || 'donor').toLowerCase();
  const roleNorm = r === 'needy' ? 'seeker' : r === 'seeker' ? 'seeker' : 'donor';
  if (idx >= 0) {
    const u = users[idx];
    if (name && String(name).trim()) u.name = String(name).trim();
    // keep existing role unless explicitly switching via role param and user was generic
    if (role && !u.role) u.role = roleNorm;
    u.lastLoginAt = new Date().toISOString();
    u.updatedAt = u.lastLoginAt;
    users[idx] = u;
    saveUsers(users);
    return { ok: true, user: u, created: false };
  }
  const created = createUser({ phone: p, name, role: roleNorm });
  if (!created.ok) return created;
  const u = created.user;
  u.lastLoginAt = new Date().toISOString();
  const all = loadUsers();
  const i = all.findIndex((x) => x.id === u.id);
  if (i >= 0) {
    all[i] = u;
    saveUsers(all);
  }
  return { ok: true, user: u, created: true };
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    email: u.email,
    city: u.city,
    country: u.country,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

module.exports = {
  loadUsers,
  findByPhone,
  findById,
  createUser,
  upsertOnLogin,
  normalizePhone,
  isValidPhone,
  publicUser,
};
