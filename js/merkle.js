/**
 * DonationChain — Merkle Tree Proofs
 * Batch donation leaf hashes into a binary Merkle tree (SHA-256).
 * Proof = sibling path from leaf → root; anyone can verify inclusion.
 */
const Merkle = (() => {
  const BATCH_KEY = "dc_merkle_batches_v1";

  async function sha256Hex(input) {
    const data =
      typeof input === "string"
        ? new TextEncoder().encode(input)
        : input instanceof Uint8Array
          ? input
          : new TextEncoder().encode(String(input));
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function hexToBytes(hex) {
    const h = hex.replace(/^0x/, "");
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(h.substr(i * 2, 2), 16);
    }
    return out;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /** Sorted pair hash (order-independent parent) */
  async function hashPair(aHex, bHex) {
    const a = aHex.replace(/^0x/, "").toLowerCase();
    const b = bHex.replace(/^0x/, "").toLowerCase();
    const [left, right] = a < b ? [a, b] : [b, a];
    const combined = new Uint8Array(64);
    combined.set(hexToBytes(left), 0);
    combined.set(hexToBytes(right), 32);
    const buf = await crypto.subtle.digest("SHA-256", combined);
    return bytesToHex(new Uint8Array(buf));
  }

  async function leafFromDonation(record) {
    const payload = JSON.stringify({
      id: record.id || record.receiptId,
      amount: Number(record.amount),
      method: record.method || "",
      case: record.case || record.caseTitle || "",
      vendor: record.vendor || "",
      blockHash: record.blockHash || "",
    });
    return sha256Hex(payload);
  }

  /**
   * Build tree levels. levels[0] = leaves, levels[last] = [root]
   */
  async function buildTree(leaves) {
    if (!leaves.length) {
      const empty = await sha256Hex("EMPTY");
      return { levels: [[empty]], root: empty, leaves: [empty] };
    }
    let level = leaves.map((l) => l.replace(/^0x/, "").toLowerCase());
    const levels = [level.slice()];
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 === level.length) {
          next.push(level[i]); // promote odd leaf
        } else {
          next.push(await hashPair(level[i], level[i + 1]));
        }
      }
      levels.push(next);
      level = next;
    }
    return { levels, root: level[0], leaves: levels[0] };
  }

  /**
   * Generate Merkle proof for leaf at index.
   * Returns { leaf, index, proof: [{ sibling, position }], root }
   * position: 'left' | 'right' relative to current node
   */
  async function getProof(leaves, index) {
    const { levels, root } = await buildTree(leaves);
    if (index < 0 || index >= levels[0].length) {
      throw new Error("Leaf index out of range");
    }
    const proof = [];
    let idx = index;
    for (let layer = 0; layer < levels.length - 1; layer++) {
      const level = levels[layer];
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      if (siblingIdx < level.length) {
        proof.push({
          sibling: level[siblingIdx],
          position: isRight ? "left" : "right",
        });
      }
      idx = Math.floor(idx / 2);
    }
    return { leaf: levels[0][index], index, proof, root };
  }

  /**
   * Verify a Merkle proof against an expected root.
   */
  async function verifyProof(leaf, proof, root) {
    let hash = leaf.replace(/^0x/, "").toLowerCase();
    const expected = root.replace(/^0x/, "").toLowerCase();
    for (const step of proof) {
      const sib = step.sibling.replace(/^0x/, "").toLowerCase();
      hash = await hashPair(hash, sib);
    }
    return hash === expected;
  }

  function loadBatches() {
    try {
      return JSON.parse(localStorage.getItem(BATCH_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveBatches(batches) {
    localStorage.setItem(BATCH_KEY, JSON.stringify(batches));
  }

  /**
   * Create a new batch from donation records (or append to open daily batch).
   */
  async function createBatch(records, label) {
    const leaves = [];
    const items = [];
    for (const r of records) {
      const leaf = await leafFromDonation(r);
      leaves.push(leaf);
      items.push({
        receiptId: r.id || r.receiptId,
        amount: r.amount,
        leaf,
      });
    }
    const tree = await buildTree(leaves);
    const batch = {
      id: "MB-" + Date.now().toString(36).toUpperCase(),
      label: label || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      root: tree.root,
      leafCount: leaves.length,
      items,
      // proofs generated on demand
    };
    const batches = loadBatches();
    batches.unshift(batch);
    saveBatches(batches.slice(0, 50)); // keep last 50
    return batch;
  }

  /**
   * Rebuild open "pending" batch from all local donations (demo).
   */
  async function rebuildFromDonations() {
    const donations = JSON.parse(localStorage.getItem("dc_donations") || "[]");
    if (!donations.length) return null;
    return createBatch(donations, "all-local-donations");
  }

  async function proofForReceipt(receiptId) {
    const batches = loadBatches();
    for (const batch of batches) {
      const idx = batch.items.findIndex((i) => i.receiptId === receiptId);
      if (idx === -1) continue;
      const leaves = batch.items.map((i) => i.leaf);
      const proof = await getProof(leaves, idx);
      return {
        found: true,
        batchId: batch.id,
        batchLabel: batch.label,
        root: batch.root,
        ...proof,
      };
    }
    // Auto-rebuild once from donations
    const rebuilt = await rebuildFromDonations();
    if (!rebuilt) return { found: false, error: "No batches or donations" };
    const idx = rebuilt.items.findIndex((i) => i.receiptId === receiptId);
    if (idx === -1) return { found: false, error: "Receipt not in Merkle batch" };
    const leaves = rebuilt.items.map((i) => i.leaf);
    const proof = await getProof(leaves, idx);
    return {
      found: true,
      batchId: rebuilt.id,
      batchLabel: rebuilt.label,
      root: rebuilt.root,
      ...proof,
    };
  }

  async function verifyReceiptMerkle(receiptId) {
    const result = await proofForReceipt(receiptId);
    if (!result.found) return result;
    const ok = await verifyProof(result.leaf, result.proof, result.root);
    return {
      ...result,
      valid: ok,
      message: ok
        ? "Merkle proof valid — donation included in batch root"
        : "Merkle proof INVALID",
    };
  }

  function short(h) {
    if (!h || h.length < 16) return h || "";
    return h.slice(0, 8) + "…" + h.slice(-6);
  }

  return {
    sha256Hex,
    leafFromDonation,
    buildTree,
    getProof,
    verifyProof,
    createBatch,
    rebuildFromDonations,
    proofForReceipt,
    verifyReceiptMerkle,
    loadBatches,
    short,
  };
})();

if (typeof window !== "undefined") window.Merkle = Merkle;
