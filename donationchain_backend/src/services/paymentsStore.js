/**
 * In-memory payment store (demo). Replace with PostgreSQL in production.
 */
const payments = new Map(); // id -> payment
const byIdempotency = new Map();

function save(payment) {
  payments.set(payment.id, payment);
  if (payment.idempotencyKey) byIdempotency.set(payment.idempotencyKey, payment.id);
  return payment;
}

function get(id) {
  return payments.get(id) || null;
}

function getByIdempotency(key) {
  const id = byIdempotency.get(key);
  return id ? payments.get(id) : null;
}

function list(limit = 50) {
  return Array.from(payments.values())
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

function update(id, patch) {
  const p = payments.get(id);
  if (!p) return null;
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  payments.set(id, p);
  return p;
}

module.exports = { save, get, getByIdempotency, list, update };
