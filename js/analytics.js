/**
 * DonationChain analytics — aggregates local donation / application stores.
 * Admin + donor dashboards can mount charts without external chart libs.
 */
const DCAnalytics = (() => {
  function loadDonations() {
    try {
      return JSON.parse(localStorage.getItem("dc_donations") || "[]");
    } catch {
      return [];
    }
  }

  function loadApplications() {
    try {
      return JSON.parse(localStorage.getItem("dc_case_applications") || "[]");
    } catch {
      return [];
    }
  }

  function formatPKR(n) {
    return "PKR " + Number(n || 0).toLocaleString("en-PK");
  }

  function dayKey(iso) {
    const d = new Date(iso || Date.now());
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  function compute(options) {
    const opts = options || {};
    const days = Number(opts.days || 30);
    const list = loadDonations();
    const apps = loadApplications();
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    const totalAmount = list.reduce((s, d) => s + Number(d.amount || 0), 0);
    const count = list.length;
    const avg = count ? totalAmount / count : 0;
    const anonCount = list.filter((d) => d.anonymous || d.privacyMode === "anonymous").length;
    const anonRate = count ? (anonCount / count) * 100 : 0;

    const byMethod = {};
    const byCategory = {};
    const byCase = {};
    const byDay = {};

    // seed last N days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const k = d.toISOString().slice(0, 10);
      byDay[k] = { amount: 0, count: 0 };
    }

    list.forEach((d) => {
      const method = String(d.method || "other").toLowerCase();
      byMethod[method] = byMethod[method] || { amount: 0, count: 0 };
      byMethod[method].amount += Number(d.amount || 0);
      byMethod[method].count += 1;

      const cat = String(d.category || inferCategory(d.case) || "general").toLowerCase();
      byCategory[cat] = byCategory[cat] || { amount: 0, count: 0 };
      byCategory[cat].amount += Number(d.amount || 0);
      byCategory[cat].count += 1;

      const ctitle = d.case || "General";
      byCase[ctitle] = byCase[ctitle] || { amount: 0, count: 0 };
      byCase[ctitle].amount += Number(d.amount || 0);
      byCase[ctitle].count += 1;

      const t = new Date(d.date || d.createdAt || 0).getTime();
      if (t >= cutoff) {
        const k = dayKey(d.date || d.createdAt);
        if (k && byDay[k]) {
          byDay[k].amount += Number(d.amount || 0);
          byDay[k].count += 1;
        }
      }
    });

    const recent = list.filter((d) => {
      const t = new Date(d.date || 0).getTime();
      return t >= cutoff;
    });
    const recentAmount = recent.reduce((s, d) => s + Number(d.amount || 0), 0);

    const topCases = Object.entries(byCase)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const methods = Object.entries(byMethod)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount);

    const categories = Object.entries(byCategory)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount);

    const trend = Object.keys(byDay)
      .sort()
      .map((k) => ({ date: k, ...byDay[k] }));

    const appStats = {
      total: apps.length,
      byStatus: {},
    };
    apps.forEach((a) => {
      const st = a.status || "pending";
      appStats.byStatus[st] = (appStats.byStatus[st] || 0) + 1;
    });

    return {
      totalAmount,
      count,
      avg,
      anonCount,
      anonRate,
      recentAmount,
      recentCount: recent.length,
      days,
      methods,
      categories,
      topCases,
      trend,
      applications: appStats,
      formatPKR,
    };
  }

  function inferCategory(caseTitle) {
    const s = String(caseTitle || "").toLowerCase();
    if (/zakat/.test(s)) return "zakat";
    if (/hospital|medical|surgery|heart|cancer/.test(s)) return "medical";
    if (/school|education|fee|tuition/.test(s)) return "education";
    if (/food|ration|grocery/.test(s)) return "food";
    if (/bill|utility|lesco|electric/.test(s)) return "utility";
    return "general";
  }

  function barRows(items, maxAmount) {
    const max = maxAmount || Math.max(...items.map((i) => i.amount), 1);
    return items
      .map((i) => {
        const pct = Math.max(2, Math.round((i.amount / max) * 100));
        return (
          `<div class="mb-3">
            <div class="flex justify-between text-xs mb-1 gap-2">
              <span class="font-medium text-slate-700 truncate">${escapeHtml(labelize(i.name))}</span>
              <span class="text-slate-500 shrink-0">${formatPKR(i.amount)} · ${i.count}</span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full bg-primary" style="width:${pct}%"></div>
            </div>
          </div>`
        );
      })
      .join("");
  }

  function trendDelta(trend) {
    if (!trend || trend.length < 4) return { pct: 0, recent: 0, prior: 0 };
    const mid = Math.floor(trend.length / 2);
    const prior = trend.slice(0, mid).reduce((s, t) => s + t.amount, 0);
    const recent = trend.slice(mid).reduce((s, t) => s + t.amount, 0);
    const pct = prior > 0 ? ((recent - prior) / prior) * 100 : recent > 0 ? 100 : 0;
    return { pct, recent, prior };
  }

  /** Full donation trend chart: bars + line + axis labels + tooltips */
  function trendChart(trend, options) {
    const opts = options || {};
    const w = Number(opts.width || 640);
    const h = Number(opts.height || 220);
    const pad = { t: 16, r: 16, b: 36, l: 52 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const n = Math.max(trend.length, 1);
    const maxAmt = Math.max(...trend.map((t) => t.amount), 1);
    const maxCnt = Math.max(...trend.map((t) => t.count), 1);
    // nice y max
    const yMax = niceCeil(maxAmt);

    const grid = [];
    for (let g = 0; g <= 4; g++) {
      const val = (yMax / 4) * g;
      const y = pad.t + innerH - (val / yMax) * innerH;
      grid.push(
        `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w - pad.r}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>` +
          `<text x="${pad.l - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#94a3b8">${shortMoney(val)}</text>`
      );
    }

    const step = innerW / n;
    const barW = Math.max(2, step * 0.62);
    const bars = trend
      .map((t, i) => {
        const x = pad.l + i * step + (step - barW) / 2;
        const bh = (t.amount / yMax) * innerH;
        const y = pad.t + innerH - bh;
        const tip = `${t.date}: ${formatPKR(t.amount)} · ${t.count} gift(s)`;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, t.amount > 0 ? 2 : 0).toFixed(1)}" rx="3" fill="#1a56db" opacity="0.88"><title>${escapeHtml(tip)}</title></rect>`;
      })
      .join("");

    const linePts = trend
      .map((t, i) => {
        const x = pad.l + i * step + step / 2;
        const y = pad.t + innerH - (t.count / maxCnt) * innerH * 0.92;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const dots = trend
      .map((t, i) => {
        const x = pad.l + i * step + step / 2;
        const y = pad.t + innerH - (t.count / maxCnt) * innerH * 0.92;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#06b6d4"><title>${escapeHtml(t.date + ": " + t.count + " donations")}</title></circle>`;
      })
      .join("");

    // x labels: show ~6 ticks
    const labelEvery = Math.max(1, Math.ceil(n / 6));
    const xLabels = trend
      .map((t, i) => {
        if (i % labelEvery !== 0 && i !== n - 1) return "";
        const x = pad.l + i * step + step / 2;
        const label = t.date.slice(5); // MM-DD
        return `<text x="${x.toFixed(1)}" y="${h - 12}" text-anchor="middle" font-size="10" fill="#64748b">${label}</text>`;
      })
      .join("");

    const delta = trendDelta(trend);
    const deltaCls = delta.pct >= 0 ? "#059669" : "#dc2626";
    const deltaTxt =
      (delta.pct >= 0 ? "▲ +" : "▼ ") +
      Math.abs(delta.pct).toFixed(0) +
      "% vs prior half of range";

    return `
      <div class="dc-trend-chart">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-4 text-[11px] text-slate-500">
            <span class="inline-flex items-center gap-1.5"><span class="w-3 h-2 rounded-sm bg-primary inline-block"></span> Volume (PKR)</span>
            <span class="inline-flex items-center gap-1.5"><span class="w-3 h-0.5 bg-cyan-500 inline-block"></span> Gift count</span>
          </div>
          <span class="text-xs font-semibold" style="color:${deltaCls}">${deltaTxt}</span>
        </div>
        <svg viewBox="0 0 ${w} ${h}" class="w-full h-auto max-h-64" role="img" aria-label="Donation volume and count trend">
          ${grid.join("")}
          ${bars}
          <polyline fill="none" stroke="#06b6d4" stroke-width="2" points="${linePts}" opacity="0.9"/>
          ${dots}
          ${xLabels}
        </svg>
        <div class="grid grid-cols-3 gap-2 mt-3 text-center">
          <div class="rounded-lg bg-slate-50 px-2 py-2">
            <p class="text-[10px] uppercase text-slate-400 font-semibold">Period volume</p>
            <p class="text-sm font-bold text-slate-800">${formatPKR(trend.reduce((s, t) => s + t.amount, 0))}</p>
          </div>
          <div class="rounded-lg bg-slate-50 px-2 py-2">
            <p class="text-[10px] uppercase text-slate-400 font-semibold">Peak day</p>
            <p class="text-sm font-bold text-slate-800">${peakDayLabel(trend)}</p>
          </div>
          <div class="rounded-lg bg-slate-50 px-2 py-2">
            <p class="text-[10px] uppercase text-slate-400 font-semibold">Active days</p>
            <p class="text-sm font-bold text-slate-800">${trend.filter((t) => t.count > 0).length} / ${trend.length}</p>
          </div>
        </div>
      </div>`;
  }

  function peakDayLabel(trend) {
    if (!trend.length) return "—";
    let best = trend[0];
    trend.forEach((t) => {
      if (t.amount > best.amount) best = t;
    });
    if (!best.amount) return "—";
    return best.date.slice(5) + " · " + shortMoney(best.amount);
  }

  function shortMoney(n) {
    const v = Number(n) || 0;
    if (v >= 10000000) return (v / 10000000).toFixed(1) + "Cr";
    if (v >= 100000) return (v / 100000).toFixed(1) + "L";
    if (v >= 1000) return (v / 1000).toFixed(1) + "k";
    return String(Math.round(v));
  }

  function niceCeil(n) {
    if (n <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(n)));
    const f = n / exp;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  function sparkline(trend) {
    // compact fallback still used elsewhere if needed
    return trendChart(trend, { width: 640, height: 120 });
  }

  function labelize(name) {
    return String(name || "other")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function seedDemoTrend(days) {
    const n = Number(days || 30);
    const list = loadDonations();
    if (list.length) return false;
    const methods = ["raast", "jazzcash", "easypaisa", "card"];
    const cases = [
      "Heart surgery support",
      "School fees — grade 5",
      "Monthly food package",
      "Utility bill assistance",
      "Zakat distribution pool",
    ];
    const pool = ["dk_demo_a", "dk_demo_b", "dk_demo_c", "dk_demo_d", "dk_demo_e", "dk_demo_f", "dk_demo_g", "dk_demo_h"];
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      if (i % 5 === 0) continue;
      const gifts = 1 + Math.floor(Math.random() * 3);
      for (let g = 0; g < gifts; g++) {
        const amount = [500, 1000, 2500, 5000, 10000][Math.floor(Math.random() * 5)];
        const anon = Math.random() > 0.75;
        const key = anon ? null : pool[Math.floor(Math.random() * pool.length)];
        out.push({
          id: "DEMO-" + d.toISOString().slice(0, 10).replace(/-/g, "") + "-" + g + "-" + Math.floor(Math.random() * 99),
          amount,
          method: methods[Math.floor(Math.random() * methods.length)],
          case: cases[Math.floor(Math.random() * cases.length)],
          category: ["medical", "education", "food", "utility", "zakat"][Math.floor(Math.random() * 5)],
          anonymous: anon,
          privacyMode: anon ? "anonymous" : "named",
          donorKey: anon ? "anon_demo_" + Math.random().toString(36).slice(2, 8) : key,
          donorName: anon ? "Anonymous donor" : "Donor",
          publicName: anon ? "Anonymous donor" : "Donor",
          date: new Date(d.getTime() + g * 3600000).toISOString(),
          status: "completed",
          vendor: "Demo vendor",
          demo: true,
        });
      }
    }
    localStorage.setItem("dc_donations", JSON.stringify(out));
    return true;
  }

  /**
   * Donor retention from donation ledger.
   * Uses donorKey (opaque). Anonymous gifts are excluded from identity cohorts.
   */
  function computeRetention(list, options) {
    const opts = options || {};
    const days = Number(opts.days || 30);
    const now = Date.now();
    const cutoff = now - days * 86400000;
    const donations = (list || loadDonations()).slice().sort((a, b) => {
      return new Date(a.date || 0) - new Date(b.date || 0);
    });

    const byDonor = {};
    let anonGifts = 0;

    donations.forEach((d) => {
      if (d.anonymous || d.privacyMode === "anonymous" || String(d.donorKey || "").startsWith("anon_")) {
        anonGifts += 1;
        return;
      }
      const key = d.donorKey || d.donorRef || d.publicName || d.donorName;
      if (!key || key === "ANON" || key === "Anonymous donor") {
        anonGifts += 1;
        return;
      }
      if (!byDonor[key]) byDonor[key] = [];
      byDonor[key].push({
        date: d.date,
        amount: Number(d.amount || 0),
        t: new Date(d.date || 0).getTime(),
      });
    });

    Object.keys(byDonor).forEach((k) => {
      byDonor[k].sort((a, b) => a.t - b.t);
    });

    const donors = Object.keys(byDonor);
    const totalIdentified = donors.length;
    const repeatDonors = donors.filter((k) => byDonor[k].length >= 2).length;
    const oneTime = totalIdentified - repeatDonors;
    const retentionRate = totalIdentified ? (repeatDonors / totalIdentified) * 100 : 0;

    // gifts from repeat donors / all identified gifts
    let identifiedGifts = 0;
    let repeatGifts = 0;
    donors.forEach((k) => {
      const n = byDonor[k].length;
      identifiedGifts += n;
      if (n >= 2) repeatGifts += n;
    });
    const repeatGiftShare = identifiedGifts ? (repeatGifts / identifiedGifts) * 100 : 0;

    // Cohort: first gift in window half → returned in later half
    const mid = cutoff + (days * 86400000) / 2;
    let cohortNew = 0;
    let cohortReturned = 0;
    donors.forEach((k) => {
      const gifts = byDonor[k];
      const first = gifts[0];
      if (!first || first.t < cutoff) return;
      if (first.t <= mid) {
        cohortNew += 1;
        if (gifts.some((g) => g.t > mid)) cohortReturned += 1;
      }
    });
    const cohortRetention = cohortNew ? (cohortReturned / cohortNew) * 100 : 0;

    // Frequency buckets
    const buckets = { "1 gift": 0, "2 gifts": 0, "3–4 gifts": 0, "5+ gifts": 0 };
    donors.forEach((k) => {
      const n = byDonor[k].length;
      if (n === 1) buckets["1 gift"] += 1;
      else if (n === 2) buckets["2 gifts"] += 1;
      else if (n <= 4) buckets["3–4 gifts"] += 1;
      else buckets["5+ gifts"] += 1;
    });

    // Monthly cohorts (last 6 months): first seen month → % with 2nd gift later
    const monthCohorts = [];
    const monthMap = {};
    donors.forEach((k) => {
      const first = byDonor[k][0];
      if (!first || !first.t) return;
      const mk = new Date(first.t).toISOString().slice(0, 7);
      if (!monthMap[mk]) monthMap[mk] = { newDonors: 0, retained: 0 };
      monthMap[mk].newDonors += 1;
      if (byDonor[k].length >= 2) monthMap[mk].retained += 1;
    });
    Object.keys(monthMap)
      .sort()
      .slice(-6)
      .forEach((mk) => {
        const m = monthMap[mk];
        monthCohorts.push({
          month: mk,
          newDonors: m.newDonors,
          retained: m.retained,
          rate: m.newDonors ? (m.retained / m.newDonors) * 100 : 0,
        });
      });

    // Active in period vs returned from before period
    const activeInPeriod = new Set();
    const returningInPeriod = new Set();
    donors.forEach((k) => {
      const gifts = byDonor[k];
      const inPeriod = gifts.filter((g) => g.t >= cutoff);
      if (!inPeriod.length) return;
      activeInPeriod.add(k);
      const hadBefore = gifts.some((g) => g.t < cutoff);
      if (hadBefore) returningInPeriod.add(k);
    });

    const periodActive = activeInPeriod.size;
    const periodReturning = returningInPeriod.size;
    const periodNew = periodActive - periodReturning;
    const periodReturnRate = periodActive ? (periodReturning / periodActive) * 100 : 0;

    return {
      totalIdentified,
      repeatDonors,
      oneTime,
      retentionRate,
      repeatGiftShare,
      identifiedGifts,
      anonGifts,
      cohortNew,
      cohortReturned,
      cohortRetention,
      buckets,
      monthCohorts,
      periodActive,
      periodReturning,
      periodNew,
      periodReturnRate,
      days,
    };
  }

  function retentionChart(ret) {
    if (!ret) return "";
    const buckets = Object.entries(ret.buckets || {}).map(([name, count]) => ({
      name,
      count,
      amount: count, // reuse bar visual
    }));
    const maxB = Math.max(...buckets.map((b) => b.count), 1);
    const bucketBars = buckets
      .map((b) => {
        const pct = Math.max(2, Math.round((b.count / maxB) * 100));
        return `<div class="mb-2">
          <div class="flex justify-between text-xs mb-1"><span class="font-medium text-slate-700">${escapeHtml(b.name)}</span><span class="text-slate-500">${b.count} donors</span></div>
          <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full bg-emerald-500" style="width:${pct}%"></div></div>
        </div>`;
      })
      .join("");

    // cohort horizontal bars
    const cohorts = ret.monthCohorts || [];
    const cohortHtml = cohorts.length
      ? cohorts
          .map((c) => {
            const pct = Math.max(2, Math.round(c.rate));
            return `<div class="mb-2.5">
              <div class="flex justify-between text-xs mb-1 gap-2">
                <span class="font-medium text-slate-700">${escapeHtml(c.month)}</span>
                <span class="text-slate-500 shrink-0">${c.rate.toFixed(0)}% · ${c.retained}/${c.newDonors}</span>
              </div>
              <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full bg-primary" style="width:${pct}%"></div>
              </div>
            </div>`;
          })
          .join("")
      : '<p class="text-sm text-slate-400">Not enough history for monthly cohorts</p>';

    // gauge-like retention ring (SVG)
    const rate = Math.min(100, Math.max(0, ret.retentionRate || 0));
    const r = 36;
    const c = 2 * Math.PI * r;
    const dash = (rate / 100) * c;

    return `
      <div class="grid lg:grid-cols-3 gap-4 mb-6">
        <div class="card p-5 flex flex-col items-center justify-center text-center">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Repeat donor rate</p>
          <svg width="100" height="100" viewBox="0 0 100 100" class="mb-2" role="img" aria-label="Retention ${rate.toFixed(0)} percent">
            <circle cx="50" cy="50" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="10"/>
            <circle cx="50" cy="50" r="${r}" fill="none" stroke="#059669" stroke-width="10"
              stroke-linecap="round"
              stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"
              transform="rotate(-90 50 50)"/>
            <text x="50" y="54" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a">${rate.toFixed(0)}%</text>
          </svg>
          <p class="text-xs text-slate-500">${ret.repeatDonors} repeat · ${ret.oneTime} one-time</p>
          <p class="text-[11px] text-slate-400 mt-1">${ret.totalIdentified} identified donors (excl. khamosh)</p>
        </div>
        <div class="card p-5">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">In last ${ret.days} days</p>
          <p class="text-2xl font-extrabold mt-1">${ret.periodReturnRate.toFixed(0)}%</p>
          <p class="text-xs text-slate-500 mt-1">of active donors are returning</p>
          <div class="mt-4 grid grid-cols-2 gap-2 text-center">
            <div class="rounded-lg bg-emerald-50 px-2 py-2">
              <p class="text-lg font-bold text-emerald-700">${ret.periodReturning}</p>
              <p class="text-[10px] text-emerald-800 uppercase">Returning</p>
            </div>
            <div class="rounded-lg bg-slate-50 px-2 py-2">
              <p class="text-lg font-bold text-slate-700">${ret.periodNew}</p>
              <p class="text-[10px] text-slate-500 uppercase">New</p>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 mt-3">Half-range cohort: ${ret.cohortRetention.toFixed(0)}% (${ret.cohortReturned}/${ret.cohortNew || 0})</p>
        </div>
        <div class="card p-5">
          <p class="font-semibold text-slate-800 text-sm mb-3">Gift frequency</p>
          ${ret.totalIdentified ? bucketBars : '<p class="text-sm text-slate-400">No identified donors yet</p>'}
          <p class="text-[11px] text-slate-400 mt-2">Khamosh gifts (not linked): ${ret.anonGifts}</p>
        </div>
      </div>
      <div class="card p-5 mb-6">
        <p class="font-semibold text-slate-800 text-sm mb-1">Monthly acquisition cohorts</p>
        <p class="text-[11px] text-slate-400 mb-3">% of new donors in month who gave again later (lifetime so far)</p>
        ${cohortHtml}
      </div>`;
  }

  function renderAdmin(rootId, options) {
    const root = typeof rootId === "string" ? document.getElementById(rootId) : rootId;
    if (!root) return null;
    const stats = compute(options);
    const maxMethod = Math.max(...stats.methods.map((m) => m.amount), 1);
    const maxCat = Math.max(...stats.categories.map((c) => c.amount), 1);
    const maxCase = Math.max(...stats.topCases.map((c) => c.amount), 1);

    root.innerHTML = `
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card p-5">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total volume</p>
          <p class="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">${stats.formatPKR(stats.totalAmount)}</p>
          <p class="text-xs text-slate-400 mt-1">${stats.count} donations</p>
        </div>
        <div class="card p-5">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Last ${stats.days} days</p>
          <p class="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">${stats.formatPKR(stats.recentAmount)}</p>
          <p class="text-xs text-slate-400 mt-1">${stats.recentCount} gifts</p>
        </div>
        <div class="card p-5">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Average gift</p>
          <p class="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">${stats.formatPKR(Math.round(stats.avg))}</p>
          <p class="text-xs text-slate-400 mt-1">Per donation</p>
        </div>
        <div class="card p-5">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Khamosh rate</p>
          <p class="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">${stats.anonRate.toFixed(0)}%</p>
          <p class="text-xs text-slate-400 mt-1">${stats.anonCount} anonymous</p>
        </div>
      </div>

      <div class="mb-2">
        <p class="font-semibold text-slate-800 text-sm">Donor retention</p>
        <p class="text-[11px] text-slate-400 mb-3">Repeat rates use opaque donor keys — khamosh gifts stay unlinked for privacy</p>
        ${retentionChart(computeRetention(loadDonations(), { days: stats.days }))}
      </div>

      <div class="card p-5 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <p class="font-semibold text-slate-800 text-sm">Donation trends</p>
            <p class="text-[11px] text-slate-400">Daily volume (bars) + gift count (line) · last ${stats.days} days</p>
          </div>
          <button type="button" class="text-xs text-primary font-semibold" onclick="window.DCAnalytics && DCAnalytics.exportCsv()">Export CSV</button>
        </div>
        ${trendChart(stats.trend, { width: 720, height: 240 })}
        <p class="text-[11px] text-slate-400 mt-2">Hover bars for day detail. Data from browser donation ledger.
          ${stats.count === 0 && window.DCConfig && DCConfig.isProduction && DCConfig.isProduction() === false ? '<button type="button" class="ml-2 text-primary font-semibold" onclick="if(window.DCAnalytics&&DCAnalytics.seedDemoTrend){DCAnalytics.seedDemoTrend(30);DCAnalytics.renderAdmin(\'analytics-root\',{days:30});}">Load sample trend data</button>' : (stats.count === 0 ? " No donations in this browser yet." : "")}
        </p>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 mb-6">
        <div class="card p-5">
          <p class="font-semibold text-slate-800 text-sm mb-3">By payment method</p>
          ${stats.methods.length ? barRows(stats.methods, maxMethod) : '<p class="text-sm text-slate-400">No donations yet</p>'}
        </div>
        <div class="card p-5">
          <p class="font-semibold text-slate-800 text-sm mb-3">By category</p>
          ${stats.categories.length ? barRows(stats.categories, maxCat) : '<p class="text-sm text-slate-400">No category data</p>'}
        </div>
      </div>

      <div class="card p-5 mb-6">
        <p class="font-semibold text-slate-800 text-sm mb-3">Top cases by volume</p>
        ${stats.topCases.length ? barRows(stats.topCases, maxCase) : '<p class="text-sm text-slate-400">No case breakdown</p>'}
      </div>

      <div class="card p-5">
        <p class="font-semibold text-slate-800 text-sm mb-2">Applications pipeline</p>
        <div class="flex flex-wrap gap-3 text-sm">
          <span class="px-3 py-1.5 rounded-lg bg-slate-100 font-medium">Total ${stats.applications.total}</span>
          ${Object.entries(stats.applications.byStatus)
            .map(
              ([k, v]) =>
                `<span class="px-3 py-1.5 rounded-lg bg-blue-50 text-primary font-medium">${escapeHtml(k)}: ${v}</span>`
            )
            .join("") || '<span class="text-slate-400">No applications stored</span>'}
        </div>
      </div>
    `;
    return stats;
  }

  function exportCsv() {
    const list = loadDonations();
    const header = ["id", "date", "amount", "method", "case", "anonymous", "status", "vendor"];
    const lines = [header.join(",")];
    list.forEach((d) => {
      lines.push(
        [
          d.id,
          d.date,
          d.amount,
          d.method,
          JSON.stringify(d.case || ""),
          d.anonymous ? "1" : "0",
          d.status || "",
          JSON.stringify(d.vendor || ""),
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "donationchain-analytics.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return {
    compute,
    computeRetention,
    renderAdmin,
    exportCsv,
    loadDonations,
    formatPKR,
    trendChart,
    sparkline,
    retentionChart,
    seedDemoTrend,
  };
})();

if (typeof window !== "undefined") window.DCAnalytics = DCAnalytics;
