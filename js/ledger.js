/**
 * DonationChain Verification Ledger
 * Hash-chain (blockchain-style) for immutable donation records.
 * Each block: { index, timestamp, data, prevHash, hash }
 * Genesis prevHash = "0". Stored in localStorage; optional sync to backend.
 */
const Ledger = (() => {
  const STORAGE_KEY = "dc_ledger_v1";

  async function sha256(message) {
    const enc = new TextEncoder().encode(message);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function save(chain) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chain));
  }

  async function createGenesis() {
    const data = {
      type: "GENESIS",
      message: "DonationChain Verification Ledger",
      network: "donationchain-local-v1",
    };
    const payload = "0" + "0" + JSON.stringify(data);
    const hash = await sha256(payload);
    return {
      index: 0,
      timestamp: new Date().toISOString(),
      data,
      prevHash: "0",
      hash,
    };
  }

  async function getChain() {
    let chain = load();
    if (!chain.length) {
      const genesis = await createGenesis();
      chain = [genesis];
      save(chain);
    }
    return chain;
  }

  async function appendDonation(record) {
    const chain = await getChain();
    const prev = chain[chain.length - 1];
    const data = {
      type: "DONATION",
      receiptId: record.id,
      amount: record.amount,
      method: record.method,
      case: record.case,
      caseId: record.caseId,
      vendor: record.vendor,
      city: record.city,
      anonymous: !!record.anonymous,
      donorRef: record.anonymous ? "ANON" : "REGISTERED",
    };
    const timestamp = new Date().toISOString();
    const payload = prev.hash + timestamp + JSON.stringify(data);
    const hash = await sha256(payload);
    const block = {
      index: chain.length,
      timestamp,
      data,
      prevHash: prev.hash,
      hash,
    };
    chain.push(block);
    save(chain);
    return block;
  }

  async function verifyChain(chain) {
    if (!chain || !chain.length) return { valid: false, error: "Empty ledger" };
    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];
      const expectedPrev = i === 0 ? "0" : chain[i - 1].hash;
      if (block.prevHash !== expectedPrev) {
        return { valid: false, error: `Broken link at block #${i}`, brokenIndex: i };
      }
      const payload =
        (i === 0 ? "0" : block.prevHash) +
        (i === 0 ? "0" + JSON.stringify(block.data) : block.timestamp + JSON.stringify(block.data));
      // Genesis used slightly different payload construction — recompute consistently
      let recomputed;
      if (i === 0) {
        recomputed = await sha256("0" + "0" + JSON.stringify(block.data));
      } else {
        recomputed = await sha256(block.prevHash + block.timestamp + JSON.stringify(block.data));
      }
      if (recomputed !== block.hash) {
        return { valid: false, error: `Hash mismatch at block #${i}`, brokenIndex: i };
      }
    }
    return { valid: true, blocks: chain.length, tip: chain[chain.length - 1].hash };
  }

  async function findByReceipt(receiptId) {
    const chain = await getChain();
    return chain.find((b) => b.data && b.data.receiptId === receiptId) || null;
  }

  async function verifyReceipt(receiptId) {
    const chain = await getChain();
    const chainCheck = await verifyChain(chain);
    if (!chainCheck.valid) {
      return { found: false, chainValid: false, ...chainCheck };
    }
    const block = chain.find((b) => b.data && b.data.receiptId === receiptId);
    if (!block) {
      return { found: false, chainValid: true, error: "Receipt not on ledger" };
    }
    return {
      found: true,
      chainValid: true,
      block,
      explorerHint: shortHash(block.hash),
      message: "Receipt anchored on DonationChain verification ledger",
    };
  }

  function shortHash(h) {
    if (!h || h.length < 16) return h || "";
    return h.slice(0, 8) + "…" + h.slice(-6);
  }

  async function getTip() {
    const chain = await getChain();
    return chain[chain.length - 1];
  }

  async function getStats() {
    const chain = await getChain();
    const donations = chain.filter((b) => b.data && b.data.type === "DONATION");
    const volume = donations.reduce((s, b) => s + Number(b.data.amount || 0), 0);
    return {
      blocks: chain.length,
      donations: donations.length,
      volume,
      tip: chain[chain.length - 1]?.hash || null,
    };
  }

  return {
    getChain,
    appendDonation,
    verifyChain,
    verifyReceipt,
    findByReceipt,
    getTip,
    getStats,
    shortHash,
    sha256,
  };
})();

// Browser global
if (typeof window !== "undefined") window.Ledger = Ledger;
