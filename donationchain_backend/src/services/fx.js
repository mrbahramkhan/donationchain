/**
 * Multi-currency FX — quotes, conversion, rate cache.
 *
 * Base currency: USD (ISO 4217).
 * Live feed: optional FX_API_URL (must return { rates: { EUR: 0.92, ... } } vs USD).
 * Fallback: built-in mid-market style table (admin/env can override).
 *
 * Quote locks rate for FX_QUOTE_TTL_SEC (default 600).
 */

const crypto = require('crypto');

const BASE = (process.env.FX_BASE_CURRENCY || 'USD').toUpperCase();
const QUOTE_TTL_SEC = Math.max(60, Number(process.env.FX_QUOTE_TTL_SEC) || 600);
const SPREAD = Math.max(0, Number(process.env.FX_SPREAD_PERCENT) || 0); // e.g. 1.5 = 1.5%
const CACHE_MS = Math.max(30_000, Number(process.env.FX_CACHE_MS) || 300_000);

/** Minor units (decimal places) for rounding */
const DECIMALS = {
  USD: 2, EUR: 2, GBP: 2, AUD: 2, CAD: 2, CHF: 2, SGD: 2, NZD: 2,
  PKR: 0, INR: 2, BDT: 2, LKR: 2, NPR: 2,
  SAR: 2, AED: 2, QAR: 2, KWD: 3, BHD: 3, OMR: 3,
  MYR: 2, IDR: 0, THB: 2, PHP: 2, VND: 0,
  TRY: 2, EGP: 2, NGN: 2, KES: 2, ZAR: 2,
  JPY: 0, CNY: 2, HKD: 2, KRW: 0,
};

/**
 * USD → currency mid rates (1 USD = X units of currency).
 * Updated periodically via live feed or admin; values are illustrative fallbacks.
 */
const FALLBACK_USD_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.88,
  SGD: 1.34,
  NZD: 1.66,
  PKR: 278.5,
  INR: 83.2,
  BDT: 110,
  SAR: 3.75,
  AED: 3.67,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  MYR: 4.7,
  IDR: 15600,
  TRY: 32.5,
  EGP: 48,
  NGN: 1550,
  KES: 129,
  ZAR: 18.5,
  JPY: 149,
  CNY: 7.2,
  HKD: 7.8,
};

const quotes = new Map(); // quoteId → quote
let ratesCache = {
  base: BASE,
  rates: { ...FALLBACK_USD_RATES },
  source: 'fallback',
  fetchedAt: null,
};

function decimalsFor(currency) {
  const c = String(currency || BASE).toUpperCase();
  return DECIMALS[c] != null ? DECIMALS[c] : 2;
}

function roundAmount(amount, currency) {
  const d = decimalsFor(currency);
  const f = Math.pow(10, d);
  return Math.round(Number(amount) * f) / f;
}

function normalizeCurrency(c) {
  return String(c || '').trim().toUpperCase();
}

function isSupported(currency) {
  const c = normalizeCurrency(currency);
  return !!ratesCache.rates[c] || c === BASE;
}

/**
 * Apply optional platform spread on a mid rate (from → to).
 * spreadPercent > 0 makes conversion slightly worse for the user.
 */
function applySpread(midRate, spreadPercent) {
  const s = spreadPercent != null ? Number(spreadPercent) : SPREAD;
  if (!s || s <= 0) return midRate;
  return midRate * (1 - s / 100);
}

/**
 * Rate: 1 unit of `from` = X units of `to` (using USD pivot).
 */
function getMidRate(from, to) {
  const f = normalizeCurrency(from);
  const t = normalizeCurrency(to);
  if (f === t) return 1;

  const rates = ratesCache.rates;
  // rates are USD → CCY (1 USD = rates[CCY])
  const usdFrom = f === 'USD' ? 1 : rates[f];
  const usdTo = t === 'USD' ? 1 : rates[t];
  if (usdFrom == null || usdTo == null || !usdFrom) {
    const err = new Error(`Unsupported currency pair ${f}/${t}`);
    err.code = 'FX_UNSUPPORTED_PAIR';
    throw err;
  }
  // 1 FROM = (1/usdFrom) USD = (usdTo/usdFrom) TO
  // Wait: rates[f] = units of F per 1 USD, so 1 F = 1/rates[f] USD
  // 1 USD = rates[t] T, so 1 F = rates[t]/rates[f] T
  return usdTo / usdFrom;
}

function getRate(from, to, opts) {
  const mid = getMidRate(from, to);
  const o = opts || {};
  if (o.applySpread === false) return mid;
  return applySpread(mid, o.spreadPercent);
}

function convert(amount, from, to, opts) {
  const o = opts || {};
  const rate = o.rate != null ? Number(o.rate) : getRate(from, to, o);
  const raw = Number(amount) * rate;
  const rounded = roundAmount(raw, to);
  return {
    amountIn: Number(amount),
    currencyIn: normalizeCurrency(from),
    amountOut: rounded,
    currencyOut: normalizeCurrency(to),
    rate,
    midRate: o.rate != null ? null : getMidRate(from, to),
    decimals: decimalsFor(to),
  };
}

/**
 * Create a locked quote for checkout.
 * @param {{ from, to, amount, amountDirection?: 'from'|'to' }} opts
 * amountDirection 'from' = amount is in `from` currency (default)
 * amountDirection 'to'   = amount is desired output in `to` currency
 */
