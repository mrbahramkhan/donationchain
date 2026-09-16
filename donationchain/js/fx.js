/**
 * DonationChain FX client — multi-currency quotes & conversion.
 * Uses GET/POST /api/fx/* with local fallback rates if API offline.
 */
const DCFx = (() => {
  const FALLBACK = {
    USD: 1, EUR: 0.92, GBP: 0.79, AUD: 1.52, CAD: 1.36, PKR: 278.5,
    INR: 83.2, SAR: 3.75, AED: 3.67, MYR: 4.7, IDR: 15600, TRY: 32.5,
    BDT: 110, EGP: 48, NGN: 1550, KES: 129, JPY: 149, CNY: 7.2,
  };

  function apiBase() {
    try {
      if (window.AdminAuth && AdminAuth.apiBase) return AdminAuth.apiBase();
      if (window.DCConfig) {
        const c = DCConfig.load();
        if (c.general && c.general.apiBase) return c.general.apiBase;
        if (c.apiBase) return c.apiBase;
      }
    } catch (_) {}
    return "http://localhost:4000";
  }

  function decimals(currency) {
    const c = String(currency || "USD").toUpperCase();
    if (["PKR", "JPY", "IDR", "KRW", "VND"].includes(c)) return 0;
    if (["KWD", "BHD", "OMR"].includes(c)) return 3;
    return 2;
  }

  function round(amount, currency) {
    const d = decimals(currency);
    const f = Math.pow(10, d);
    return Math.round(Number(amount) * f) / f;
  }

  /** Mid rate: 1 from = X to (USD pivot) */
  function midRate(from, to, rates) {
    const f = String(from).toUpperCase();
    const t = String(to).toUpperCase();
    if (f === t) return 1;
    const r = rates || FALLBACK;
    const uf = f === "USD" ? 1 : r[f];
    const ut = t === "USD" ? 1 : r[t];
    if (uf == null || ut == null || !uf) throw new Error("Unsupported pair " + f + "/" + t);
    return ut / uf;
  }

  function convertLocal(amount, from, to, rates) {
    const rate = midRate(from, to, rates);
    return {
      amountIn: Number(amount),
      currencyIn: String(from).toUpperCase(),
      amountOut: round(Number(amount) * rate, to),
      currencyOut: String(to).toUpperCase(),
      rate,
      source: "local",
    };
  }

  async function getRates() {
    try {
      const res = await fetch(apiBase() + "/api/fx/rates");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.rates) return data;
    } catch (_) {}
    return { ok: true, base: "USD", rates: FALLBACK, source: "local-fallback" };
  }

  /**
   * @param {{ from: string, to?: string, amount: number, amountDirection?: 'from'|'to' }} opts
   */
  async function quote(opts) {
    const from = opts.from;
    const to = opts.to || "USD";
    const amount = opts.amount;
    const q = new URLSearchParams({
      from,
      to,
      amount: String(amount),
    });
    if (opts.amountDirection) q.set("amountDirection", opts.amountDirection);

    try {
      const res = await fetch(apiBase() + "/api/fx/quote?" + q.toString());
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.quote) return data.quote;
      if (data.code) {
        const err = new Error(data.error || "FX quote failed");
        err.code = data.code;
        throw err;
      }
    } catch (e) {
      if (e.code) throw e;
      // offline fallback — no quoteId lock
      const rates = (await getRates()).rates || FALLBACK;
      const rate = midRate(from, to, rates);
      const amountFrom = round(amount, from);
      const amountTo = round(amountFrom * rate, to);
      return {
        quoteId: null,
        from: String(from).toUpperCase(),
        to: String(to).toUpperCase(),
        amountFrom,
        amountTo,
        rate,
        midRate: rate,
        source: "local-fallback",
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        offline: true,
      };
    }
  }

  async function getQuote(quoteId) {
    const res = await fetch(apiBase() + "/api/fx/quote/" + encodeURIComponent(quoteId));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Quote not found");
    return data.quote;
  }

  async function convert(amount, from, to) {
    try {
      const res = await fetch(apiBase() + "/api/fx/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, from, to }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.result) return data.result;
    } catch (_) {}
    const rates = (await getRates()).rates || FALLBACK;
    return convertLocal(amount, from, to, rates);
  }

  /** Format using FX currency or DCLocales */
  function format(amount, currency) {
    const cur = String(currency || "USD").toUpperCase();
    try {
      return (
        cur +
        " " +
        Number(amount || 0).toLocaleString(undefined, {
          minimumFractionDigits: decimals(cur) > 0 ? 2 : 0,
          maximumFractionDigits: decimals(cur),
        })
      );
    } catch {
      return cur + " " + amount;
    }
  }

  return {
    apiBase,
    getRates,
    quote,
    getQuote,
    convert,
    convertLocal,
    midRate,
    format,
    decimals,
    round,
    FALLBACK,
  };
})();

if (typeof window !== "undefined") window.DCFx = DCFx;
