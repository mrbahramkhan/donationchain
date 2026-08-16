const express = require('express');
const merkle = require('../services/merkle');

const router = express.Router();

/** POST /api/merkle/batch — body: { records: [...], label? } */
router.post('/batch', (req, res) => {
  try {
    const records = req.body?.records;
    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ error: 'records[] required' });
    }
    const batch = merkle.createBatch(records, req.body.label);
    res.status(201).json({
      success: true,
      batchId: batch.id,
      root: batch.root,
      leafCount: batch.leafCount,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/merkle/proof/:receiptId */
router.get('/proof/:receiptId', (req, res) => {
  const result = merkle.proofForReceipt(req.params.receiptId);
  if (!result.found) return res.status(404).json(result);
  res.json(result);
});

/** GET /api/merkle/batches */
router.get('/batches', (_req, res) => {
  const batches = merkle.loadBatches().map((b) => ({
    id: b.id,
    label: b.label,
    root: b.root,
    leafCount: b.leafCount,
    createdAt: b.createdAt,
  }));
  res.json({ batches });
});

/** POST /api/merkle/verify — body: { leaf, proof, root } */
router.post('/verify', (req, res) => {
  const { leaf, proof, root } = req.body || {};
  if (!leaf || !proof || !root) {
    return res.status(400).json({ error: 'leaf, proof, root required' });
  }
  const valid = merkle.verifyProof(leaf, proof, root);
  res.json({ valid });
});

module.exports = router;
