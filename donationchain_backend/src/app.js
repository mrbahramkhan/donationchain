/**
 * Express app factory — importable by tests without listening.
 * server.js requires this and calls listen().
 */
try {
  require('dotenv').config();
} catch (_) {
  // optional when env already injected (CI/test)
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const notificationsRouter = require('./routes/notifications');
const ledgerRouter = require('./routes/ledger');
const merkleRouter = require('./routes/merkle');
const authRouter = require('./routes/auth');
const smsRouter = require('./routes/sms');
const casesRouter = require('./routes/cases');
const zakatRouter = require('./routes/zakat');
const organizationsRouter = require('./routes/organizations');
const shariahRouter = require('./routes/shariah');
const billsRouter = require('./routes/bills');
const paymentsRouter = require('./routes/payments');
const devicesRouter = require('./routes/devices');
const { healthPayload } = require('./health');


function createApp(options = {}) {
  const app = express();
  const quiet = options.quiet === true;

  app.use(helmet());
  app.use(cors({ origin: true }));
  // Preserve raw body for Raast webhook HMAC verification
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        if (req.originalUrl && req.originalUrl.indexOf('/api/payments/webhook/') === 0) {
          req.rawBody = buf;
        }
      },
    })
  );
  if (!quiet) {
    app.use(morgan('dev'));
  }

  // Health
  app.get('/health', (_req, res) => {
    res.json(healthPayload());
  });

  app.use('/api/auth', authRouter);
  app.use('/api/sms', smsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/ledger', ledgerRouter);
  app.use('/api/merkle', merkleRouter);
  app.use('/api/cases', casesRouter);
  app.use('/api/zakat', zakatRouter);
  app.use('/api/organizations', organizationsRouter);
  app.use('/api/shariah', shariahRouter);
  app.use('/api/bills', billsRouter);
  app.use('/api/payments', paymentsRouter);

  // Device FCM tokens — JWT-bound (see routes/devices.js)
  app.use('/api/devices', devicesRouter);

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'not found' }));

  return app;
}

module.exports = { createApp, healthPayload };
