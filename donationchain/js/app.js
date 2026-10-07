// DonationChain — Professional Core App
const DC = {
  cases: [
    { id: 1, title: "Heart Surgery — Amina, 7 yrs", category: "medical", city: "Cairo", country: "EG", currency: "EGP", amount: 185000, raised: 120000, urgency: "critical", verified: true, vendor: "Children's Cancer Hospital Egypt", desc: "Congenital heart repair. Hospital invoice verified; direct institutional payout." },
    { id: 2, title: "Secondary School Fees — Fatima", category: "education", city: "Jakarta", country: "ID", currency: "IDR", amount: 8500000, raised: 5200000, urgency: "high", verified: true, vendor: "SMA Negeri Partner School", desc: "Annual fees + books. Enrollment confirmed by school accounts office." },
    { id: 3, title: "Monthly Food Package — Family of 6", category: "food", city: "Nairobi", country: "KE", currency: "KES", amount: 18000, raised: 11000, urgency: "medium", verified: true, vendor: "Verified Grocery Cooperative", desc: "Staples for 30 days. GPS delivery with photo proof." },
    { id: 4, title: "Electricity Arrears — Widow Household", category: "utility", city: "Lahore", country: "PK", currency: "PKR", amount: 18500, raised: 12000, urgency: "high", verified: true, vendor: "Regional Power Utility", desc: "Overdue electricity bill. Direct payment to utility account only." },
    { id: 5, title: "Cancer Treatment — Cycle 3", category: "medical", city: "Istanbul", country: "TR", currency: "TRY", amount: 95000, raised: 61000, urgency: "critical", verified: true, vendor: "Acibadem Healthcare Group", desc: "Chemotherapy cycle. Hospital invoice verified." },
    { id: 6, title: "University Semester Fee — Engineering", category: "education", city: "Dhaka", country: "BD", currency: "BDT", amount: 45000, raised: 28000, urgency: "medium", verified: true, vendor: "BUET Partner Accounts", desc: "Semester fee. Direct transfer to university account." },
    { id: 7, title: "Emergency Medicines — Elderly Couple", category: "medical", city: "Kuala Lumpur", country: "MY", currency: "MYR", amount: 2200, raised: 900, urgency: "high", verified: true, vendor: "Verified Community Pharmacy", desc: "Prescription verified. Pharmacy fulfillment only." },
    { id: 8, title: "Ramadan Food Drive — 20 Families", category: "food", city: "Amman", country: "JO", currency: "JOD", amount: 3200, raised: 2100, urgency: "medium", verified: true, vendor: "Local NGO Partner", desc: "Bulk ration packs. Community distribution with OTP confirmation." },
    { id: 9, title: "Gas Utility Bill — Low-income Family", category: "utility", city: "Casablanca", country: "MA", currency: "MAD", amount: 1450, raised: 400, urgency: "high", verified: true, vendor: "National Gas Utility", desc: "Winter arrears. Pay exact bill to utility account only." },
    { id: 10, title: "Water Board Bill — Orphan Household", category: "utility", city: "Lagos", country: "NG", currency: "NGN", amount: 85000, raised: 12000, urgency: "medium", verified: true, vendor: "Municipal Water Board", desc: "Connection at risk. Direct board payment." }
  ],
  selectedCase: null,
  filter: "all",
  search: "",
  user: null
};


function formatPKR(n) {
  // Global: uses selected country currency (not PKR-only)
  if (window.DCLocales && DCLocales.formatMoney) {
    return DCLocales.formatMoney(n);
  }
  if (window.DCZakat && DCZakat.formatZakatMoney) {
    return DCZakat.formatZakatMoney(n);
  }
  const cur = (window.DCConfig && DCConfig.load().general.defaultCurrency) || "USD";
  return cur + " " + Number(n || 0).toLocaleString();
}
function formatMoney(n) {
  return formatPKR(n);
}

