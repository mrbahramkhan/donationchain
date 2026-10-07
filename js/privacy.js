/**
 * DonationChain — Privacy helpers for donor & seeker (needy).
 * Rules:
 * - Public case cards never show phone, CNIC, full address, or real full name.
 * - Seeker PII stays in private store (admin / verification only).
 * - Donor can donate anonymously; public receipts hide name when requested.
 * - Mask identifiers before any public/log display.
 */
const DCPrivacy = (() => {
  const PRIVATE_APPS_KEY = "dc_case_applications_private";
  const PUBLIC_CASES_KEY = "dc_case_applications"; // public-safe projection only
  const PRIVATE_DONORS_KEY = "dc_donor_profiles_private";

  /** Opaque retention key — not reversible to phone/name in UI */
  function donorKey(profile) {
    const raw =
      (profile && (profile.id || profile.phone || profile.email || profile.name)) ||
      "";
    if (!raw) return null;
    let h = 0;
    const s = String(raw).toLowerCase().trim();
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return "dk_" + (h >>> 0).toString(16);
  }

  function maskPhone(phone) {
    const s = String(phone || "").replace(/\D/g, "");
    if (s.length < 4) return "••••";
    return "••••••" + s.slice(-4);
  }

  function maskCnic(cnic) {
    const d = String(cnic || "").replace(/\D/g, "");
    if (d.length < 5) return "•••••-•••••••-•";
    return d.slice(0, 5) + "-•••••••-•";
  }

  function maskName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "Anonymous";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + ".";
    return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
  }

  function maskIban(acc) {
    const s = String(acc || "").replace(/\s/g, "");
    if (s.length < 8) return s ? "••••" : "";
    return s.slice(0, 4) + "••••••••" + s.slice(-4);
  }

  /** Public-safe case application (no raw PII) */
  function toPublicApplication(full) {
    const app = full.applicant || {};
    const c = full.case || {};
    return {
      id: full.id,
      type: full.type || "case_application",
      status: full.status,
      createdAt: full.createdAt,
      // Display only — never raw phone/cnic/address
      publicLabel: maskName(app.fullName),
      city: app.city || "",
      case: {
        category: c.category,
        title: c.title,
        description: c.description,
        amountNeeded: c.amountNeeded,
        urgency: c.urgency,
        vendorName: c.vendorName || null,
        // IBAN never public
        vendorAccount: null,
      },
      privacy: {
        piiStoredSeparately: true,
        contactHidden: true,
        documentsHidden: true,
      },
      // proofs stay private
      proofCount: Array.isArray(full.proofs) ? full.proofs.length : 0,
    };
  }

  function savePrivateApplication(full) {
    try {
      const raw = localStorage.getItem(PRIVATE_APPS_KEY);
      const all = raw ? JSON.parse(raw) : [];
      const privateRec = {
        id: full.id,
        createdAt: full.createdAt,
        status: full.status,
        applicant: {
          fullName: full.applicant?.fullName,
          cnic: full.applicant?.cnic,
          phone: full.applicant?.phone,
          city: full.applicant?.city,
          address: full.applicant?.address,
        },
        case: full.case,
        proofs: full.proofs || [],
        consent: full.consent,
        access: "admin_verification_only",
      };
      all.unshift(privateRec);
      localStorage.setItem(PRIVATE_APPS_KEY, JSON.stringify(all.slice(0, 200)));
    } catch (e) {
      console.warn("DCPrivacy: private app save failed", e);
    }
  }

  function savePublicApplication(full) {
    try {
      const raw = localStorage.getItem(PUBLIC_CASES_KEY);
      const all = raw ? JSON.parse(raw) : [];
      all.unshift(toPublicApplication(full));
      localStorage.setItem(PUBLIC_CASES_KEY, JSON.stringify(all.slice(0, 200)));
    } catch (e) {
      console.warn("DCPrivacy: public app save failed", e);
    }
  }

  /** Split full application into private + public stores */
  function storeApplicationWithPrivacy(full) {
    savePrivateApplication(full);
    savePublicApplication(full);
    return toPublicApplication(full);
  }

  function savePrivateDonor(profile) {
    try {
      const raw = localStorage.getItem(PRIVATE_DONORS_KEY);
      const all = raw ? JSON.parse(raw) : [];
      const rec = {
        id: profile.id,
        fullName: profile.fullName,
        phone: profile.phone,
        email: profile.email,
        cnic: profile.cnic,
        country: profile.country,
        city: profile.city,
        createdAt: profile.createdAt || new Date().toISOString(),
        access: "self_and_admin_only",
      };
      const idx = all.findIndex((d) => d.phone === rec.phone);
      if (idx >= 0) all[idx] = { ...all[idx], ...rec };
      else all.unshift(rec);
      localStorage.setItem(PRIVATE_DONORS_KEY, JSON.stringify(all.slice(0, 200)));
    } catch (e) {
      console.warn("DCPrivacy: private donor save failed", e);
    }
  }

  /** Public donor profile — no CNIC/email in shared lists */
  function toPublicDonor(profile) {
    return {
      id: profile.id,
      type: "donor_profile",
      displayName: profile.anonymous ? "Anonymous donor" : maskName(profile.fullName),
      city: profile.city || "",
      country: profile.country || "PK",
      preferredCategories: profile.preferredCategories || [],
      zakatPayer: !!profile.zakatPayer,
      createdAt: profile.createdAt,
      privacy: { contactHidden: true, idHidden: true },
    };
  }

  function receiptDisplayName(record) {
    if (record && (record.anonymous || record.privacyMode === "anonymous")) {
      return "Anonymous donor";
    }
    if (record && record.publicName) return record.publicName;
    if (record && record.donorName && record.donorName !== "Anonymous donor") {
      return maskName(record.donorName);
    }
    return "Donor";
  }

  /** Label for any public list / feed / leaderboard */
  function publicDonorLabel(record) {
    if (!record) return "Anonymous donor";
    if (record.anonymous || record.privacyMode === "anonymous" || record.hideName) {
      return "Anonymous donor";
    }
    return receiptDisplayName(record);
  }

  function getPreferAnonymous() {
    try {
      const u = JSON.parse(localStorage.getItem("dc_user") || "null");
      if (u && u.preferAnonymous) return true;
      return localStorage.getItem("dc_prefer_anonymous") === "1";
    } catch {
      return localStorage.getItem("dc_prefer_anonymous") === "1";
    }
  }

  function setPreferAnonymous(on) {
    const v = !!on;
    localStorage.setItem("dc_prefer_anonymous", v ? "1" : "0");
    try {
      const u = JSON.parse(localStorage.getItem("dc_user") || "null") || {};
      u.preferAnonymous = v;
      localStorage.setItem("dc_user", JSON.stringify(u));
    } catch (_) {}
    return v;
  }

  /** Build public-safe donation record (no real name/phone when anonymous) */
  function toPublicDonation(record, donorProfile) {
    const anon = !!(record && (record.anonymous || record.privacyMode === "anonymous"));
    const base = {
      id: record.id,
      amount: record.amount,
      method: record.method,
      case: record.case,
      caseId: record.caseId,
      city: record.city,
      vendor: record.vendor,
      date: record.date,
      status: record.status,
      proof: record.proof,
      anonymous: anon,
      privacyMode: anon ? "anonymous" : "named",
      blockHash: record.blockHash,
      blockIndex: record.blockIndex,
      providerRef: record.providerRef,
      paymentMode: record.paymentMode,
      category: record.category,
      platformFeePercent: record.platformFeePercent,
    };
    if (anon) {
      base.donorName = "Anonymous donor";
      base.publicName = "Anonymous donor";
      base.donorRef = "ANON";
      // unique key per gift — do not link anonymous gifts for public retention
      base.donorKey = "anon_" + String(record.id || Math.random().toString(36).slice(2));
    } else {
      const name =
        (donorProfile && donorProfile.name) ||
        record.donorName ||
        (function () {
          try {
            const u = JSON.parse(localStorage.getItem("dc_user") || "null");
            return u && (u.name || u.phone);
          } catch {
            return null;
          }
        })();
      let profile = donorProfile || {};
      try {
        const u = JSON.parse(localStorage.getItem("dc_user") || "null");
        if (u) profile = { id: u.id, phone: u.phone, email: u.email, name: u.name, ...profile };
      } catch (_) {}
      base.donorName = name ? maskName(name) : "Donor";
      base.publicName = base.donorName;
      base.donorRef = "REGISTERED";
      base.donorKey = donorKey(profile) || donorKey({ name: name }) || "dk_unknown";
    }
    return base;
  }

  function savePrivateDonationMeta(record, realName, realPhone) {
    if (!record || !record.anonymous) return;
    try {
      const key = "dc_donations_private";
      const all = JSON.parse(localStorage.getItem(key) || "[]");
      all.unshift({
        id: record.id,
        realName: realName || null,
        realPhone: realPhone || null,
        amount: record.amount,
        date: record.date,
        access: "self_and_admin_only",
      });
      localStorage.setItem(key, JSON.stringify(all.slice(0, 300)));
    } catch (e) {
      console.warn("DCPrivacy: private donation meta failed", e);
    }
  }

  /** Never put beneficiary phone on donation receipt UI */
  function sanitizeDonationForDisplay(record) {
    if (!record || typeof record !== "object") return record;
    const out = { ...record };
    delete out.beneficiaryPhone;
    delete out.applicantPhone;
    delete out.cnic;
    delete out.phone;
    if (out.anonymous) {
      out.donorName = "Anonymous donor";
      delete out.donorPhone;
    } else if (out.donorPhone) {
      out.donorPhoneMasked = maskPhone(out.donorPhone);
      delete out.donorPhone;
    }
    return out;
  }

  const POLICY = {
    version: "1.0",
    summary: [
      "Seekers: phone, CNIC, address, and documents are never shown on public case cards.",
      "Donors: optional anonymous (khamosh) giving — name never appears on public lists or shared receipts.",
      "Donors: CNIC/email not shown publicly.",
      "Payments go only to verified institutions — never to personal mobile wallets of seekers.",
      "Direct messaging between donor and seeker is not enabled by default.",
      "Admin / verification staff can access private records only for review.",
    ],
  };

  return {
    maskPhone,
    maskCnic,
    maskName,
    maskIban,
    donorKey,
    toPublicApplication,
    storeApplicationWithPrivacy,
    savePrivateDonor,
    toPublicDonor,
    receiptDisplayName,
    publicDonorLabel,
    sanitizeDonationForDisplay,
    toPublicDonation,
    savePrivateDonationMeta,
    getPreferAnonymous,
    setPreferAnonymous,
    POLICY,
    PRIVATE_APPS_KEY,
    PUBLIC_CASES_KEY,
  };
})();

if (typeof window !== "undefined") window.DCPrivacy = DCPrivacy;
