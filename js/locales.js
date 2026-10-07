/**
 * DonationChain — global locales & country profiles
 * Each country maps to currency + default UI language for that market.
 */
const DCLocales = (() => {
  /** UI languages — dictionaries in i18n.js; missing keys fall back to English */
  const LANGUAGES = [
    { code: "en", label: "English", dir: "ltr", native: "English" },
    { code: "ur", label: "Urdu", dir: "rtl", native: "اردو" },
    { code: "ar", label: "Arabic", dir: "rtl", native: "العربية" },
    { code: "fr", label: "French", dir: "ltr", native: "Français" },
    { code: "es", label: "Spanish", dir: "ltr", native: "Español" },
    { code: "pt", label: "Portuguese", dir: "ltr", native: "Português" },
    { code: "id", label: "Indonesian", dir: "ltr", native: "Bahasa Indonesia" },
    { code: "ms", label: "Malay", dir: "ltr", native: "Bahasa Melayu" },
    { code: "tr", label: "Turkish", dir: "ltr", native: "Türkçe" },
    { code: "bn", label: "Bengali", dir: "ltr", native: "বাংলা" },
    { code: "hi", label: "Hindi", dir: "ltr", native: "हिन्दी" },
    { code: "sw", label: "Swahili", dir: "ltr", native: "Kiswahili" },
    { code: "de", label: "German", dir: "ltr", native: "Deutsch" },
    { code: "fa", label: "Persian", dir: "rtl", native: "فارسی" },
    { code: "ha", label: "Hausa", dir: "ltr", native: "Hausa" },
    { code: "ps", label: "Pashto", dir: "rtl", native: "پښتو" },
  ];

  const RTL = new Set(["ur", "ar", "fa", "ps"]);

  /**
   * Country profiles — ISO code → currency + defaultLang for that country.
   * nisabGoldGrams: ~85g AAOIFI; PK/BD often ~87.48g (7.5 tola).
   */
  const COUNTRIES = {
    // South Asia
    PK: { name: "Pakistan", currency: "PKR", currencySymbol: "Rs", goldUnit: "tola", goldGramsPerUnit: 11.664, nisabGoldGrams: 87.48, nisabGoldTola: 7.5, region: "South Asia", defaultLang: "ur" },
    IN: { name: "India", currency: "INR", currencySymbol: "₹", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "South Asia", defaultLang: "hi" },
    BD: { name: "Bangladesh", currency: "BDT", currencySymbol: "৳", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 87.48, region: "South Asia", defaultLang: "bn" },
    AF: { name: "Afghanistan", currency: "AFN", currencySymbol: "؋", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "South Asia", defaultLang: "ps" },
    LK: { name: "Sri Lanka", currency: "LKR", currencySymbol: "Rs", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "South Asia", defaultLang: "en" },
    NP: { name: "Nepal", currency: "NPR", currencySymbol: "Rs", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "South Asia", defaultLang: "en" },
    // GCC / MENA
    SA: { name: "Saudi Arabia", currency: "SAR", currencySymbol: "﷼", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "GCC", defaultLang: "ar", note: "ZATCA for businesses" },
    AE: { name: "United Arab Emirates", currency: "AED", currencySymbol: "د.إ", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "GCC", defaultLang: "ar" },
    QA: { name: "Qatar", currency: "QAR", currencySymbol: "ر.ق", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "GCC", defaultLang: "ar" },
    KW: { name: "Kuwait", currency: "KWD", currencySymbol: "د.ك", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "GCC", defaultLang: "ar" },
    BH: { name: "Bahrain", currency: "BHD", currencySymbol: "ب.د", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "GCC", defaultLang: "ar" },
    OM: { name: "Oman", currency: "OMR", currencySymbol: "ر.ع.", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "GCC", defaultLang: "ar" },
    EG: { name: "Egypt", currency: "EGP", currencySymbol: "E£", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    JO: { name: "Jordan", currency: "JOD", currencySymbol: "د.ا", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    LB: { name: "Lebanon", currency: "LBP", currencySymbol: "ل.ل", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    IQ: { name: "Iraq", currency: "IQD", currencySymbol: "ع.د", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    YE: { name: "Yemen", currency: "YER", currencySymbol: "﷼", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    SY: { name: "Syria", currency: "SYP", currencySymbol: "£", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    PS: { name: "Palestine", currency: "ILS", currencySymbol: "₪", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    MA: { name: "Morocco", currency: "MAD", currencySymbol: "د.م.", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    DZ: { name: "Algeria", currency: "DZD", currencySymbol: "د.ج", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    TN: { name: "Tunisia", currency: "TND", currencySymbol: "د.ت", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    LY: { name: "Libya", currency: "LYD", currencySymbol: "ل.د", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "ar" },
    SD: { name: "Sudan", currency: "SDG", currencySymbol: "ج.س.", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "ar" },
    IR: { name: "Iran", currency: "IRR", currencySymbol: "﷼", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "MENA", defaultLang: "fa" },
    // SE Asia
    MY: { name: "Malaysia", currency: "MYR", currencySymbol: "RM", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "SE Asia", defaultLang: "ms" },
    ID: { name: "Indonesia", currency: "IDR", currencySymbol: "Rp", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "SE Asia", defaultLang: "id" },
    BN: { name: "Brunei", currency: "BND", currencySymbol: "B$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "SE Asia", defaultLang: "ms" },
    SG: { name: "Singapore", currency: "SGD", currencySymbol: "S$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "SE Asia", defaultLang: "en" },
    PH: { name: "Philippines", currency: "PHP", currencySymbol: "₱", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "SE Asia", defaultLang: "en" },
    TH: { name: "Thailand", currency: "THB", currencySymbol: "฿", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "SE Asia", defaultLang: "en" },
    // Africa
    NG: { name: "Nigeria", currency: "NGN", currencySymbol: "₦", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "en" },
    KE: { name: "Kenya", currency: "KES", currencySymbol: "KSh", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "sw" },
    TZ: { name: "Tanzania", currency: "TZS", currencySymbol: "TSh", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "sw" },
    UG: { name: "Uganda", currency: "UGX", currencySymbol: "USh", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "en" },
    GH: { name: "Ghana", currency: "GHS", currencySymbol: "GH₵", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "en" },
    ZA: { name: "South Africa", currency: "ZAR", currencySymbol: "R", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "en" },
    ET: { name: "Ethiopia", currency: "ETB", currencySymbol: "Br", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "en" },
    SO: { name: "Somalia", currency: "SOS", currencySymbol: "Sh", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "ar" },
    SN: { name: "Senegal", currency: "XOF", currencySymbol: "CFA", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "fr" },
    CI: { name: "Côte d'Ivoire", currency: "XOF", currencySymbol: "CFA", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Africa", defaultLang: "fr" },
    // Europe / diaspora
    TR: { name: "Türkiye", currency: "TRY", currencySymbol: "₺", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Europe/Asia", defaultLang: "tr" },
    GB: { name: "United Kingdom", currency: "GBP", currencySymbol: "£", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Europe", defaultLang: "en" },
    FR: { name: "France", currency: "EUR", currencySymbol: "€", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Europe", defaultLang: "fr" },
    DE: { name: "Germany", currency: "EUR", currencySymbol: "€", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Europe", defaultLang: "de" },
    ES: { name: "Spain", currency: "EUR", currencySymbol: "€", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Europe", defaultLang: "es" },
    NL: { name: "Netherlands", currency: "EUR", currencySymbol: "€", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Europe", defaultLang: "en" },
    SE: { name: "Sweden", currency: "SEK", currencySymbol: "kr", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Europe", defaultLang: "en" },
    // Americas
    US: { name: "United States", currency: "USD", currencySymbol: "$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Americas", defaultLang: "en" },
    CA: { name: "Canada", currency: "CAD", currencySymbol: "C$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Americas", defaultLang: "en" },
    MX: { name: "Mexico", currency: "MXN", currencySymbol: "MX$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Americas", defaultLang: "es" },
    BR: { name: "Brazil", currency: "BRL", currencySymbol: "R$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Americas", defaultLang: "pt" },
    AR: { name: "Argentina", currency: "ARS", currencySymbol: "$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Americas", defaultLang: "es" },
    // Oceania
    AU: { name: "Australia", currency: "AUD", currencySymbol: "A$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Oceania", defaultLang: "en" },
    NZ: { name: "New Zealand", currency: "NZD", currencySymbol: "NZ$", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Oceania", defaultLang: "en" },
    // Central Asia
    UZ: { name: "Uzbekistan", currency: "UZS", currencySymbol: "so'm", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Central Asia", defaultLang: "en" },
    KZ: { name: "Kazakhstan", currency: "KZT", currencySymbol: "₸", goldUnit: "gram", goldGramsPerUnit: 1, nisabGoldGrams: 85, region: "Central Asia", defaultLang: "en" },
    // Global fallback
    GLOBAL: {
      name: "International",
      currency: "USD",
      currencySymbol: "$",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Global",
      defaultLang: "en",
      note: "Select your country for local currency and language",
    },
  };

  const COUNTRY_KEY = "dc_country";

  function getCountryCode() {
    try {
      return localStorage.getItem(COUNTRY_KEY) || "GLOBAL";
    } catch {
      return "GLOBAL";
    }
  }

  function setCountryCode(code, opts) {
    const c = COUNTRIES[code] ? code : "GLOBAL";
    try {
      localStorage.setItem(COUNTRY_KEY, c);
    } catch (_) {}
    const profile = COUNTRIES[c];
    // Auto-apply country's default language (unless caller opts out)
    if (!opts || opts.applyLang !== false) {
      const lang = profile.defaultLang || "en";
      if (typeof window !== "undefined" && window.I18n && typeof I18n.setLang === "function") {
        try { I18n.setLang(lang); } catch (_) {}
      }
    }
    try {
      window.dispatchEvent(new CustomEvent("dc:countrychange", { detail: { code: c, profile } }));
    } catch (_) {}
    return profile;
  }

  function getCountry() {
    return COUNTRIES[getCountryCode()] || COUNTRIES.GLOBAL;
  }

  function listCountries() {
    return Object.keys(COUNTRIES)
      .filter((code) => code !== "GLOBAL")
      .sort((a, b) => COUNTRIES[a].name.localeCompare(COUNTRIES[b].name))
      .concat(["GLOBAL"])
      .map((code) => ({ code, ...COUNTRIES[code] }));
  }

  function isRtl(lang) {
    return RTL.has(lang);
  }

  function formatMoney(amount, countryCode) {
    const c = COUNTRIES[countryCode || getCountryCode()] || COUNTRIES.GLOBAL;
    const n = Number(amount) || 0;
    try {
      return (
        c.currencySymbol +
        " " +
        n.toLocaleString(undefined, { maximumFractionDigits: 0 })
      );
    } catch {
      return c.currency + " " + Math.round(n);
    }
  }

  function fillCountrySelect(selectEl, selected) {
    if (!selectEl) return;
    const sel = selected || getCountryCode();
    selectEl.innerHTML = listCountries()
      .map(
        (c) =>
          `<option value="${c.code}" ${c.code === sel ? "selected" : ""}>${c.name} (${c.currency}) · ${c.defaultLang}</option>`
      )
      .join("");
  }

  function fillLangSelect(selectEl, selected) {
    if (!selectEl) return;
    const sel = selected || "en";
    selectEl.innerHTML = LANGUAGES.map(
      (l) =>
        `<option value="${l.code}" ${l.code === sel ? "selected" : ""}>${l.native} (${l.label})</option>`
    ).join("");
  }

  return {
    LANGUAGES,
    COUNTRIES,
    RTL,
    isRtl,
    getCountryCode,
    setCountryCode,
    getCountry,
    listCountries,
    formatMoney,
    fillCountrySelect,
    fillLangSelect,
  };
})();

if (typeof window !== "undefined") window.DCLocales = DCLocales;
