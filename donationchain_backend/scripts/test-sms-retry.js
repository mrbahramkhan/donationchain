/**
 * Unit-style checks for 20429 / 429 retry helpers (no network).
 * Run: node scripts/test-sms-retry.js
 */
const { isRateLimited, retryAfterMs } = require("../src/services/sms");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log("OK:", msg);
}

// Rate limit detection
assert(isRateLimited({ status: 429 }, {}), "HTTP 429 is rate limited");
assert(isRateLimited({ status: 400 }, { code: 20429 }), "Twilio code 20429");
assert(isRateLimited({ status: 400 }, { error_code: 20429 }), "error_code 20429");
assert(!isRateLimited({ status: 400 }, { code: 21211 }), "21211 is NOT rate limited");
assert(!isRateLimited({ status: 401 }, { code: 20003 }), "20003 is NOT rate limited");

// Backoff growth
const a0 = retryAfterMs(null, null, 0);
const a1 = retryAfterMs(null, null, 1);
const a2 = retryAfterMs(null, null, 2);
assert(a0 >= 1000 && a0 < 2000, "attempt 0 ~1s (+jitter)");
assert(a1 >= 2000 && a1 < 3000, "attempt 1 ~2s");
assert(a2 >= 4000 && a2 < 5000, "attempt 2 ~4s");

// Retry-After header
const fakeRes = { headers: { get: (k) => (k === "retry-after" ? "5" : null) } };
assert(retryAfterMs(fakeRes, null, 0) === 5000, "Retry-After 5s honored");

console.log("\nAll SMS retry helper tests passed.");