function createQuote(opts) {
  const from = normalizeCurrency(opts.from);
  const to = normalizeCurrency(opts.to || BASE);
  const direction = opts.amountDirection === 'to' ? 'to' : 'from';
  const amount = Number(opts.amount);

  if (!from || !to) {
    const err = new Error('from and to currencies required');
    err.code = 'FX_INVALID_REQUEST';
    throw err;
  }
  if (!(amount > 0)) {
    const err = new Error('amount must be positive');
    err.code = 'FX_INVALID_AMOUNT';
    throw err;
  }
  if (!isSupported(from) || !isSupported(to)) {
    const err = new Error(`Unsupported currency ${from} or ${to}`);
    err.code = 'FX_UNSUPPORTED_PAIR';
    throw err;
  }

  const mid = getMidRate(from, to);
  const rate = applySpread(mid, opts.spreadPercent);
  let amountFrom;
  let amountTo;
  if (direction === 'to') {
    amountTo = roundAmount(amount, to);
    amountFrom = roundAmount(amountTo / rate, from);
  } else {
    amountFrom = roundAmount(amount, from);
    amountTo = roundAmount(amountFrom * rate, to);
  }

  const quoteId = 'FXQ_' + crypto.randomBytes(8).toString('hex');
  const now = Date.now();
  const expiresAt = new Date(now + QUOTE_TTL_SEC * 1000).toISOString();

  const quote = {
    quoteId,
    from,
    to,
    amountFrom,
    amountTo,
    rate,
    midRate: mid,
    spreadPercent: opts.spreadPercent != null ? Number(opts.spreadPercent) : SPREAD,
    baseCurrency: BASE,
    amountBase: to === BASE ? amountTo : roundAmount(amountFrom * getRate(from, BASE), BASE),
    source: ratesCache.source,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    ttlSec: QUOTE_TTL_SEC,
  };

  quotes.set(quoteId, quote);
  // prune old
  if (quotes.size > 5000) {
    for (const [id, q] of quotes) {
      if (new Date(q.expiresAt).getTime() < now) quotes.delete(id);
    }
  }
  return quote;
}

function getQuote(quoteId) {
  const q = quotes.get(String(quoteId || ''));
  if (!q) return null;
  if (new Date(q.expiresAt).getTime() < Date.now()) {
    q.expired = true;
  }
  return q;
}

function assertQuoteValid(quoteId) {
  const q = getQuote(quoteId);
  if (!q) {
    const err = new Error('FX quote not found');
    err.code = 'FX_QUOTE_NOT_FOUND';
    throw err;
  }
  if (q.expired || new Date(q.expiresAt).getTime() < Date.now()) {
    const err = new Error('FX quote expired — request a new quote');
    err.code = 'FX_QUOTE_EXPIRED';
    throw err;
  }
  return q;
}

function listCurrencies() {
  return Object.keys(ratesCache.rates)
    .sort()
    .map((code) => ({
      code,
      decimals: decimalsFor(code),
      usdRate: ratesCache.rates[code],
    }));
}

function getRatesSnapshot() {
  return {
    base: ratesCache.base,
    rates: { ...ratesCache.rates },
    source: ratesCache.source,
    fetchedAt: ratesCache.fetchedAt,
    spreadPercent: SPREAD,
    quoteTtlSec: QUOTE_TTL_SEC,
  };
}

/** Merge admin/env overrides: FX_RATE_PKR=280 etc. */
function applyEnvOverrides(rates) {
  const out = { ...rates };
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith('FX_RATE_')) continue;
    const code = k.slice('FX_RATE_'.length).toUpperCase();
    const n = Number(v);
    if (code && n > 0) out[code] = n;
  }
  out.USD = 1;
  return out;
}

async function refreshRatesFromApi() {
  const url = process.env.FX_API_URL;
  if (!url) {
    ratesCache = {
      base: BASE,
      rates: applyEnvOverrides({ ...FALLBACK_USD_RATES }),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
    };
    return ratesCache;
  }
  try {
    const res = await fetch(url, {
      headers: process.env.FX_API_KEY
        ? { Authorization: `Bearer ${process.env.FX_API_KEY}` }
        : {},
    });
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const body = await res.json();
    // Accept { rates: { EUR: 0.92 } } or { conversion_rates: {...} } (exchangerate-api style)
    const raw = body.rates || body.conversion_rates || body.quotes || {};
    const rates = { USD: 1 };
    for (const [k, v] of Object.entries(raw)) {
      const code = String(k).replace(/^USD/, '').toUpperCase() || 'USD';
      const n = Number(v);
      if (code && n > 0) rates[code] = n;
    }
    rates.USD = 1;
    ratesCache = {
      base: BASE,
      rates: applyEnvOverrides(rates),
      source: 'live',
      fetchedAt: new Date().toISOString(),
    };
    return ratesCache;
  } catch (e) {
    console.warn('[FX] live refresh failed, using fallback:', e.message);
    ratesCache = {
      base: BASE,
      rates: applyEnvOverrides({ ...FALLBACK_USD_RATES }),
      source: 'fallback',
      fetchedAt: ratesCache.fetchedAt || new Date().toISOString(),
      error: e.message,
    };
    return ratesCache;
  }
}

let lastRefresh = 0;
async function ensureRates() {
  const now = Date.now();
  if (!ratesCache.fetchedAt || now - lastRefresh > CACHE_MS) {
    lastRefresh = now;
    await refreshRatesFromApi();
  }
  return ratesCache;
}

// bootstrap fallback immediately
ratesCache.rates = applyEnvOverrides({ ...FALLBACK_USD_RATES });
ratesCache.fetchedAt = new Date().toISOString();

module.exports = {
  BASE,
  QUOTE_TTL_SEC,
  SPREAD,
  DECIMALS,
  FALLBACK_USD_RATES,
  decimalsFor,
  roundAmount,
  normalizeCurrency,
  isSupported,
  getMidRate,
  getRate,
  convert,
  createQuote,
  getQuote,
  assertQuoteValid,
  listCurrencies,
  getRatesSnapshot,
  refreshRatesFromApi,
  ensureRates,
  applySpread,
};
