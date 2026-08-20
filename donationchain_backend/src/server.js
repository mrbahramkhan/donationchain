/**
 * DonationChain backend entry — starts HTTP server.
 */
const { createApp } = require('./app');
const { initFirebase } = require('./services/fcm');

const PORT = process.env.PORT || 4000;
const app = createApp();

initFirebase();
app.listen(PORT, () => {
  console.log(`DonationChain backend listening on http://localhost:${PORT}`);
  console.log(`  Health:        GET  /health`);
  console.log(`  Send:          POST /api/notifications/send`);
  console.log(`  Multicast:     POST /api/notifications/multicast`);
  console.log(`  Topic:         POST /api/notifications/topic`);
  console.log(`  Events:        POST /api/notifications/events/*`);
  console.log(`  Auth login:    POST /api/auth/login`);
  console.log(`  SMS send:      POST /api/sms/send`);
  console.log(`  Auth me:       GET  /api/auth/me`);
  console.log(`  Register device: POST /api/devices/register`);
  console.log(`  Cases list:    GET  /api/cases`);
  console.log(`  Seeker apply:  POST /api/cases/apply`);
  console.log(`  Zakat config:  GET  /api/zakat/config`);
  console.log(`  Zakat calc:    POST /api/zakat/calculate`);
  console.log(`  Organizations: GET  /api/organizations`);
  console.log(`  Payments:      POST /api/payments/initiate`);
  console.log(`  Pay status:    GET  /api/payments/:id/status`);
  console.log(`  Pay SSE:       GET  /api/payments/stream/:id`);
  console.log(`  Raast webhook: POST /api/payments/webhook/raast`);
});
