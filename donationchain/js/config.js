/**
 * DonationChain shared configuration (admin-controlled).
 * Stored in localStorage; admin panel is the source of truth.
 */
const DCConfig = (() => {
  const KEY = "dc_admin_config_v1";

  const defaults = {
    general: {
      platformName: "DonationChain",
      tagline: "Every rupee tracked & proven",
      supportEmail: "support@donationchain.pk",
      supportPhone: "0800-12345",
      defaultCurrency: "PKR",
      maintenanceMode: false,
    },
    donations: {
      minAmount: 100,
      maxAmount: 500000,
      quickAmounts: [1000, 2500, 5000, 10000],
      allowAnonymous: true,
      platformFeePercent: 0,
      autoMatchEnabled: true,
    },
    payments: {
      jazzcash: true,
      easypaisa: true,
      raast: true,
      card: true,
      bankTransfer: false,
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
      goldPricePerTola: 240000,
      silverPricePerTola: 2800,
      nisabGoldTola: 7.5,
      calculatorEnabled: true,
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
      autoAnchorSimulated: true,
    },
    features: {
      donorDashboard: true,
      adminPanel: true,
      explorer: true,
      pwa: true,
      requireLoginToDonate: false,
      showImpactStats: true,
    },
    seo: {
      siteTitle: "DonationChain — Transparent Donations",
      metaDescription: "Zero middleman. Direct payments to hospitals, schools & vendors.",
      canonicalUrl: "https://donationchain.pk/",
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

  return { defaults, load, save, reset, get, setSection, KEY };
})();

if (typeof window !== "undefined") window.DCConfig = DCConfig;
