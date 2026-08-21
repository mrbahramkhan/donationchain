/**
 * Organization trust verification — hospitals, schools, vendors.
 * Payments should only go to orgs with status "verified" or "active".
 */
const DCOrgs = (() => {
  const KEY = "dc_organizations_v1";

  const LEVELS = {
    unlisted: { label: "Unlisted", rank: 0, cls: "bg-slate-100 text-slate-600" },
    pending: { label: "Pending review", rank: 1, cls: "bg-amber-50 text-amber-800" },
    documents: { label: "Documents checked", rank: 2, cls: "bg-sky-50 text-sky-800" },
    bank_verified: { label: "Bank verified", rank: 3, cls: "bg-indigo-50 text-indigo-800" },
    verified: { label: "Verified", rank: 4, cls: "bg-emerald-50 text-emerald-800" },
    suspended: { label: "Suspended", rank: 0, cls: "bg-red-50 text-red-700" },
  };

  /** Seed list aligned with demo cases */
  const defaults = [
    {
      id: "org-mayo",
      name: "Mayo Hospital",
      type: "hospital",
      city: "Lahore",
      registrationNo: "PHC-LHR-001",
      bankIbanMasked: "PK00••••••••1234",
      status: "verified",
      checks: {
        legalRegistration: true,
        physicalAddress: true,
        bankAccountOwnership: true,
        contactPerson: true,
        sampleInvoice: true,
      },
      verifiedAt: "2026-01-15T00:00:00.000Z",
    },
    {
      id: "org-beacon",
      name: "Beaconhouse School",
      type: "school",
      city: "Karachi",
      registrationNo: "SEF-KHI-214",
      bankIbanMasked: "PK00••••••••5678",
      status: "verified",
      checks: {
        legalRegistration: true,
        physicalAddress: true,
        bankAccountOwnership: true,
        contactPerson: true,
        sampleInvoice: true,
      },
      verifiedAt: "2026-02-01T00:00:00.000Z",
    },
    {
      id: "org-shifa",
      name: "Shifa International",
      type: "hospital",
      city: "Islamabad",
      registrationNo: "PHC-ISB-088",
      bankIbanMasked: "PK00••••••••9012",
      status: "verified",
      checks: {
        legalRegistration: true,
        physicalAddress: true,
        bankAccountOwnership: true,
        contactPerson: true,
        sampleInvoice: true,
      },
      verifiedAt: "2026-01-20T00:00:00.000Z",
    },
    {
      id: "org-uet",
      name: "UET Lahore",
      type: "university",
      city: "Lahore",
      registrationNo: "HEC-UET-LHR",
      bankIbanMasked: "PK00••••••••4455",
      status: "verified",
      checks: {
        legalRegistration: true,
        physicalAddress: true,
        bankAccountOwnership: true,
        contactPerson: true,
        sampleInvoice: true,
      },
      verifiedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "org-wapda",
      name: "WAPDA",
      type: "utility",
      city: "Faisalabad",
      registrationNo: "UTIL-WAPDA",
      bankIbanMasked: "PK00••••••••7788",
      status: "bank_verified",
      checks: {
        legalRegistration: true,
        physicalAddress: true,
        bankAccountOwnership: true,
        contactPerson: true,
        sampleInvoice: false,
      },
      verifiedAt: null,
    },
    {
      id: "org-grocery",
      name: "Verified Grocery Vendor",
      type: "vendor",
      city: "Rawalpindi",
      registrationNo: "NTN-998877",
      bankIbanMasked: "PK00••••••••3322",
      status: "documents",
      checks: {
        legalRegistration: true,
        physicalAddress: true,
        bankAccountOwnership: false,
        contactPerson: true,
        sampleInvoice: true,
      },
      verifiedAt: null,
    },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        localStorage.setItem(KEY, JSON.stringify(defaults));
        return defaults.slice();
      }
      return JSON.parse(raw);
    } catch {
      return defaults.slice();
    }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function findByName(name) {
    if (!name) return null;
    const n = String(name).toLowerCase().trim();
    return load().find((o) => o.name.toLowerCase() === n || o.name.toLowerCase().includes(n)) || null;
  }

  function get(id) {
    return load().find((o) => o.id === id) || null;
  }

  function canReceivePayment(org) {
    if (!org) return false;
    if (org.status === "suspended") return false;
    return ["verified", "bank_verified"].includes(org.status);
  }

  function badge(org) {
    if (!org) return LEVELS.unlisted;
    return LEVELS[org.status] || LEVELS.unlisted;
  }

  function checklistScore(org) {
    if (!org || !org.checks) return 0;
    const vals = Object.values(org.checks);
    const ok = vals.filter(Boolean).length;
    return Math.round((ok / vals.length) * 100);
  }

  /** Verification workflow steps (for admin / docs) */
  const WORKFLOW = [
    { id: "register", title: "Register organization", detail: "Legal name, type, city, registration number" },
    { id: "documents", title: "Document check", detail: "Registration certificate, NTN/tax, address proof" },
    { id: "bank", title: "Bank account ownership", detail: "IBAN matches legal name; cancelled cheque or letter" },
    { id: "contact", title: "Contact person", detail: "Named staff phone/email for payment queries" },
    { id: "activate", title: "Activate for payouts", detail: "Status → verified; cases may receive funds" },
  ];

  function setStatus(id, status, meta) {
    const list = load();
    const i = list.findIndex((o) => o.id === id);
    if (i < 0) return null;
    list[i].status = status;
    if (status === "verified") list[i].verifiedAt = new Date().toISOString();
    if (meta && meta.checks) list[i].checks = { ...list[i].checks, ...meta.checks };
    save(list);
    return list[i];
  }

  function upsert(org) {
    const list = load();
    const i = list.findIndex((o) => o.id === org.id || o.name === org.name);
    if (i >= 0) list[i] = { ...list[i], ...org };
    else list.push({ id: org.id || "org-" + Date.now().toString(36), status: "pending", checks: {}, ...org });
    save(list);
    return list;
  }

  return {
    LEVELS,
    WORKFLOW,
    load,
    save,
    get,
    findByName,
    canReceivePayment,
    badge,
    checklistScore,
    setStatus,
    upsert,
  };
})();

if (typeof window !== "undefined") window.DCOrgs = DCOrgs;
