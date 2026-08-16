/**
 * Zero-dependency DonationChain backend (Node built-ins only)
 * FCM runs in MOCK mode unless FIREBASE_SERVICE_ACCOUNT env JSON is set.
 */
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
let ledger;
try { ledger = require('./services/ledger'); } catch (_) { ledger = null; }
let merkle;
try { merkle = require('./services/merkle'); } catch (_) { merkle = null; }

const PORT = process.env.PORT || 4000;
const tokenStore = new Map();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

async function mockSend(payload) {
  console.log('[FCM MOCK]', JSON.stringify(payload));
  return { success: true, mock: true, messageId: 'mock-' + Date.now() };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  try {
    if (req.method === 'GET' && p === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'donationchain-backend-lite',
        mode: 'mock',
        time: new Date().toISOString(),
      });
    }

    if (req.method === 'POST' && p === '/api/devices/register') {
      const body = await readBody(req);
      if (!body.userId || !body.token) return json(res, 400, { error: 'userId and token required' });
      tokenStore.set(String(body.userId), body.token);
      return json(res, 200, { success: true, registered: tokenStore.size });
    }

    if (req.method === 'GET' && p.startsWith('/api/devices/')) {
      const userId = p.split('/').pop();
      const token = tokenStore.get(userId);
      if (!token) return json(res, 404, { error: 'not found' });
      return json(res, 200, { userId, token });
    }

    if (req.method === 'POST' && p.startsWith('/api/notifications/')) {
      const body = await readBody(req);
      const result = await mockSend({ path: p, ...body });
      return json(res, 200, result);
    }

    
    if (ledger && req.method === 'GET' && p === '/api/ledger') {
      const chain = ledger.getChain();
      const check = ledger.verifyChain(chain);
      return json(res, 200, { ...check, blocks: chain.length, tip: chain[chain.length - 1]?.hash });
    }
    if (ledger && req.method === 'GET' && p.startsWith('/api/ledger/verify/')) {
      const id = p.split('/').pop();
      const check = ledger.verifyChain();
      const block = ledger.findByReceipt(id);
      if (!block) return json(res, 404, { found: false, chainValid: check.valid, error: 'not found' });
      return json(res, 200, { found: true, chainValid: check.valid, block });
    }
    if (ledger && req.method === 'POST' && p === '/api/ledger/anchor') {
      const body = await readBody(req);
      const block = ledger.appendDonation(body);
      return json(res, 201, { success: true, block });
    }

    
    if (merkle && req.method === 'GET' && p === '/api/merkle/batches') {
      const batches = merkle.loadBatches().map((b) => ({
        id: b.id, label: b.label, root: b.root, leafCount: b.leafCount, createdAt: b.createdAt,
      }));
      return json(res, 200, { batches });
    }
    if (merkle && req.method === 'GET' && p.startsWith('/api/merkle/proof/')) {
      const id = decodeURIComponent(p.split('/').pop());
      const result = merkle.proofForReceipt(id);
      if (!result.found) return json(res, 404, result);
      return json(res, 200, result);
    }
    if (merkle && req.method === 'POST' && p === '/api/merkle/batch') {
      const body = await readBody(req);
      if (!Array.isArray(body.records) || !body.records.length) {
        return json(res, 400, { error: 'records[] required' });
      }
      const batch = merkle.createBatch(body.records, body.label);
      return json(res, 201, { success: true, batchId: batch.id, root: batch.root, leafCount: batch.leafCount });
    }
    if (merkle && req.method === 'POST' && p === '/api/merkle/verify') {
      const body = await readBody(req);
      if (!body.leaf || !body.proof || !body.root) return json(res, 400, { error: 'leaf, proof, root required' });
      return json(res, 200, { valid: merkle.verifyProof(body.leaf, body.proof, body.root) });
    }

    return json(res, 404, { error: 'not found', path: p });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`DonationChain lite backend on http://localhost:${PORT}`);
  console.log('  GET  /health');
  console.log('  POST /api/notifications/*  (mock FCM)');
  console.log('  POST /api/devices/register');
});
