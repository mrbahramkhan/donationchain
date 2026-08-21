/**
 * On-demand Noto Nastaliq Urdu — avoid loading heavy font until lang=ur.
 * Body/UI stays on Noto Naskh Arabic (much cheaper shaping).
 * Nastaliq reserved for headings + .font-nastaliq once ready.
 */
const DCFonts = (() => {
  const NASTALIQ_HREF =
    "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap";
  let loading = null;
  let ready = false;

  function markReady() {
    ready = true;
    document.documentElement.classList.add("fonts-nastaliq-ready");
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load('700 24px "Noto Nastaliq Urdu"').catch(function () {});
        document.fonts.load('400 16px "Noto Nastaliq Urdu"').catch(function () {});
      }
    } catch (_) {}
  }

  function loadNastaliq() {
    if (ready) return Promise.resolve();
    if (loading) return loading;

    loading = new Promise(function (resolve) {
      var existing = document.getElementById("font-nastaliq");
      if (existing) {
        existing.disabled = false;
        existing.media = "all";
        existing.onload = function () {
          markReady();
          resolve();
        };
        // Already cached
        if (existing.sheet) {
          markReady();
          resolve();
        } else {
          setTimeout(function () {
            markReady();
            resolve();
          }, 1200);
        }
        return;
      }

      var link = document.createElement("link");
      link.id = "font-nastaliq";
      link.rel = "stylesheet";
      link.href = NASTALIQ_HREF;
      link.media = "print";
      link.onload = function () {
        link.media = "all";
        markReady();
        resolve();
      };
      link.onerror = function () {
        resolve();
      };
      document.head.appendChild(link);
      setTimeout(function () {
        if (!ready) {
          markReady();
          resolve();
        }
      }, 2500);
    });

    return loading;
  }

  function unloadHint() {
    // Keep stylesheet cached; only remove ready class for non-Urdu
    document.documentElement.classList.remove("fonts-nastaliq-ready");
  }

  function onLang(lang) {
    if (lang === "ur") {
      loadNastaliq();
    } else {
      unloadHint();
    }
  }

  function init() {
    var lang = "en";
    try {
      if (window.I18n && I18n.getLang) lang = I18n.getLang();
      else lang = localStorage.getItem("dc_lang") || "en";
    } catch (_) {}
    onLang(lang);

    window.addEventListener("dc:langchange", function (e) {
      onLang((e.detail && e.detail.lang) || "en");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { loadNastaliq: loadNastaliq, onLang: onLang, isReady: function () { return ready; } };
})();

if (typeof window !== "undefined") window.DCFonts = DCFonts;
