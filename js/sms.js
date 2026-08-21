/**
 * SMS alerts client — posts to backend; falls back to local log if offline.
 */
const DCSMS = (() => {
  const LOG_KEY = "dc_sms_log_local";

  function apiBase() {
    try {
      return (localStorage.getItem("dc_api_base") || "http://localhost:4000").replace(/\/$/, "");
    } catch {
      return "http://localhost:4000";
    }
  }

  function localLog(entry) {
    try {
      const log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      log.unshift(entry);
      localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 100)));
    } catch (_) {}
  }

  async function post(path, body) {
    try {
      const res = await fetch(apiBase() + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    } catch (e) {
      return { ok: false, offline: true, error: e.message };
    }
  }

  async function notifyApplication({ phone, id, status }) {
    const r = await post("/api/sms/notify-application", { phone, id, status });
    if (r.offline) {
      localLog({
        at: new Date().toISOString(),
        to: phone,
        template: "application_" + status,
        body: "Application " + id + " " + status,
        mock: true,
        offline: true,
      });
      return { ok: true, offline: true };
    }
    return r;
  }

  async function notifyDonation(payload) {
    const r = await post("/api/sms/notify-donation", payload);
    if (r.offline) {
      localLog({
        at: new Date().toISOString(),
        ...payload,
        mock: true,
        offline: true,
        template: "donation",
      });
      return { ok: true, offline: true };
    }
    return r;
  }

  function getLocalLog() {
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    } catch {
      return [];
    }
  }

  return { notifyApplication, notifyDonation, getLocalLog, apiBase };
})();

window.DCSMS = DCSMS;
