/**
 * DonationChain — Zakat Nisab + Hawl tracking
 * Hawl = one complete lunar year (~354.367 days) of wealth above Nisab.
 * Storage: localStorage for Hawl progress; optional backend sync.
 */
const DCZakat = (() => {
  const STORAGE_KEY = "dc_zakat_hawl_v1";
  const LUNAR_YEAR_DAYS = 354.367; // mean Islamic year
  const GOLD_GRAMS_PER_TOLA = 11.664; // Pakistan tola
  const NISAB_GOLD_GRAMS = 87.48; // 20 mithqal

  /* ── helpers ─────────────────────────────────────────── */

  function now() {
    return new Date();
  }

  function daysBetween(a, b) {
    const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
    return ms / (1000 * 60 * 60 * 24);
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    return d;
  }

  function iso(d) {
    return new Date(d).toISOString();
  }

  function donorKey() {
    try {
      const u = JSON.parse(localStorage.getItem("dc_user") || "null");
      if (u && u.phone) return "phone:" + String(u.phone).replace(/\D/g, "");
    } catch (_) {}
    return "anon";
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function getRecord() {
    const store = loadStore();
    const key = donorKey();
    if (!store[key]) {
      store[key] = {
        hawlStart: null, // ISO when wealth first known ≥ Nisab (or user-declared)
        hawlCompleted: false,
        lastNetWealth: 0,
        lastNisab: 0,
        lastZakatDue: 0,
        calculations: [], // history
        payments: [], // { amount, at, receiptId }
        declaredHawlComplete: false,
      };
      saveStore(store);
    }
    return { store, key, rec: store[key] };
  }

  /* ── config ──────────────────────────────────────────── */

  function getCountryProfile() {
    if (window.DCLocales && DCLocales.getCountry) return DCLocales.getCountry();
    return {
      currency: "USD",
      currencySymbol: "$",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
    };
  }

  function getConfig() {
    const z = window.DCConfig ? DCConfig.load().zakat : {};
    const country = getCountryProfile();
    const goldPerGram =
      Number(z.goldPricePerGram) ||
      (country.currency === "PKR"
        ? (Number(z.goldPricePerTola) || 240000) / GOLD_GRAMS_PER_TOLA
        : 75);
    const silverPerGram =
      Number(z.silverPricePerGram) ||
      (country.currency === "PKR"
        ? (Number(z.silverPricePerTola) || 2800) / GOLD_GRAMS_PER_TOLA
        : 0.95);
    return {
      ratePercent: z.ratePercent != null ? Number(z.ratePercent) : 2.5,
      goldPricePerGram: goldPerGram,
      silverPricePerGram: silverPerGram,
      goldPricePerTola: Number(z.goldPricePerTola) || goldPerGram * GOLD_GRAMS_PER_TOLA,
      silverPricePerTola: Number(z.silverPricePerTola) || silverPerGram * GOLD_GRAMS_PER_TOLA,
      nisabGoldTola: z.nisabGoldTola != null ? Number(z.nisabGoldTola) : 7.5,
      nisabGoldGrams:
        country.nisabGoldGrams ||
        (z.nisabGoldGrams != null ? Number(z.nisabGoldGrams) : 85),
      currency: country.currency || "USD",
      currencySymbol: country.currencySymbol || "$",
      goldUnit: country.goldUnit || "gram",
      countryName: country.name || "International",
    };
  }

  /** Nisab in local currency using gold standard (country profile) */
  function calcNisabPkr(cfg) {
    const c = cfg || getConfig();
    const grams = c.nisabGoldGrams || NISAB_GOLD_GRAMS;
    return Math.round(grams * (c.goldPricePerGram || 75));
  }

  function formatZakatMoney(n, cfg) {
    const c = cfg || getConfig();
    if (window.DCLocales && DCLocales.formatMoney) {
      return DCLocales.formatMoney(n, window.DCLocales.getCountryCode());
    }
    return (c.currencySymbol || c.currency || "") + " " + Number(n || 0).toLocaleString();
  }

  /* ── core calculation ────────────────────────────────── */

  /**
   * @param {object} assets
   * @param {number} assets.goldTola
   * @param {number} assets.silverTola
   * @param {number} assets.cash
   * @param {number} assets.business
   * @param {number} [assets.liabilities]
   * @param {object} [opts]
   * @param {boolean} [opts.forceHawlComplete] — user declaration
   */
  function calculate(assets, opts) {
    opts = opts || {};
    const cfg = getConfig();
    // Accept goldTola (PK) or goldGrams (global)
    let goldValue = 0;
    if (assets.goldGrams != null && Number(assets.goldGrams) > 0) {
      goldValue = Number(assets.goldGrams) * cfg.goldPricePerGram;
    } else {
      goldValue = (Number(assets.goldTola) || 0) * cfg.goldPricePerTola;
    }
    let silverValue = 0;
    if (assets.silverGrams != null && Number(assets.silverGrams) > 0) {
      silverValue = Number(assets.silverGrams) * cfg.silverPricePerGram;
    } else {
      silverValue = (Number(assets.silverTola) || 0) * cfg.silverPricePerTola;
    }
    const cash = Number(assets.cash) || 0;
    const business = Number(assets.business) || 0;
    const liabilities = Number(assets.liabilities) || 0;

    const gross = goldValue + silverValue + cash + business;
    const netWealth = Math.max(0, gross - liabilities);
    const nisab = calcNisabPkr(cfg);
    const aboveNisab = netWealth >= nisab;

    const hawl = evaluateHawl(netWealth, nisab, {
      forceComplete: !!opts.forceHawlComplete,
    });

    const rate = (cfg.ratePercent || 2.5) / 100;
    let zakatDue = 0;
    if (aboveNisab && hawl.completed) {
      zakatDue = Math.round(netWealth * rate);
    }

    const paid = totalPaidInCurrentHawl(hawl);
    const remaining = Math.max(0, zakatDue - paid);

    const result = {
      netWealth,
      gross,
      liabilities,
      nisab,
      aboveNisab,
      ratePercent: cfg.ratePercent,
      zakatDue,
      alreadyPaid: paid,
      remaining,
      hawl,
      goldPricePerTola: cfg.goldPricePerTola,
      silverPricePerTola: cfg.silverPricePerTola,
      goldPricePerGram: cfg.goldPricePerGram,
      currency: cfg.currency,
      currencySymbol: cfg.currencySymbol,
      countryName: cfg.countryName,
      nisabGoldGrams: cfg.nisabGoldGrams,
      calculatedAt: iso(now()),
    };

    persistCalculation(result, assets);
    return result;
  }

  /* ── Hawl engine ─────────────────────────────────────── */

  /**
   * Hawl rules (practical platform version):
   * 1. When net wealth first crosses Nisab, start Hawl clock (hawlStart).
   * 2. If wealth later falls below Nisab, clock resets (classical majority view simplified).
   * 3. After LUNAR_YEAR_DAYS from hawlStart with wealth still ≥ Nisab → Hawl complete.
   * 4. User may declare "Hawl already complete" (self-attestation) for first-time users.
   */
  function evaluateHawl(netWealth, nisab, opts) {
    const { store, key, rec } = getRecord();
    const today = now();
    opts = opts || {};

    // User explicit declaration
    if (opts.forceComplete || rec.declaredHawlComplete) {
      rec.declaredHawlComplete = true;
      if (!rec.hawlStart) rec.hawlStart = iso(addDays(today, -LUNAR_YEAR_DAYS));
      rec.hawlCompleted = true;
      store[key] = rec;
      saveStore(store);
      return buildHawlStatus(rec, true, netWealth, nisab);
    }

    if (netWealth < nisab) {
      // Below Nisab → reset Hawl
      rec.hawlStart = null;
      rec.hawlCompleted = false;
      rec.lastNetWealth = netWealth;
      rec.lastNisab = nisab;
      store[key] = rec;
      saveStore(store);
      return {
        completed: false,
        status: "below_nisab",
        message: "Wealth is below Nisab. Hawl has been reset. Zakat is not due.",
        hawlStart: null,
        daysHeld: 0,
        daysRemaining: null,
        progressPercent: 0,
        resetsOnDropBelowNisab: true,
      };
    }

    // Above Nisab
    if (!rec.hawlStart) {
      rec.hawlStart = iso(today);
      rec.hawlCompleted = false;
    }

    const daysHeld = daysBetween(rec.hawlStart, today);
    const completed = daysHeld >= LUNAR_YEAR_DAYS;
    rec.hawlCompleted = completed;
    rec.lastNetWealth = netWealth;
    rec.lastNisab = nisab;
    store[key] = rec;
    saveStore(store);

    return buildHawlStatus(rec, completed, netWealth, nisab);
  }

  function buildHawlStatus(rec, completed, netWealth, nisab) {
    const daysHeld = rec.hawlStart ? daysBetween(rec.hawlStart, now()) : 0;
    const daysRemaining = completed ? 0 : Math.max(0, Math.ceil(LUNAR_YEAR_DAYS - daysHeld));
    const progressPercent = Math.min(100, Math.round((daysHeld / LUNAR_YEAR_DAYS) * 100));

    let status, message;
    if (completed) {
      status = "complete";
      message = "Hawl complete. Zakat is due on current zakatable wealth.";
    } else {
      status = "in_progress";
      message =
        "Hawl in progress. Zakat becomes due after one lunar year above Nisab (" +
        daysRemaining +
        " days remaining).";
    }

    return {
      completed,
      status,
      message,
      hawlStart: rec.hawlStart,
      daysHeld: Math.floor(daysHeld),
      daysRemaining,
      progressPercent,
      lunarYearDays: LUNAR_YEAR_DAYS,
      resetsOnDropBelowNisab: true,
    };
  }

  /** User attests that Hawl is already complete (e.g. wealth held > 1 year offline) */
  function declareHawlComplete(yes) {
    const { store, key, rec } = getRecord();
    rec.declaredHawlComplete = !!yes;
    if (yes && !rec.hawlStart) {
      rec.hawlStart = iso(addDays(now(), -LUNAR_YEAR_DAYS));
    }
    rec.hawlCompleted = !!yes;
    store[key] = rec;
    saveStore(store);
    return evaluateHawl(rec.lastNetWealth || 0, rec.lastNisab || calcNisabPkr(getConfig()), {
      forceComplete: yes,
    });
  }

  function totalPaidInCurrentHawl(hawl) {
    const { rec } = getRecord();
    if (!rec.payments || !rec.payments.length) return 0;
    if (!hawl || !hawl.hawlStart) {
      // If no active Hawl window, count nothing toward current obligation
      return 0;
    }
    const start = new Date(hawl.hawlStart).getTime();
    return rec.payments
      .filter((p) => new Date(p.at).getTime() >= start)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }

  function recordPayment(amount, receiptId) {
    const { store, key, rec } = getRecord();
    rec.payments = rec.payments || [];
    rec.payments.push({
      amount: Number(amount) || 0,
      at: iso(now()),
      receiptId: receiptId || null,
    });
    store[key] = rec;
    saveStore(store);
    return rec.payments;
  }

  function persistCalculation(result, assets) {
    const { store, key, rec } = getRecord();
    rec.calculations = rec.calculations || [];
    rec.calculations.push({
      at: result.calculatedAt,
      netWealth: result.netWealth,
      nisab: result.nisab,
      zakatDue: result.zakatDue,
      remaining: result.remaining,
      hawlStatus: result.hawl.status,
      assetsSnapshot: {
        goldTola: Number(assets.goldTola) || 0,
        silverTola: Number(assets.silverTola) || 0,
        cash: Number(assets.cash) || 0,
        business: Number(assets.business) || 0,
      },
    });
    // Keep last 50
    if (rec.calculations.length > 50) rec.calculations = rec.calculations.slice(-50);
    rec.lastZakatDue = result.zakatDue;
    store[key] = rec;
    saveStore(store);
  }

  function getStatus() {
    const { rec } = getRecord();
    const cfg = getConfig();
    const nisab = rec.lastNisab || calcNisabPkr(cfg);
    const hawl = evaluateHawl(rec.lastNetWealth || 0, nisab, {});
    return {
      hawl,
      lastNetWealth: rec.lastNetWealth,
      lastZakatDue: rec.lastZakatDue,
      payments: rec.payments || [],
      calculations: rec.calculations || [],
      declaredHawlComplete: !!rec.declaredHawlComplete,
      nisab,
    };
  }

  function resetHawlForDemo() {
    const { store, key } = getRecord();
    store[key] = {
      hawlStart: null,
      hawlCompleted: false,
      lastNetWealth: 0,
      lastNisab: 0,
      lastZakatDue: 0,
      calculations: [],
      payments: [],
      declaredHawlComplete: false,
    };
    saveStore(store);
  }

  return {
    calculate,
    evaluateHawl,
    declareHawlComplete,
    recordPayment,
    getStatus,
    calcNisabPkr,
    getConfig,
    formatZakatMoney,
    getCountryProfile,
    resetHawlForDemo,
    LUNAR_YEAR_DAYS,
    NISAB_GOLD_GRAMS,
  };
})();

// Browser global
if (typeof window !== "undefined") window.DCZakat = DCZakat;
