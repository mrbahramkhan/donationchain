/**
 * DonationChain multi-theme: light | dark | emerald
 */
const DCTheme = (() => {
  const KEY = "dc_theme";
  const THEMES = ["light", "dark", "emerald"];

  function get() {
    const t = localStorage.getItem(KEY) || "light";
    return THEMES.includes(t) ? t : "light";
  }

  function set(theme) {
    const t = THEMES.includes(theme) ? theme : "light";
    localStorage.setItem(KEY, t);
    document.documentElement.setAttribute("data-theme", t);
    const sel = document.getElementById("theme-select");
    if (sel) sel.value = t;
    window.dispatchEvent(new CustomEvent("dc:themechange", { detail: { theme: t } }));
    return t;
  }

  function init() {
    set(get());
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  return { get, set, init, THEMES };
})();

if (typeof window !== "undefined") window.DCTheme = DCTheme;
