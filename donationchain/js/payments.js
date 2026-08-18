/**
 * Client payment API — initiate + real-time status (poll / SSE).
 */
const DCPayments = (() => {
  function apiBase() {
    try {
      if (window.AdminAuth && AdminAuth.apiBase) return AdminAuth.apiBase();
      if (window.DCConfig) {
        const c = DCConfig.load();
        if (c.apiBase) return c.apiBase;
      }
    } catch (_) {}
    return localStorage.getItem('dc_api_base') || 'http://localhost:4000';
  }

  async function getConfig() {
    try {
      const res = await fetch(apiBase() + '/api/payments/config');
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      ok: true,
      methods: {
        raast: { enabled: true, mode: 'sandbox' },
        jazzcash: { enabled: true, mode: 'sandbox' },
        easypaisa: { enabled: true, mode: 'sandbox' },
        card: { enabled: true, mode: 'sandbox' },
      },
    };
  }

  async function initiate(body) {
    const res = await fetch(apiBase() + '/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const err = new Error(data.error || 'Payment initiation failed');
      err.code = data.code;
      throw err;
    }
    return data;
  }

  async function getStatus(id) {
    const res = await fetch(apiBase() + '/api/payments/' + encodeURIComponent(id) + '/status');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Status failed');
    return data;
  }

  /**
   * Poll until terminal status or timeout.
   * @returns {Promise<{status, id, providerRef, settledAt}>}
   */
  function waitUntilSettled(id, opts) {
    const o = opts || {};
    const timeoutMs = o.timeoutMs || 45000;
    const intervalMs = o.intervalMs || 600;
    const onUpdate = o.onUpdate || function () {};
    const started = Date.now();

    return new Promise((resolve, reject) => {
      let stopped = false;

      // Prefer SSE when available
      let es = null;
      try {
        es = new EventSource(apiBase() + '/api/payments/stream/' + encodeURIComponent(id));
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            onUpdate(data);
            if (data.terminal) {
              stopped = true;
              es.close();
              if (data.status === 'settled') resolve(data);
              else reject(Object.assign(new Error('Payment ' + data.status), { data }));
            }
          } catch (_) {}
        };
        es.onerror = () => {
          /* fall back to poll */
          try {
            es.close();
          } catch (_) {}
          es = null;
        };
      } catch (_) {
        es = null;
      }

      const tick = async () => {
        if (stopped) return;
        if (Date.now() - started > timeoutMs) {
          stopped = true;
          if (es) try { es.close(); } catch (_) {}
          reject(new Error('Payment status timeout'));
          return;
        }
        try {
          const data = await getStatus(id);
          onUpdate(data);
          if (data.terminal) {
            stopped = true;
            if (es) try { es.close(); } catch (_) {}
            if (data.status === 'settled') resolve(data);
            else reject(Object.assign(new Error('Payment ' + data.status), { data }));
            return;
          }
        } catch (_) {}
        setTimeout(tick, intervalMs);
      };
      setTimeout(tick, intervalMs);
    });
  }

  /**
   * Full flow: initiate → wait settled.
   */
  async function payAndWait(body, opts) {
    const init = await initiate(body);
    const payment = init.payment;
    const onUpdate = (opts && opts.onUpdate) || function () {};
    onUpdate({ status: payment.status, id: payment.id, phase: 'initiated' });
    if (payment.status === 'settled') return { payment, status: payment };
    const status = await waitUntilSettled(payment.id, opts);
    return { payment: Object.assign({}, payment, status), status };
  }

  return {
    apiBase,
    getConfig,
    initiate,
    getStatus,
    waitUntilSettled,
    payAndWait,
  };
})();

if (typeof window !== 'undefined') window.DCPayments = DCPayments;
