/**
 * Pure health response builder — no Express dependency.
 * Used by app.js route and by unit tests.
 */
function healthPayload() {
  return {
    ok: true,
    service: 'donationchain-backend',
    fcm: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'config/serviceAccountKey.json',
    time: new Date().toISOString(),
  };
}

module.exports = { healthPayload };
