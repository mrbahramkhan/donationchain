require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const notificationsRouter = require('./routes/notifications');
const ledgerRouter = require('./routes/ledger');
const merkleRouter = require('./routes/merkle');
const { initFirebase } = require('./services/fcm');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Health
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'donationchain-backend',
    fcm: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'config/serviceAccountKey.json',
    time: new Date().toISOString(),
  });
});

// FCM + domain events
app.use('/api/notifications', notificationsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/merkle', merkleRouter);

// Simple in-memory token registry (demo — replace with DB)
const tokenStore = new Map(); // userId -> token

app.post('/api/devices/register', (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token required' });
  }
  tokenStore.set(String(userId), token);
  res.json({ success: true, registered: tokenStore.size });
});

app.get('/api/devices/:userId', (req, res) => {
  const token = tokenStore.get(String(req.params.userId));
  if (!token) return res.status(404).json({ error: 'not found' });
  res.json({ userId: req.params.userId, token });
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'not found' }));

// Start
initFirebase();
app.listen(PORT, () => {
  console.log(`DonationChain backend listening on http://localhost:${PORT}`);
  console.log(`  Health:        GET  /health`);
  console.log(`  Send:          POST /api/notifications/send`);
  console.log(`  Multicast:     POST /api/notifications/multicast`);
  console.log(`  Topic:         POST /api/notifications/topic`);
  console.log(`  Events:        POST /api/notifications/events/*`);
  console.log(`  Register device: POST /api/devices/register`);
});
