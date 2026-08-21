/**
 * DonationChain — Utility bill payment
 * Lookup (demo) + pay direct to provider account — never personal cash.
 */
const DCBills = (() => {
  const HISTORY_KEY = 'dc_bill_payments_v1';

  const PROVIDERS = [
    {
      id: 'wapda',
      name: 'WAPDA / LESCO / MEPCO',
      type: 'electricity',
      refLabel: 'Consumer / reference number',
      refHint: 'e.g. 12 34567 8901234 U',
      pattern: /^[\d\sA-Za-z\-]{8,24}$/,
    },
    {
      id: 'sngpl',
      name: 'SNGPL (Gas)',
      type: 'gas',
      refLabel: 'Customer ID',
      refHint: 'e.g. 1234567890',
      pattern: /^\d{8,14}$/,
    },
    {
      id: 'ssgc',
      name: 'SSGC (Gas — South)',
      type: 'gas',
      refLabel: 'Consumer number',
      refHint: 'e.g. 4012345678',
      pattern: /^\d{8,14}$/,
    },
    {
      id: 'ptcl',
      name: 'PTCL / landline',
      type: 'telecom',
      refLabel: 'Phone / account',
      refHint: 'e.g. 042-12345678',
      pattern: /^[\d\-\s+]{8,16}$/,
    },
    {
      id: 'water',
      name: 'Water board (WASA / KWSB)',
      type: 'water',
      refLabel: 'Bill / connection ID',
      refHint: 'Local connection number',
      pattern: /^[\d\sA-Za-z\-]{6,20}$/,
    },
  ];

  function apiBase() {
    try {
      if (window.AdminAuth && AdminAuth.apiBase) return AdminAuth.apiBase();
      if (window.DCConfig) {
        const c = DCConfig.load();
        if (c.apiBase) return c.apiBase;
      }
    } catch (_) {}
    return 'http://localhost:4000';
  }

  function isEnabled() {
    try {
      if (!window.DCConfig) return true;
      const f = DCConfig.load().features || {};
      if (f.billPayment === false) return false;
      const cat = DCConfig.load().categories || {};
      return cat.utility !== false;
    } catch {
      return true;
    }
  }

  function providers() {
    return PROVIDERS.slice();
  }

  function getProvider(id) {
    return PROVIDERS.find((p) => p.id === id) || null;
  }

  /** Deterministic demo bill from ref (stable amount for same ref) */
  function demoLookup(providerId, reference) {
    const p = getProvider(providerId);
    if (!p) return { ok: false, error: 'Unknown provider' };
    const ref = String(reference || '').trim();
    if (!ref || !p.pattern.test(ref.replace(/\s+/g, ' '))) {
      return { ok: false, error: 'Invalid reference for ' + p.name };
    }
    let hash = 0;
    const s = providerId + '|' + ref.replace(/\s/g, '');
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    const amount = 1500 + (hash % 45000);
    const dueDays = hash % 20;
    const due = new Date();
    due.setDate(due.getDate() + dueDays - 5);
    return {
      ok: true,
      bill: {
        providerId: p.id,
        providerName: p.name,
        type: p.type,
        reference: ref,
        consumerName: 'Account holder (masked)',
        amountDue: amount,
        arrears: hash % 3 === 0 ? Math.round(amount * 0.15) : 0,
        billingMonth: due.toLocaleString('en', { month: 'short', year: 'numeric' }),
        dueDate: due.toISOString().slice(0, 10),
        status: dueDays < 5 ? 'overdue' : 'payable',
        demo: true,
      },
    };
  }

  async function lookup(providerId, reference) {
    try {
      const res = await fetch(apiBase() + '/api/bills/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, reference }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.bill) return data;
      }
    } catch (_) {}
    return demoLookup(providerId, reference);
  }

  function history() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function savePayment(rec) {
    const list = history();
    list.unshift(rec);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
    try {
      const dons = JSON.parse(localStorage.getItem('dc_donations') || '[]');
      dons.push({
        id: rec.id,
        amount: rec.amount,
        method: rec.method,
        case: 'Utility bill — ' + rec.providerName,
        caseId: null,
        category: 'utility',
        billRef: rec.reference,
        providerId: rec.providerId,
        at: rec.at,
        type: 'bill_payment',
      });
      localStorage.setItem('dc_donations', JSON.stringify(dons));
    } catch (_) {}
    return rec;
  }

  async function pay(opts) {
    const o = opts || {};
    const providerId = o.providerId;
    const reference = String(o.reference || '').trim();
    const amount = Number(o.amount) || 0;
    const method = o.method || 'raast';
    if (!providerId || !reference || amount <= 0) {
      return { ok: false, error: 'Provider, reference, and amount required' };
    }
    const p = getProvider(providerId);
    if (!p) return { ok: false, error: 'Unknown provider' };

    let server = null;
    try {
      const res = await fetch(apiBase() + '/api/bills/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          reference,
          amount,
          method,
          anonymous: !!o.anonymous,
        }),
      });
      if (res.ok) server = await res.json();
    } catch (_) {}

    const id =
      (server && server.payment && server.payment.id) ||
      'BILL-' + Date.now().toString(36).toUpperCase();
    const rec = {
      id,
      providerId,
      providerName: p.name,
      reference,
      amount,
      method,
      at: new Date().toISOString(),
      status: 'paid',
      receiptNote:
        'Paid direct to ' + p.name + ' institutional account. No cash to beneficiary.',
      demo: !(server && server.ok),
    };
    savePayment(rec);

    if (window.DCLedger && typeof DCLedger.append === 'function') {
      try {
        DCLedger.append({
          type: 'bill_payment',
          ref: id,
          amount,
          meta: { providerId, reference },
        });
      } catch (_) {}
    }

    return { ok: true, payment: rec };
  }

  return {
    PROVIDERS,
    providers,
    getProvider,
    isEnabled,
    lookup,
    demoLookup,
    pay,
    history,
  };
})();

if (typeof window !== 'undefined') window.DCBills = DCBills;
