/**
 * DonationChain — Shariah Compliance Board (client)
 * Loads board, rulings, certificates; demo local fallback if API offline.
 */
const DCShariah = (() => {
  const LOCAL_KEY = 'dc_shariah_board_v1';

  const FALLBACK = {
    name: 'DonationChain Shariah Compliance Board',
    description:
      'Independent scholars oversee Zakat eligibility, Nisab/Hawl policy, and disbursement compliance. Payments never go as cash to personal beneficiary accounts.',
    members: [
      {
        id: 'sch-001',
        name: 'Mufti Ahmed Raza Khan',
        title: 'Chairman — Shariah Board',
        madhhab: 'Hanafi',
        credentials: 'Darul Uloom Karachi · 25+ years fatawa',
        active: true,
      },
      {
        id: 'sch-002',
        name: 'Dr. Ayesha Siddiqui',
        title: 'Member Scholar',
        madhhab: 'Hanafi',
        credentials: 'PhD Islamic Finance · IIUI',
        active: true,
      },
      {
        id: 'sch-003',
        name: 'Sheikh Bilal Mahmood',
        title: 'Member Scholar',
        madhhab: "Shafi'i",
        credentials: 'Al-Azhar · Zakat & Awqaf specialist',
        active: true,
      },
    ],
    rulings: [
      {
        id: 'rul-001',
        topic: 'Zakat eligibility — medical cases',
        summary:
          'Direct payment to registered hospitals for treatment of eligible asnaf (fuqara, masakin) is valid Zakat disbursement. Cash to beneficiary personal accounts is not permitted on this platform.',
        status: 'adopted',
        references: ['Quran 9:60', 'AAOIFI Shariah Standard 35'],
      },
      {
        id: 'rul-002',
        topic: 'Nisab & Hawl policy',
        summary:
          'Platform uses gold Nisab (87.48g / 7.5 tola) and full lunar Hawl (~354 days). Hawl may be self-declared by donor with audit trail; false declaration is religiously invalid.',
        status: 'adopted',
        references: ['Classical Hanafi texts', 'Pakistan Zakat & Ushr Ordinance principles'],
      },
      {
        id: 'rul-003',
        topic: 'Education fee as Zakat',
        summary:
          'School/university fees paid directly to the institution for students from asnaf households are acceptable Zakat, subject to verification of need and enrollment.',
        status: 'adopted',
        references: ['Contemporary fatawa on education support'],
      },
    ],
    stats: { members: 3, rulings: 3, caseReviews: 0, certificates: 0 },
  };

  function apiBase() {
    try {
      if (window.AdminAuth && AdminAuth.apiBase) return AdminAuth.apiBase();
      if (window.DCConfig && DCConfig.load) {
        const c = DCConfig.load();
        if (c.apiBase) return c.apiBase;
      }
    } catch (_) {}
    return 'http://localhost:4000';
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function saveLocal(data) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  async function fetchBoard() {
    try {
      const res = await fetch(apiBase() + '/api/shariah/board', { credentials: 'omit' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          saveLocal(data);
          return data;
        }
      }
    } catch (_) {}
    return loadLocal() || FALLBACK;
  }

  function asnafLabels() {
    return [
      { id: 'fuqara', label: 'Fuqara (poor)' },
      { id: 'masakin', label: 'Masakin (needy)' },
      { id: 'amilin', label: 'Amilin (administrators)' },
      { id: 'muallafat', label: 'Mu’allafat al-qulub' },
      { id: 'riqab', label: 'Riqab (emancipation)' },
      { id: 'gharimin', label: 'Gharimin (debtors)' },
      { id: 'fisabilillah', label: 'Fi sabilillah' },
      { id: 'ibn_sabil', label: 'Ibn al-sabil (traveler)' },
    ];
  }

  function renderMembers(container, members) {
    if (!container) return;
    const list = members || [];
    container.innerHTML = list
      .map(
        (m) => `
      <div class="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            ${(m.name || 'S').split(' ').map(p => p[0]).slice(0,2).join('')}
          </div>
          <div>
            <p class="font-bold text-slate-900">${escapeHtml(m.name)}</p>
            <p class="text-xs text-emerald-700 font-semibold mt-0.5">${escapeHtml(m.title || '')}</p>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(m.madhhab || '')} · ${escapeHtml(m.credentials || '')}</p>
          </div>
        </div>
      </div>`
      )
      .join('');
  }

  function renderRulings(container, rulings) {
    if (!container) return;
    const list = rulings || [];
    container.innerHTML = list
      .map(
        (r) => `
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Adopted</span>
          <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(r.id || '')}</span>
        </div>
        <h3 class="font-bold text-slate-900 text-sm sm:text-base">${escapeHtml(r.topic)}</h3>
        <p class="text-sm text-slate-600 mt-2 leading-relaxed">${escapeHtml(r.summary)}</p>
        ${
          r.references && r.references.length
            ? `<p class="text-xs text-slate-400 mt-3"><i class="fas fa-book-open mr-1"></i>${r.references.map(escapeHtml).join(' · ')}</p>`
            : ''
        }
      </article>`
      )
      .join('');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function mountPublic(opts) {
    const o = opts || {};
    const data = await fetchBoard();
    if (o.membersEl) renderMembers(document.getElementById(o.membersEl), data.members);
    if (o.rulingsEl) renderRulings(document.getElementById(o.rulingsEl), data.rulings);
    if (o.statsEl) {
      const el = document.getElementById(o.statsEl);
      if (el && data.stats) {
        el.innerHTML = `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p class="text-2xl font-extrabold text-emerald-800">${data.stats.members || 0}</p><p class="text-[10px] uppercase text-emerald-600 font-semibold">Scholars</p></div>
            <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p class="text-2xl font-extrabold text-emerald-800">${data.stats.rulings || (data.rulings || []).length}</p><p class="text-[10px] uppercase text-emerald-600 font-semibold">Rulings</p></div>
            <div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><p class="text-2xl font-extrabold text-slate-800">${data.stats.caseReviews || 0}</p><p class="text-[10px] uppercase text-slate-500 font-semibold">Case reviews</p></div>
            <div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><p class="text-2xl font-extrabold text-slate-800">${data.stats.certificates || 0}</p><p class="text-[10px] uppercase text-slate-500 font-semibold">Certificates</p></div>
          </div>`;
      }
    }
    return data;
  }

  return {
    fetchBoard,
    mountPublic,
    asnafLabels,
    FALLBACK,
  };
})();

if (typeof window !== 'undefined') window.DCShariah = DCShariah;
