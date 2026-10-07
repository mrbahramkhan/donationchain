/**
 * Admin auth — prefers server JWT, falls back to client-side session (static demo).
 */
const AdminAuth = (() => {
  const SALT = "donationchain-admin-v1";
  const SESSION_KEY = "dc_admin_session";
  const JWT_KEY = "dc_admin_jwt";
  const HASH_KEY = "dc_admin_password_hash";
  const ATTEMPTS_KEY = "dc_admin_attempts";
  const API_KEY = "dc_api_base";
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 15 * 60 * 1000;
  const SESSION_MS = 2 * 60 * 60 * 1000;

  const DEFAULT_HASH =
    "bdfb290efc87bc377a0b0a1bdfecbd08c4070e8244bee4c0544a5552ef53585b";

  function apiBase() {
    try {
      const fromLs = localStorage.getItem(API_KEY);
      if (fromLs) return fromLs.replace(/\/$/, "");
    } catch (_) {}
    // Default local backend
    return "http://localhost:4000";
  }

  function setApiBase(url) {
    localStorage.setItem(API_KEY, String(url || "").replace(/\/$/, ""));
  }

  async function sha256(text) {
    if (window.crypto && crypto.subtle) {
      const data = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return ("00000000" + (h >>> 0).toString(16)).slice(-8).padStart(64, "0");
  }

  async function hashPassword(password) {
    return sha256(SALT + String(password || ""));
  }

  function getStoredHash() {
    return localStorage.getItem(HASH_KEY) || DEFAULT_HASH;
  }

  async function setPassword(newPassword) {
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters" };
    }
    // Prefer server if JWT present
    const jwt = getJwt();
    if (jwt) {
      try {
        const res = await fetch(apiBase() + "/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
          body: JSON.stringify({ currentPassword: "", newPassword }),
        });
        // needs current password on server — handled by changePasswordServer
      } catch (_) {}
    }
    const h = await hashPassword(newPassword);
    localStorage.setItem(HASH_KEY, h);
    return { ok: true };
  }

  async function changePasswordServer(currentPassword, newPassword) {
    const jwt = getJwt();
    if (!jwt) return { ok: false, error: "Not logged in via server" };
    const res = await fetch(apiBase() + "/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + jwt,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "Failed" };
    return { ok: true };
  }

  function resetPasswordToDefault() {
    localStorage.removeItem(HASH_KEY);
  }

  function readAttempts() {
    try {
      return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeAttempts(obj) {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(obj));
  }

  function isLocked() {
    const a = readAttempts();
    if (!a.lockedUntil) return false;
    if (Date.now() < a.lockedUntil) return true;
    writeAttempts({ count: 0 });
    return false;
  }

  function lockRemainingMs() {
    const a = readAttempts();
    return Math.max(0, (a.lockedUntil || 0) - Date.now());
  }

  function recordFail() {
    const a = readAttempts();
    a.count = (a.count || 0) + 1;
    if (a.count >= MAX_ATTEMPTS) {
      a.lockedUntil = Date.now() + LOCK_MS;
      a.count = 0;
    }
    writeAttempts(a);
    return a;
  }

  function clearAttempts() {
    localStorage.removeItem(ATTEMPTS_KEY);
  }

  function getJwt() {
    return sessionStorage.getItem(JWT_KEY) || null;
  }

  function setJwt(token) {
    if (token) sessionStorage.setItem(JWT_KEY, token);
    else sessionStorage.removeItem(JWT_KEY);
  }

  function createLocalSession(user) {
    const session = {
      token: "local-" + Math.random().toString(36).slice(2),
      exp: Date.now() + SESSION_MS,
      created: Date.now(),
      mode: "local",
      user: user || { username: "admin", role: "superadmin" },
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    // Prefer JWT
    const jwt = getJwt();
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          setJwt(null);
          return null;
        }
        return {
          token: jwt,
          exp: (payload.exp || 0) * 1000,
          mode: "jwt",
          user: { username: payload.username, role: payload.role, id: payload.sub },
        };
      } catch {
        setJwt(null);
      }
    }
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s.exp || Date.now() > s.exp) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    return !!getSession();
  }

  function logout() {
    const jwt = getJwt();
    if (jwt) {
      fetch(apiBase() + "/api/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer " + jwt },
      }).catch(() => {});
    }
    setJwt(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  async function loginServer(username, password) {
    const res = await fetch(apiBase() + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username || "admin", password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || "Login failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    setJwt(data.token);
    sessionStorage.removeItem(SESSION_KEY);
    return data;
  }

  async function loginLocal(password) {
    const h = await hashPassword(password);
    if (h !== getStoredHash()) {
      const a = recordFail();
      if (a.lockedUntil && Date.now() < a.lockedUntil) {
        return { ok: false, error: "Account locked for 15 minutes after failed attempts." };
      }
      const left = MAX_ATTEMPTS - (a.count || 0);
      return { ok: false, error: "Invalid password. " + left + " attempt(s) left." };
    }
    clearAttempts();
    createLocalSession({ username: "admin", role: "superadmin" });
    return { ok: true, mode: "local" };
  }

  async function login(password, username) {
    if (isLocked()) {
      const mins = Math.ceil(lockRemainingMs() / 60000);
      return { ok: false, error: "Too many attempts. Try again in " + mins + " min." };
    }
    const input = String(password || "");
    if (!input) return { ok: false, error: "Enter password" };

    // Try server first
    try {
      const data = await loginServer(username || "admin", input);
      clearAttempts();
      return { ok: true, mode: "jwt", user: data.user, expiresIn: data.expiresIn };
    } catch (e) {
      // Network / server down → local fallback
      if (!e.status || e.status >= 500 || e.message === "Failed to fetch") {
        return loginLocal(input);
      }
      // 401 from server
      const a = recordFail();
      if (e.status === 429) {
        return { ok: false, error: e.data?.error || "Too many attempts. Try later." };
      }
      if (a.lockedUntil && Date.now() < a.lockedUntil) {
        return { ok: false, error: "Account locked for 15 minutes after failed attempts." };
      }
      const left = MAX_ATTEMPTS - (a.count || 0);
      return { ok: false, error: (e.data && e.data.error) || "Invalid credentials. " + left + " attempt(s) left." };
    }
  }

  function requireAuth(loginUrl) {
    if (isAuthenticated()) return true;
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace((loginUrl || "login.html") + "?next=" + next);
    return false;
  }

  function extendSession() {
    const s = getSession();
    if (!s) return false;
    if (s.mode === "jwt") return true; // server TTL
    s.exp = Date.now() + SESSION_MS;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return true;
  }

  function authHeader() {
    const jwt = getJwt();
    return jwt ? { Authorization: "Bearer " + jwt } : {};
  }

  return {
    login,
    logout,
    isAuthenticated,
    requireAuth,
    setPassword,
    changePasswordServer,
    resetPasswordToDefault,
    isLocked,
    lockRemainingMs,
    extendSession,
    getSession,
    getJwt,
    apiBase,
    setApiBase,
    authHeader,
    DEFAULT_HINT: "Admin@DC2026",
  };
})();

window.AdminAuth = AdminAuth;