function urgencyMeta(u) {
  const tr = (k, f) => (typeof t === "function" ? t(k) : f);
  const map = {
    critical: { label: tr("urgency.critical", "Critical"), cls: "bg-red-100 text-red-700", bar: "bg-red-500" },
    high: { label: tr("urgency.high", "High"), cls: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
    medium: { label: tr("urgency.medium", "Medium"), cls: "bg-slate-100 text-slate-600", bar: "bg-slate-300" }
  };
  return map[u] || map.medium;
}

function getFilteredCases() {
  let list = DC.cases;
  if (DC.filter !== "all") list = list.filter(c => c.category === DC.filter);
  if (DC.search.trim()) {
    const q = DC.search.toLowerCase();
    list = list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.vendor.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }
  return list;
}


function orgBadgeHtml(vendorName) {
  if (!window.DCOrgs) return "";
  const org = DCOrgs.findByName(vendorName);
  const b = DCOrgs.badge(org);
  const pay = org && DCOrgs.canReceivePayment(org);
  const title = org
    ? (pay ? "Organization verified for direct payment" : "Organization not yet cleared for payment")
    : "Organization not in registry";
  return ` <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${b.cls}" title="${title}"><i class="fas fa-building-columns"></i> ${b.label}</span>`;
}

function renderCases() {
  const grid = document.getElementById("cases-grid");
  const empty = document.getElementById("cases-empty");
  const countEl = document.getElementById("cases-count");
  if (!grid) return;

  const list = getFilteredCases();
  if (countEl) countEl.textContent = list.length + " case" + (list.length !== 1 ? "s" : "");

  if (!list.length) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  grid.innerHTML = list.map(c => {
    const pct = Math.min(100, Math.round((c.raised / c.amount) * 100));
    const u = urgencyMeta(c.urgency);
    return `
      <article class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-primary/30 transition group overflow-hidden flex flex-col">
        <div class="h-1 ${u.bar}"></div>
        <div class="p-5 flex flex-col flex-1">
          <div class="flex items-start justify-between gap-2 mb-3">
            <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${u.cls}">${u.label}</span>
            ${c.verified ? '<span class="text-success text-xs font-semibold flex items-center gap-1"><i class="fas fa-shield-halved"></i> ' + (typeof t === "function" ? t("cases.verified") : "Verified") + '</span>' : ""}
          </div>
          <h3 class="font-bold text-slate-900 text-[15px] leading-snug mb-1 group-hover:text-primary transition">${c.title}</h3>
          <p class="text-xs text-slate-500 mb-2"><i class="fas fa-location-dot mr-1"></i>${c.city} · ${c.vendor}${typeof orgBadgeHtml === "function" ? orgBadgeHtml(c.vendor) : ""}</p>
          <p class="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">${c.desc}</p>
          <div class="mb-1 flex justify-between text-xs">
            <span class="font-semibold text-slate-800">${formatPKR(c.raised)}</span>
            <span class="text-slate-500">${typeof t === "function" ? t("cases.goal") : "Goal"} ${formatPKR(c.amount)}</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 mb-1">
            <div class="bg-primary h-2 rounded-full transition-all" style="width:${pct}%"></div>
          </div>
          <p class="text-[11px] text-slate-400 mb-4">${pct}% ${(typeof t === "function" ? t("cases.funded") : "funded")} · ${formatPKR(c.amount - c.raised)} ${(typeof t === "function" ? t("cases.remaining") : "remaining")}</p>
          <div class="flex gap-2">
            <button onclick="openCaseDetail(${c.id})" class="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">${typeof t === "function" ? t("cases.details") : "Details"}</button>
            <button onclick="selectCase(${c.id})" class="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-1">
              <i class="fas fa-heart text-xs"></i> ${typeof t === "function" ? t("cases.donate") : "Donate"}
            </button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function selectCase(id) {
  DC.selectedCase = DC.cases.find(c => c.id === id) || null;
  if (DC.selectedCase && window.DCOrgs) {
    const org = DCOrgs.findByName(DC.selectedCase.vendor);
    if (org && !DCOrgs.canReceivePayment(org)) {
      showToast("This organization is not fully verified for payments yet.");
      return;
    }
  }
  openDonate(false);
}

function openDonate(isZakat) {
  if (window.DCRBAC) {
    const check = DCRBAC.assertDonorForDonate();
    if (!check.ok) {
      showToast(check.message);
    }
  }
  if (window.DCConfig) {
    const f = DCConfig.load().features;
    if (f.requireLoginToDonate && !localStorage.getItem("dc_user")) {
      openLogin();
      showToast(typeof t === "function" ? t("toast.loginDonate") : "Please login to donate");
      return;
    }
    if (DCConfig.load().general.maintenanceMode) {
      showToast(typeof t === "function" ? t("toast.maintenance") : "Maintenance mode");
      return;
    }
  }
  const modal = document.getElementById("donate-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";

  const titleEl = document.getElementById("donate-case-title");
  const amountEl = document.getElementById("donate-amount");
  const err = document.getElementById("donate-error");
  if (err) { err.classList.add("hidden"); err.textContent = ""; }

  if (isZakat) {
    DC.selectedCase = null;
    if (titleEl) titleEl.textContent = "Zakat distribution to eligible verified cases";
    const z = document.getElementById("zakat-amount");
    if (amountEl) amountEl.value = (z && z.textContent.replace(/,/g, "")) || "5000";
  } else if (DC.selectedCase) {
    if (titleEl) titleEl.textContent = DC.selectedCase.title + " · " + DC.selectedCase.city;
    if (amountEl) amountEl.value = Math.min(5000, Math.max(500, DC.selectedCase.amount - DC.selectedCase.raised));
  } else {
    if (titleEl) titleEl.textContent = "General support for verified cases";
    if (amountEl) amountEl.value = "5000";
  }
}

function closeDonate() {
  const modal = document.getElementById("donate-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "";
}

function openLogin() {
  const modal = document.getElementById("login-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeLogin() {
  const modal = document.getElementById("login-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "";
}

async function sendOTP() {
  const phone = (document.getElementById("login-phone")?.value || "").trim();
  if (phone.length < 10) {
    showToast(typeof t === "function" ? t("toast.phone") : "Enter a valid mobile number");
    return;
  }
  const roleEl = document.querySelector('input[name="login-role"]:checked');
  const role = roleEl ? roleEl.value : "donor";
  const btn = document.querySelector('#login-modal button[onclick="sendOTP()"]');
  if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  try {
    if (window.DCAuth) {
      const data = await DCAuth.requestOtp(phone, role);
      document.getElementById("otp-section")?.classList.remove("hidden");
      const hint = data.code
        ? ("OTP sent")
        : (typeof t === "function" ? t("toast.otp") : "OTP sent to your phone");
      showToast(hint);
      if (data.code) {
        const otpInput = document.getElementById("login-otp");
        if (otpInput && data.mock) otpInput.placeholder = "Code: " + data.code;
      }
    } else {
      document.getElementById("otp-section")?.classList.remove("hidden");
      showToast(typeof t === "function" ? t("toast.otp") : "OTP sent");
    }
  } catch (e) {
    document.getElementById("otp-section")?.classList.remove("hidden");
    showToast(e.message || "Could not send OTP");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = typeof t === "function" ? t("login.send") : "Send OTP"; }
  }
}

async function verifyOTP() {
  const otp = (document.getElementById("login-otp")?.value || "").trim();
  const phone = (document.getElementById("login-phone")?.value || "").trim();
  const name = (document.getElementById("login-name")?.value || "").trim();
  const roleEl = document.querySelector('input[name="login-role"]:checked');
  const role = roleEl ? roleEl.value : "donor";
  if (!otp || otp.length < 4) {
    showToast(typeof t === "function" ? t("toast.badOtp") : "Enter OTP");
    return;
  }
  try {
    let data;
    if (window.DCAuth) {
      data = await DCAuth.verifyOtp(phone, otp, role, name || undefined);
    } else if (otp === "123456") {
      data = {
        user: {
          phone,
          name: name || "Donor",
          role: role === "seeker" ? "seeker" : "donor",
          loggedInAt: new Date().toISOString(),
        },
      };
      localStorage.setItem("dc_user", JSON.stringify(data.user));
    } else {
      showToast(typeof t === "function" ? t("toast.badOtp") : "Invalid OTP");
      return;
    }
    DC.user = data.user || DCAuth.getUser();
    closeLogin();
    showToast(typeof t === "function" ? t("toast.welcome") : "Welcome back");
    updateAuthUI();
    const r = (DC.user && DC.user.role) || role;
    const dest = r === "seeker" || r === "needy" ? "apply.html" : "donor/dashboard.html";
    setTimeout(() => { window.location.href = dest; }, 500);
  } catch (e) {
    showToast(e.message || (typeof t === "function" ? t("toast.badOtp") : "Invalid OTP"));
  }
}

function updateAuthUI() {
  const user = (window.DCAuth && DCAuth.getUser()) || (() => {
    try { return JSON.parse(localStorage.getItem("dc_user") || "null"); } catch { return null; }
  })();
  const btn = document.getElementById("nav-auth-btn");
  const logoutBtn = document.getElementById("nav-logout-btn");
  if (!btn) return;
  if (user) {
    DC.user = user;
    const isSeeker = user.role === "seeker" || user.role === "needy";
    btn.textContent = typeof t === "function" ? t("nav.dashboard") : (isSeeker ? "My application" : "Dashboard");
    btn.onclick = () => {
      window.location.href = isSeeker ? "apply.html" : "donor/dashboard.html";
    };
    if (logoutBtn) logoutBtn.classList.remove("hidden");
  } else {
    btn.textContent = typeof t === "function" ? t("nav.login") : "Login";
    btn.onclick = () => openLogin();
    if (logoutBtn) logoutBtn.classList.add("hidden");
  }
}

function logoutUser() {
  if (window.DCAuth) DCAuth.logout();
  else {
    localStorage.removeItem("dc_user");
    if (window.DCRBAC && DCRBAC.clearSession) DCRBAC.clearSession();
  }
  DC.user = null;
  updateAuthUI();
  showToast("Logged out");
}

function setQuickAmount(v) {
  const el = document.getElementById("donate-amount");
  if (el) el.value = v;
}

async function processPayment() {
  const amountEl = document.getElementById("donate-amount");
  const err = document.getElementById("donate-error");
  const amount = Number(amountEl?.value || 0);
  let method = document.querySelector('input[name="paymethod"]:checked')?.value || "card";
  if (method === "stripe") method = "card";
  const anon = document.getElementById("anonymous")?.checked;

  const dcfg = window.DCConfig ? DCConfig.load().donations : { minAmount: 100, maxAmount: 500000 };
  const minA = dcfg.minAmount || 100;
  const maxA = dcfg.maxAmount || 500000;
  if (!amount || amount < minA) {
    if (err) { err.textContent = "Minimum donation is PKR " + minA.toLocaleString() + "."; err.classList.remove("hidden"); }
    return;
  }
  if (amount > maxA) {
    if (err) { err.textContent = "Maximum per transaction is PKR " + maxA.toLocaleString() + "."; err.classList.remove("hidden"); }
    return;
  }
  if (err) err.classList.add("hidden");

  const btn = document.getElementById("pay-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Initiating…';
  }

  const caseTitle = DC.selectedCase ? DC.selectedCase.title : "General / Zakat";
  const vendor = DC.selectedCase?.vendor || "Platform Pool";
  const isZakatFlow = !DC.selectedCase || /zakat/i.test(String(caseTitle || ""));

  try {
    let paymentId = null;
    let providerRef = null;
    let payStatus = "completed";
    let mode = "local";

    if (window.DCPayments) {
      const result = await DCPayments.payAndWait(
        {
          amount,
          method,
          caseId: DC.selectedCase?.id || null,
          caseTitle,
          vendorName: vendor,
          purpose: isZakatFlow ? "zakat" : "donation",
          anonymous: !!anon,
          idempotencyKey: "don-" + Date.now() + "-" + amount,
        },
        {
          timeoutMs: 40000,
          onUpdate: (s) => {
            if (!btn) return;
            const st = s.status || "pending";
            btn.innerHTML =
              '<i class="fas fa-spinner fa-spin mr-2"></i> ' +
              (st === "pending"
                ? "Raast pending…"
                : st === "processing"
                  ? "Settling…"
                  : st === "settled"
                    ? "Confirmed"
                    : st);
          },
        }
      );
      paymentId = result.payment.id || result.status.id;
      providerRef = result.payment.providerRef || result.status.providerRef;
      payStatus = result.status.status || "settled";
      mode = result.payment.mode || "sandbox";
    }

    const receiptId = paymentId || "DC-" + Date.now().toString(36).toUpperCase();
    const donations = JSON.parse(localStorage.getItem("dc_donations") || "[]");
    let realName = null;
    let realPhone = null;
    try {
      const u = (window.DCAuth && DCAuth.getUser()) || JSON.parse(localStorage.getItem("dc_user") || "null");
      if (u) {
        realName = u.name || null;
        realPhone = u.phone || null;
      }
    } catch (_) {}
    // Persist preference when checkbox used
    if (window.DCPrivacy && typeof DCPrivacy.setPreferAnonymous === "function") {
      // only set true when checked this time (don't force off global prefer)
      if (anon) DCPrivacy.setPreferAnonymous(true);
    }
    const rawRecord = {
      id: receiptId,
      amount,
      method,
      case: caseTitle,
      caseId: DC.selectedCase?.id || null,
      city: DC.selectedCase?.city || "—",
      vendor,
      anonymous: !!anon,
      privacyMode: anon ? "anonymous" : "named",
      date: new Date().toISOString(),
      status: payStatus === "settled" || payStatus === "completed" ? "completed" : payStatus,
      proof: "Vendor proof within 48 hours",
      platformFeePercent: (window.DCConfig ? DCConfig.load().donations.platformFeePercent : 0) || 0,
      providerRef,
      paymentMode: mode,
      realtime: !!window.DCPayments,
      donorName: anon ? "Anonymous donor" : (realName || "Donor"),
    };
    // Public store never keeps real name for khamosh donors
    const record = window.DCPrivacy && DCPrivacy.toPublicDonation
      ? DCPrivacy.toPublicDonation(rawRecord, { name: realName })
      : rawRecord;
    if (anon && window.DCPrivacy && DCPrivacy.savePrivateDonationMeta) {
      DCPrivacy.savePrivateDonationMeta(record, realName, realPhone);
    }

    try {
      if (window.Ledger) {
        const block = await Ledger.appendDonation(record);
        record.blockHash = block.hash;
        record.blockIndex = block.index;
        record.prevHash = block.prevHash;
      }
      if (window.DCContract) {
        if (DCContract.isConfigured()) {
          record.onChainPending = true;
        } else {
          DCContract.simulateAnchor(record);
        }
      }
      try {
        if (window.Merkle) await Merkle.rebuildFromDonations();
      } catch (me) {
        console.warn("Merkle batch rebuild failed", me);
      }
    } catch (e) {
      console.warn("Ledger/contract anchor failed", e);
    }

    if (isZakatFlow) record.category = "zakat";

    donations.unshift(record);
    localStorage.setItem("dc_donations", JSON.stringify(donations));

    try {
      if (isZakatFlow && window.DCZakat) {
        DCZakat.recordPayment(amount, receiptId);
      }
    } catch (ze) {
      console.warn("Zakat Hawl payment record failed", ze);
    }

    if (DC.selectedCase) {
      const c = DC.cases.find((x) => x.id === DC.selectedCase.id);
      if (c) c.raised = Math.min(c.amount, c.raised + amount);
      renderCases();
    }

    if (window.DCSMS) {
      try {
        let donorPhone = "";
        try {
          const sess = JSON.parse(sessionStorage.getItem("dc_donor_session") || "null");
          if (sess && sess.phone) donorPhone = sess.phone;
        } catch (_) {}
        if (!donorPhone) donorPhone = localStorage.getItem("dc_user_phone") || "";
        DCSMS.notifyDonation({
          donorPhone: donorPhone || undefined,
          beneficiaryPhone: undefined,
          amount: record.amount,
          receiptId: record.id,
          caseTitle: record.case || "",
        });
      } catch (_) {}
    }

    closeDonate();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Pay Securely <i class="fas fa-lock ml-2 text-sm"></i>';
    }
    showReceipt(record);
  } catch (e) {
    if (err) {
      err.textContent = e.message || "Payment failed";
      err.classList.remove("hidden");
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Pay Securely <i class="fas fa-lock ml-2 text-sm"></i>';
    }
  }
}

function showReceipt(r) {
  const modal = document.getElementById("receipt-modal");
  if (!modal) {
    showToast("Payment successful · " + formatPKR(r.amount));
    return;
  }
  document.getElementById("receipt-id").textContent = r.id;
  document.getElementById("receipt-amount").textContent = formatPKR(r.amount);
  document.getElementById("receipt-case").textContent = r.case;
  document.getElementById("receipt-method").textContent = r.method.toUpperCase();
  document.getElementById("receipt-date").textContent = new Date(r.date).toLocaleString();
  document.getElementById("receipt-vendor").textContent = r.vendor;
  const donorEl = document.getElementById("receipt-donor");
  if (donorEl) {
    const label = window.DCPrivacy && DCPrivacy.publicDonorLabel
      ? DCPrivacy.publicDonorLabel(r)
      : (r.anonymous ? "Anonymous donor" : (r.donorName || "Donor"));
    donorEl.textContent = label;
  }
  const anonBadge = document.getElementById("receipt-anon-badge");
  if (anonBadge) {
    if (r.anonymous) anonBadge.classList.remove("hidden");
    else anonBadge.classList.add("hidden");
  }

  const hashEl = document.getElementById("receipt-hash");
  const idxEl = document.getElementById("receipt-block");
  const statusEl = document.getElementById("receipt-chain-status");
  if (hashEl) {
    hashEl.textContent = r.blockHash
      ? (window.Ledger ? Ledger.shortHash(r.blockHash) : r.blockHash.slice(0, 16) + "…")
      : "Pending";
    hashEl.title = r.blockHash || "";
  }
  if (idxEl) idxEl.textContent = r.blockIndex != null ? "#" + r.blockIndex : "—";
  if (statusEl) {
    statusEl.innerHTML = r.blockHash
      ? '<span class="text-success font-semibold"><i class="fas fa-link mr-1"></i>Anchored on ledger</span>'
      : '<span class="text-slate-400">Not anchored</span>';
  }
  const merkleEl = document.getElementById("receipt-merkle");
  if (merkleEl && window.Merkle) {
    Merkle.verifyReceiptMerkle(r.id).then((mr) => {
      if (mr.found && mr.valid) {
        merkleEl.textContent = "Included · " + Merkle.short(mr.root);
        merkleEl.title = mr.root;
      } else {
        merkleEl.textContent = "Batch pending";
      }
    }).catch(() => { merkleEl.textContent = "—"; });
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

async function verifyReceiptInput() {
  const input = document.getElementById("verify-receipt-id");
  const out = document.getElementById("verify-result");
  if (!input || !out || !window.Ledger) return;
  const id = (input.value || "").trim();
  if (!id) {
    out.innerHTML = '<p class="text-warning text-sm">Enter a receipt ID (e.g. DC-…)</p>';
    return;
  }
  out.innerHTML = '<p class="text-slate-500 text-sm"><i class="fas fa-spinner fa-spin mr-1"></i> Verifying…</p>';
  const result = await Ledger.verifyReceipt(id);
  if (!result.found) {
    out.innerHTML = `<p class="text-danger text-sm font-medium"><i class="fas fa-times-circle mr-1"></i> ${result.error || "Not found"}</p>
      <p class="text-xs text-slate-500 mt-1">Chain valid: ${result.chainValid ? "yes" : "no"}</p>`;
    return;
  }
  const b = result.block;
  out.innerHTML = `
    <div class="text-sm space-y-1.5">
      <p class="text-success font-semibold"><i class="fas fa-shield-halved mr-1"></i> Verified on ledger</p>
      <p><span class="text-slate-500">Block</span> #${b.index}</p>
      <p class="break-all"><span class="text-slate-500">Hash</span> <span class="font-mono text-xs">${b.hash}</span></p>
      <p class="break-all"><span class="text-slate-500">Prev</span> <span class="font-mono text-xs">${b.prevHash}</span></p>
      <p><span class="text-slate-500">Amount</span> ${formatPKR(b.data.amount)} · ${b.data.vendor}</p>
    </div>`;
}

function closeReceipt() {
  const modal = document.getElementById("receipt-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "";
}

function calcZakat() {
  const gold = Number(document.getElementById("zakat-gold")?.value) || 0;
  const silver = Number(document.getElementById("zakat-silver")?.value) || 0;
  const cash = Number(document.getElementById("zakat-cash")?.value) || 0;
  const business = Number(document.getElementById("zakat-business")?.value) || 0;
  const hawlCheck = document.getElementById("zakat-hawl-declare");
  const forceHawl = hawlCheck ? hawlCheck.checked : false;

  const useTola = window.DCLocales && DCLocales.getCountry && DCLocales.getCountry().goldUnit === "tola";
  const assets = useTola
    ? { goldTola: gold, silverTola: silver, cash, business, liabilities: 0 }
    : { goldGrams: gold, silverGrams: silver, cash, business, liabilities: 0 };

  let result;
  if (window.DCZakat) {
    result = DCZakat.calculate(assets, { forceHawlComplete: forceHawl });
  } else {
    const zcfg = window.DCConfig ? DCConfig.load().zakat : { goldPricePerGram: 75, ratePercent: 2.5, nisabGoldGrams: 85 };
    const total = gold * (zcfg.goldPricePerGram || 75) + cash + business;
    const nisab = (zcfg.nisabGoldGrams || 85) * (zcfg.goldPricePerGram || 75);
    const rate = (zcfg.ratePercent || 2.5) / 100;
    const due = total >= nisab ? Math.round(total * rate) : 0;
    result = {
      netWealth: total,
      nisab,
      aboveNisab: total >= nisab,
      zakatDue: due,
      remaining: due,
      alreadyPaid: 0,
      hawl: { completed: true, status: "unknown", message: "Hawl module not loaded — showing 2.5% if above Nisab.", progressPercent: 0, daysRemaining: 0 },
    };
  }

  const fmt = (n) =>
    window.DCZakat && DCZakat.formatZakatMoney
      ? DCZakat.formatZakatMoney(n)
      : (result.currencySymbol || result.currency || "") + " " + Number(n || 0).toLocaleString();

  const el = document.getElementById("zakat-amount");
  const box = document.getElementById("zakat-result");
  const base = document.getElementById("zakat-base");
  const nisabEl = document.getElementById("zakat-nisab");
  const hawlEl = document.getElementById("zakat-hawl-status");
  const remainEl = document.getElementById("zakat-remaining");
  const progressEl = document.getElementById("zakat-hawl-progress");

  if (el) el.textContent = fmt(result.zakatDue || 0);
  if (base) base.textContent = fmt(result.netWealth);
  if (nisabEl) nisabEl.textContent = fmt(result.nisab) + (result.nisabGoldGrams ? " · " + result.nisabGoldGrams + "g gold" : "");
  if (remainEl) remainEl.textContent = fmt(result.remaining || 0);

  if (hawlEl) {
    hawlEl.textContent = result.hawl.message || "";
    hawlEl.className = "text-xs mt-2 " + (result.hawl.completed ? "text-emerald-300" : result.hawl.status === "below_nisab" ? "text-amber-300" : "text-cyan-300");
  }
  if (progressEl) {
    const pct = result.hawl.progressPercent || 0;
    progressEl.style.width = pct + "%";
    progressEl.parentElement?.classList.toggle("hidden", result.hawl.status === "below_nisab");
  }

  if (box) box.classList.remove("hidden");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(window.__dcToast);
  window.__dcToast = setTimeout(() => t.classList.add("hidden"), 3200);
}

function setFilter(filter, btn) {
  DC.filter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => {
    b.classList.remove("bg-primary", "text-white", "shadow-md");
    b.classList.add("bg-white", "text-slate-600", "border-slate-200");
  });
  if (btn) {
    btn.classList.add("bg-primary", "text-white", "shadow-md");
    btn.classList.remove("bg-white", "text-slate-600", "border-slate-200");
  }
  renderCases();
}

document.addEventListener("DOMContentLoaded", function _dcLocaleBoot(ev) { try { initGlobalLocaleUI(); } catch (_) {} });
document.addEventListener("DOMContentLoaded", () => {
  applyAdminConfig();
  updateAuthUI();
  renderCases();

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter || "all", btn));
  });

  const search = document.getElementById("case-search");
  if (search) {
    search.addEventListener("input", () => {
      DC.search = search.value;
      renderCases();
    });
  }

  // Close modals on backdrop click
  ["donate-modal", "login-modal", "receipt-modal", "case-detail-modal"].forEach(id => {
    const m = document.getElementById(id);
    if (!m) return;
    m.addEventListener("click", e => {
      if (e.target === m) {
        if (id === "donate-modal") closeDonate();
        if (id === "login-modal") closeLogin();
        if (id === "receipt-modal") closeReceipt();
        if (id === "case-detail-modal") closeCaseDetail();
      }
    });
  });

  // Escape key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeDonate(); closeLogin(); closeReceipt(); closeCaseDetail(); }
  });
});


async function verifyOnChain() {
  const input = document.getElementById("verify-receipt-id");
  const out = document.getElementById("verify-result");
  const status = document.getElementById("onchain-status");
  if (!input || !out) return;
  const id = (input.value || "").trim();
  if (!id) {
    out.innerHTML = '<p class="text-warning text-sm">Enter a receipt ID first</p>';
    return;
  }
  out.innerHTML = '<p class="text-slate-500 text-sm"><i class="fas fa-spinner fa-spin mr-1"></i> Checking smart contract…</p>';
  if (!window.DCContract) {
    out.innerHTML = '<p class="text-danger text-sm">Contract module not loaded</p>';
    return;
  }
  const result = await DCContract.checkOnChain(id);
  if (status) {
    status.textContent = result.configured
      ? ("Registry: " + (DCContract.cfg().address || "") + " · " + (DCContract.cfg().chainName || ""))
      : "Registry not deployed — simulation mode";
  }
  if (result.mode === "simulation") {
    // Check local simulation flag
    const donations = JSON.parse(localStorage.getItem("dc_donations") || "[]");
    const rec = donations.find(d => d.id === id);
    if (rec && rec.onChain && rec.onChain.simulated) {
      out.innerHTML = `<div class="text-sm space-y-1">
        <p class="text-amber-600 font-semibold"><i class="fas fa-flask mr-1"></i> Simulated on-chain anchor</p>
        <p class="text-slate-500">Contract not deployed. Local flag set at ${rec.onChain.anchoredAt}</p>
        <p class="text-xs text-slate-400">Deploy DonationRegistry and set address in js/contract-config.js</p>
      </div>`;
    } else {
      out.innerHTML = `<div class="text-sm"><p class="text-slate-600">${result.message}</p>
        <p class="text-xs text-slate-400 mt-1">Donate once to create a simulated anchor, or deploy the contract.</p></div>`;
    }
    return;
  }
  if (result.error) {
    out.innerHTML = `<p class="text-danger text-sm">${result.error}</p>`;
    return;
  }
  if (result.anchored) {
    const p = result.proof;
    out.innerHTML = `<div class="text-sm space-y-1.5">
      <p class="text-success font-semibold"><i class="fas fa-link mr-1"></i> Anchored on-chain</p>
      <p class="break-all text-xs font-mono">${result.receiptHash}</p>
      <p>Amount (on-chain): ${p && p.amount != null ? p.amount.toString() : "—"}</p>
      <p class="text-xs"><a class="text-primary underline" href="${result.explorer}" target="_blank" rel="noopener">View contract</a></p>
    </div>`;
  } else {
    out.innerHTML = `<p class="text-slate-600 text-sm">Not yet anchored on-chain for this receipt.</p>
      <p class="text-xs text-slate-400 mt-1">Backend owner wallet must call anchorDonation after payment.</p>`;
  }
}


async function verifyMerkleProof() {
  const input = document.getElementById("verify-receipt-id");
  const out = document.getElementById("verify-result");
  if (!input || !out) return;
  const id = (input.value || "").trim();
  if (!id) {
    out.innerHTML = '<p class="text-warning text-sm">Enter a receipt ID first</p>';
    return;
  }
  if (!window.Merkle) {
    out.innerHTML = '<p class="text-danger text-sm">Merkle module not loaded</p>';
    return;
  }
  out.innerHTML = '<p class="text-slate-500 text-sm"><i class="fas fa-spinner fa-spin mr-1"></i> Building Merkle proof…</p>';
  try {
    const result = await Merkle.verifyReceiptMerkle(id);
    if (!result.found) {
      out.innerHTML = `<p class="text-danger text-sm">${result.error || "Not found"}</p>
        <p class="text-xs text-slate-400 mt-1">Make a donation first so a batch can be built.</p>`;
      return;
    }
    const steps = (result.proof || [])
      .map((s, i) => `<li class="font-mono text-[11px] break-all">#${i + 1} ${s.position}: ${Merkle.short(s.sibling)}</li>`)
      .join("");
    out.innerHTML = `
      <div class="text-sm space-y-2">
        <p class="${result.valid ? "text-success" : "text-danger"} font-semibold">
          <i class="fas fa-sitemap mr-1"></i>${result.message}
        </p>
        <p><span class="text-slate-500">Batch</span> ${result.batchId} · ${result.batchLabel}</p>
        <p class="break-all"><span class="text-slate-500">Root</span> <span class="font-mono text-xs">${result.root}</span></p>
        <p class="break-all"><span class="text-slate-500">Leaf</span> <span class="font-mono text-xs">${result.leaf}</span></p>
        <p class="text-slate-500 text-xs">Proof path (${(result.proof || []).length} siblings)</p>
        <ul class="list-disc pl-4 space-y-0.5">${steps || "<li class=\"text-slate-400\">Single-leaf tree</li>"}</ul>
      </div>`;
  } catch (e) {
    out.innerHTML = `<p class="text-danger text-sm">${e.message || e}</p>`;
  }
}


function applyAdminConfig() {
  if (typeof renderQuickAmounts === "function") renderQuickAmounts();
  if (!window.DCConfig) return;
  const cfg = DCConfig.load();

  // Payment method visibility in donate modal
  const map = {
    jazzcash: "jazzcash",
    easypaisa: "easypaisa",
    bank: "bankTransfer",
    stripe: "card",
    raast: "raast",
    stripe: "card",
    card: "card",
  };
  document.querySelectorAll('input[name="paymethod"]').forEach((input) => {
    const key = input.value === "stripe" ? "card" : input.value;
    const enabled = cfg.payments[key] !== false;
    const label = input.closest("label");
    if (label) label.style.display = enabled ? "" : "none";
    if (!enabled && input.checked) input.checked = false;
  });
  // Ensure at least one method selected
  const visible = Array.from(document.querySelectorAll('input[name="paymethod"]')).filter(
    (i) => i.closest("label") && i.closest("label").style.display !== "none"
  );
  if (visible.length && !visible.some((i) => i.checked)) visible[0].checked = true;

  // Anonymous checkbox
  const anon = document.getElementById("anonymous");
  if (anon) {
    const wrap = anon.closest("label");
    if (wrap) wrap.style.display = cfg.donations.allowAnonymous ? "" : "none";
    if (!cfg.donations.allowAnonymous) anon.checked = false;
    else if (window.DCPrivacy && DCPrivacy.getPreferAnonymous && DCPrivacy.getPreferAnonymous()) anon.checked = true;
    anon.addEventListener("change", () => {
      if (window.DCPrivacy && DCPrivacy.setPreferAnonymous) DCPrivacy.setPreferAnonymous(!!anon.checked);
    });
  }

  // Category filter buttons
  document.querySelectorAll(".filter-btn[data-filter]").forEach((btn) => {
    const f = btn.dataset.filter;
    if (f === "all") return;
    const on = cfg.categories[f] !== false;
    btn.style.display = on ? "" : "none";
  });

  // Zakat section
  const zakatSec = document.getElementById("zakat");
  if (zakatSec) zakatSec.style.display = cfg.zakat.calculatorEnabled === false ? "none" : "";

  // Bill payment section
  const billsSec = document.getElementById("bills");
  if (billsSec) {
    const on =
      cfg.features &&
      cfg.features.billPayment !== false &&
      cfg.categories &&
      cfg.categories.utility !== false;
    billsSec.style.display = on ? "" : "none";
  }

  // Maintenance
  if (cfg.general.maintenanceMode) {
    document.querySelectorAll('button[onclick*="openDonate"]').forEach((b) => {
      b.disabled = true;
      b.title = "Maintenance mode";
    });
  }

  // Sync contract config
  if (window.DC_CONTRACT && cfg.blockchain) {
    DC_CONTRACT.address = cfg.blockchain.contractAddress;
    DC_CONTRACT.chainId = cfg.blockchain.chainId;
    DC_CONTRACT.chainName = cfg.blockchain.chainName;
    DC_CONTRACT.rpcUrl = cfg.blockchain.rpcUrl;
  }

  // Brand / support in footer if present
  const brand = document.querySelector("footer .font-bold.text-lg, footer .font-bold");
  // Support line
  let supportLine = document.getElementById("footer-support");
  if (!supportLine) {
    const foot = document.querySelector("footer .border-t");
    if (foot) {
      supportLine = document.createElement("p");
      supportLine.id = "footer-support";
      supportLine.className = "text-xs mt-2";
      foot.appendChild(supportLine);
    }
  }
  if (supportLine) {
    supportLine.textContent = (cfg.general.supportEmail || "") + " · " + (cfg.general.supportPhone || "");
  }
}


function toggleMobileNav() {
  const m = document.getElementById("mobile-nav");
  const btn = document.getElementById("mobile-menu-btn");
  if (!m) return;
  const open = m.classList.contains("hidden");
  m.classList.toggle("hidden", !open);
  if (open) {
    m.removeAttribute("hidden");
  } else {
    m.setAttribute("hidden", "");
  }
  if (btn) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
}

function openCaseDetail(id) {
  const c = DC.cases.find(x => x.id === id);
  if (!c) return;
  DC.selectedCase = c;
  const pct = Math.min(100, Math.round((c.raised / c.amount) * 100));
  const u = urgencyMeta(c.urgency);
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.textContent = v; };
  set("cd-title", c.title);
  set("cd-meta", c.city + " · " + c.vendor + " · " + c.category);
  set("cd-desc", c.desc);
  set("cd-raised", formatPKR(c.raised) + " raised");
  set("cd-goal", "Goal " + formatPKR(c.amount));
  set("cd-remaining", pct + "% funded · " + formatPKR(c.amount - c.raised) + " remaining");
  const urg = document.getElementById("cd-urgency");
  if (urg) { urg.textContent = u.label; urg.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase " + u.cls; }
  const ver = document.getElementById("cd-verified");
  if (ver) ver.innerHTML = c.verified ? '<i class="fas fa-shield-halved"></i> ' + (typeof t === "function" ? t("detail.verified") : "Verified vendor") : "";
  const bar = document.getElementById("cd-bar");
  if (bar) bar.style.width = pct + "%";
  const modal = document.getElementById("case-detail-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }
}

function closeCaseDetail() {
  const modal = document.getElementById("case-detail-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "";
}

function donateFromDetail() {
  closeCaseDetail();
  openDonate(false);
}

function shareReceipt() {
  const id = document.getElementById("receipt-id")?.textContent || "";
  const amount = document.getElementById("receipt-amount")?.textContent || "";
  const text = "I supported a verified case on DonationChain. Receipt " + id + " · " + amount + ". Every rupee tracked.";
  if (navigator.share) {
    navigator.share({ title: "DonationChain", text }).catch(() => copyText(text));
  } else {
    copyText(text);
  }
}

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast(typeof t === "function" ? t("toast.copied") : "Copied")).catch(() => showToast(text));
  } else {
    showToast("Share: " + text.slice(0, 80));
  }
}

function renderQuickAmounts() {
  const box = document.getElementById("quick-amounts");
  if (!box) return;
  const amounts = (window.DCConfig ? DCConfig.load().donations.quickAmounts : null) || [10, 25, 50, 100, 250];
  box.innerHTML = amounts.map(a =>
    `<button type="button" onclick="setQuickAmount(${a})" class="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium">${Number(a).toLocaleString()}</button>`
  ).join("");
}


function onZakatCountryChange() {
  const sel = document.getElementById("zakat-country");
  if (!sel || !window.DCLocales) return;
  DCLocales.setCountryCode(sel.value);
  updateZakatLabels();
  try { calcZakat(); } catch (_) {}
}

function updateZakatLabels() {
  if (!window.DCZakat) return;
  const cfg = DCZakat.getConfig();
  const unit = cfg.goldUnit === "tola" ? "tola" : "grams";
  const gl = document.getElementById("zakat-gold-label");
  const sl = document.getElementById("zakat-cash-label");
  const bl = document.getElementById("zakat-business-label");
  if (gl) gl.textContent = "Gold (" + unit + ")";
  if (sl) sl.textContent = "Cash / bank (" + cfg.currency + ")";
  if (bl) bl.textContent = "Business / stocks (" + cfg.currency + ")";
  const sil = document.querySelector('label[for="zakat-silver"]');
  if (sil) sil.textContent = "Silver (" + unit + ")";
}

function initGlobalLocaleUI() {
  if (window.DCLocales) {
    DCLocales.fillCountrySelect(document.getElementById("zakat-country"));
    const langSel = document.getElementById("lang-select");
    if (langSel && langSel.options.length < 5) DCLocales.fillLangSelect(langSel, (window.I18n && I18n.getLang && I18n.getLang()) || "en");
  }
  updateZakatLabels();
}
