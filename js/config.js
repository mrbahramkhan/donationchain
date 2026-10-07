/**
 * DonationChain shared configuration (admin-controlled).
 * Stored in localStorage; admin panel is the source of truth.
 */
const DCConfig = (() => {
  const KEY = "dc_admin_config_v1";

  const defaults = {
    general: {
      platformName: "DonationChain",
      tagline: "Transparent giving · donors meet people in need",
      supportEmail: "support@donationchain.org",
      supportPhone: "",
      defaultCurrency: "USD",
      defaultCountry: "GLOBAL",
      maintenanceMode: false,
      /** productionMode=true disables demo OTP, sample data, simulated-only UI copy */
      productionMode: true,
      apiBase: "",
    },
    donations: {
      minAmount: 5,
      maxAmount: 1000000,
      quickAmounts: [10, 25, 50, 100, 250],
      allowAnonymous: true,
      platformFeePercent: 0,
      autoMatchEnabled: true,
    },
    payments: {
      /** Global defaults — regional rails optional by market */
      card: true,
      bankTransfer: true,
      stripe: true,
      /** Pakistan / South Asia regional (optional) */
      jazzcash: true,
      easypaisa: true,
      raast: true,
      /** Other regions can enable via admin later */
      paypal: false,
      upi: false,
      mpesa: false,
    },
    categories: {
      medical: true,
      education: true,
      food: true,
      utility: true,
      emergency: false,
      housing: false,
    },
    zakat: {
      ratePercent: 2.5,
      /** Price of 1 gram pure gold in defaultCurrency — admin updates per market */
      goldPricePerGram: 75,
      silverPricePerGram: 0.95,
      /** Legacy PK fields (still used when country=PK) */
      goldPricePerTola: 240000,
      silverPricePerTola: 2800,
      nisabGoldTola: 7.5,
      /** AAOIFI-style grams (85); PK profile may use 87.48 */
      nisabGoldGrams: 85,
      calculatorEnabled: true,
      globalMode: true,
    },
    notifications: {
      pushEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
      paymentSuccess: true,
      proofReady: true,
      caseApproved: true,
      fraudAlert: true,
    },
    blockchain: {
      ledgerEnabled: true,
      merkleEnabled: true,
      contractAddress: "0x0000000000000000000000000000000000000000",
      chainId: 80002,
      chainName: "Polygon Amoy",
      rpcUrl: "https://rpc-amoy.polygon.technology",
      autoAnchorSimulated: false,
    },
    features: {
      donorDashboard: true,
      adminPanel: true,
      explorer: true,
      pwa: true,
      requireLoginToDonate: false,
      showImpactStats: true,
      billPayment: true,
    },
    seo: {
      siteTitle: "DonationChain — Transparent Donations Worldwide",
      metaDescription: "Global platform connecting donors and people in need. Institutional payouts. Multi-currency. Multi-language.",
      canonicalUrl: "https://mrbahramkhan.github.io/donationchain/",
    },
  };

  function deepMerge(base, override) {
    if (!override || typeof override !== "object") return JSON.parse(JSON.stringify(base));
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k of Object.keys(override)) {
      if (
        override[k] &&
        typeof override[k] === "object" &&
        !Array.isArray(override[k]) &&
        base[k] &&
        typeof base[k] === "object"
      ) {
        out[k] = deepMerge(base[k], override[k]);
      } else {
        out[k] = override[k];
      }
    }
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      return deepMerge(defaults, JSON.parse(raw));
    } catch {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save(cfg) {
    localStorage.setItem(KEY, JSON.stringify(cfg));
    // Sync contract-config globals if present
    try {
      if (window.DC_CONTRACT && cfg.blockchain) {
        window.DC_CONTRACT.address = cfg.blockchain.contractAddress;
        window.DC_CONTRACT.chainId = cfg.blockchain.chainId;
        window.DC_CONTRACT.chainName = cfg.blockchain.chainName;
        window.DC_CONTRACT.rpcUrl = cfg.blockchain.rpcUrl;
      }
    } catch (_) {}
    return cfg;
  }

  function reset() {
    localStorage.removeItem(KEY);
    return load();
  }

  function get() {
    return load();
  }

  function setSection(section, data) {
    const cfg = load();
    cfg[section] = { ...cfg[section], ...data };
    return save(cfg);
  }

  function isProduction() {
    try {
      const g = load().general || {};
      // Explicit false only enables demo/dev fallbacks
      if (g.productionMode === false) return false;
      return true;
    } catch {
      return true;
    }
  }

  return { defaults, load, save, reset, get, setSection, isProduction, KEY };
})();

if (typeof window !== "undefined") window.DCConfig = DCConfig;
