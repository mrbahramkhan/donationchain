/**
 * DonationChain public user auth (phone OTP + JWT)
 */
const DCAuth = (() => {
  const TOKEN_KEY = "dc_access_token";
  const USER_KEY = "dc_user";

  function apiBase() {
    if (window.DCConfig && typeof DCConfig.get === "function") {
      const c = DCConfig.get();
      if (c && c.api && c.api.baseUrl) return String(c.api.baseUrl).replace(/\/$/, "");
    }
    if (window.DC_API_BASE) return String(window.DC_API_BASE).replace(/\/$/, "");
    // Same host / relative (Pages + separate API)
    return localStorage.getItem("dc_api_base") || "";
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token, persist) {
    if (!token) {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    if (persist) localStorage.setItem(TOKEN_KEY, token);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setUser(user) {
    if (!user) {
      localStorage.removeItem(USER_KEY);
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (window.DCRBAC && DCRBAC.setSession) {
      DCRBAC.setSession({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role || "donor",
      });
    }
  }

  function authHeader() {
    const t = getToken();
    return t ? { Authorization: "Bearer " + t } : {};
  }

  function isLoggedIn() {
    return !!(getToken() && getUser());
  }

  async function requestOtp(phone, role) {
    const base = apiBase();
    const url = (base || "") + "/api/auth/otp/request";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, role: role || "donor" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Fallback demo when API offline
      if (res.status === 404 || res.status === 0 || !res.status) {
        return {
          ok: true,
          mock: true,
          code: "123456",
          message: "Offline demo OTP",
          phone,
        };
      }
      throw new Error(data.error || "Failed to send OTP");
    }
    return data;
  }

  async function verifyOtp(phone, code, role, name) {
    const base = apiBase();
    const url = (base || "") + "/api/auth/otp/verify";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, role, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Demo fallback: accept 123456 when API error
        if (code === "123456" && (res.status >= 500 || res.status === 404)) {
          return demoLogin(phone, role, name);
        }
        throw new Error(data.error || "Invalid OTP");
      }
      if (data.token) setToken(data.token, true);
      if (data.user) setUser(data.user);
      return data;
    } catch (e) {
      if (code === "123456") {
        return demoLogin(phone, role, name);
      }
      throw e;
    }
  }

  function demoLogin(phone, role, name) {
    const user = {
      id: "demo_" + String(phone).replace(/\D/g, "").slice(-8),
      phone,
      name: name || (role === "seeker" || role === "needy" ? "Seeker" : "Donor"),
      role: role === "seeker" || role === "needy" ? "seeker" : "donor",
      loggedInAt: new Date().toISOString(),
    };
    setToken("demo." + btoa(JSON.stringify(user)), true);
    setUser(user);
    return { ok: true, user, token: getToken(), mock: true };
  }

  function logout() {
    const t = getToken();
    if (t && !String(t).startsWith("demo.")) {
      const base = apiBase();
      fetch((base || "") + "/api/auth/logout", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    if (window.DCRBAC && DCRBAC.clearSession) DCRBAC.clearSession();
  }

  async function me() {
    const base = apiBase();
    const res = await fetch((base || "") + "/api/auth/me", {
      headers: { ...authHeader() },
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  }

  return {
    apiBase,
    getToken,
    setToken,
    getUser,
    setUser,
    authHeader,
    isLoggedIn,
    requestOtp,
    verifyOtp,
    logout,
    me,
    demoLogin,
  };
})();

if (typeof window !== "undefined") window.DCAuth = DCAuth;
