/**
 * DonationChain — Smart contract integration (ethers v6 CDN)
 * Read path works when contract address is set + RPC available.
 * Write path (anchor) requires owner wallet (MetaMask) — demo uses simulation if not configured.
 */
const DCContract = (() => {
  let provider = null;
  let contract = null;
  let signerContract = null;

  function cfg() {
    return window.DC_CONTRACT || {};
  }

  function isConfigured() {
    const a = cfg().address || "";
    return a && !/^0x0{40}$/i.test(a);
  }

  async function loadEthers() {
    if (window.ethers) return window.ethers;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.ethers;
  }

  async function getReadContract() {
    if (contract) return contract;
    if (!isConfigured()) return null;
    const ethers = await loadEthers();
    const c = cfg();
    provider = new ethers.JsonRpcProvider(c.rpcUrl);
    contract = new ethers.Contract(c.address, c.abi, provider);
    return contract;
  }

  /** Convert receipt id string → bytes32 (keccak256) */
  async function receiptIdToBytes32(receiptId) {
    const ethers = await loadEthers();
    return ethers.id(String(receiptId));
  }

  async function dataHashFromRecord(record) {
    const ethers = await loadEthers();
    const payload = JSON.stringify({
      amount: record.amount,
      case: record.case,
      vendor: record.vendor,
      method: record.method,
    });
    return ethers.id(payload);
  }

  /**
   * Check on-chain anchor for a receipt ID.
   * Returns { configured, anchored, proof?, error? }
   */
  async function checkOnChain(receiptId) {
    if (!isConfigured()) {
      return {
        configured: false,
        anchored: false,
        mode: "simulation",
        message: "Contract address not set — using off-chain ledger only",
      };
    }
    try {
      const c = await getReadContract();
      const rh = await receiptIdToBytes32(receiptId);
      const anchored = await c.isAnchored(rh);
      let proof = null;
      if (anchored) {
        proof = await c.getProof(rh);
      }
      return {
        configured: true,
        anchored: !!anchored,
        mode: "on-chain",
        proof,
        receiptHash: rh,
        explorer: cfg().explorerAddress + cfg().address,
      };
    } catch (e) {
      return {
        configured: true,
        anchored: false,
        mode: "error",
        error: e.message || String(e),
      };
    }
  }

  async function getStats() {
    if (!isConfigured()) {
      return { configured: false, donationCount: 0, tipAnchorCount: 0 };
    }
    try {
      const c = await getReadContract();
      const donationCount = Number(await c.donationCount());
      const tipAnchorCount = Number(await c.tipAnchorCount());
      return { configured: true, donationCount, tipAnchorCount, address: cfg().address };
    } catch (e) {
      return { configured: true, error: e.message };
    }
  }

  /**
   * Simulate on-chain anchor locally when contract not deployed
   * (stores flag on the donation record in localStorage)
   */
  function simulateAnchor(record) {
    record.onChain = {
      simulated: true,
      anchoredAt: new Date().toISOString(),
      network: "simulation",
    };
    const donations = JSON.parse(localStorage.getItem("dc_donations") || "[]");
    const i = donations.findIndex((d) => d.id === record.id);
    if (i >= 0) {
      donations[i].onChain = record.onChain;
      localStorage.setItem("dc_donations", JSON.stringify(donations));
    }
    return record.onChain;
  }

  /** Connect MetaMask for owner write operations */
  async function connectWallet() {
    if (!window.ethereum) throw new Error("No wallet found (install MetaMask)");
    const ethers = await loadEthers();
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await browserProvider.send("eth_requestAccounts", []);
    const signer = await browserProvider.getSigner();
    if (!isConfigured()) throw new Error("Set contract address in contract-config.js");
    signerContract = new ethers.Contract(cfg().address, cfg().abi, signer);
    return signer.getAddress();
  }

  async function anchorDonationWithWallet(record) {
    if (!signerContract) await connectWallet();
    const rh = await receiptIdToBytes32(record.id);
    const dh = await dataHashFromRecord(record);
    const tx = await signerContract.anchorDonation(rh, dh, BigInt(record.amount));
    const receipt = await tx.wait();
    return { txHash: receipt.hash, explorer: cfg().explorerTx + receipt.hash };
  }

  return {
    isConfigured,
    checkOnChain,
    getStats,
    simulateAnchor,
    connectWallet,
    anchorDonationWithWallet,
    receiptIdToBytes32,
    cfg,
  };
})();

window.DCContract = DCContract;
