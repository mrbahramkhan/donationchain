/**
 * DonationChain — global locales & country profiles
 * Zakat/Nisab defaults are guidance for UI; local scholars remain authoritative.
 */
const DCLocales = (() => {
  /** UI languages — full or partial dictionaries; missing keys fall back to English */
  const LANGUAGES = [
    { code: "en", label: "English", dir: "ltr", native: "English" },
    { code: "ur", label: "Urdu", dir: "rtl", native: "اردو" },
    { code: "ar", label: "Arabic", dir: "rtl", native: "العربية" },
    { code: "fr", label: "French", dir: "ltr", native: "Français" },
    { code: "id", label: "Indonesian", dir: "ltr", native: "Bahasa Indonesia" },
    { code: "ms", label: "Malay", dir: "ltr", native: "Bahasa Melayu" },
    { code: "tr", label: "Turkish", dir: "ltr", native: "Türkçe" },
    { code: "bn", label: "Bengali", dir: "ltr", native: "বাংলা" },
    { code: "hi", label: "Hindi", dir: "ltr", native: "हिन्दी" },
    { code: "sw", label: "Swahili", dir: "ltr", native: "Kiswahili" },
  ];

  /**
   * Country profiles for currency, gold unit, and Zakat UI defaults.
   * nisabGoldGrams: classical ~85g pure gold (AAOIFI); PK often uses 7.5 tola ≈ 87.48g.
   */
  const COUNTRIES = {
    PK: {
      name: "Pakistan",
      currency: "PKR",
      currencySymbol: "Rs",
      goldUnit: "tola",
      goldGramsPerUnit: 11.664,
      nisabGoldGrams: 87.48,
      nisabGoldTola: 7.5,
      region: "South Asia",
      defaultLang: "ur",
    },
    SA: {
      name: "Saudi Arabia",
      currency: "SAR",
      currencySymbol: "﷼",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "GCC",
      defaultLang: "ar",
      note: "Corporate Zakat also regulated by ZATCA for businesses",
    },
    AE: {
      name: "United Arab Emirates",
      currency: "AED",
      currencySymbol: "د.إ",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "GCC",
      defaultLang: "ar",
    },
    QA: {
      name: "Qatar",
      currency: "QAR",
      currencySymbol: "ر.ق",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "GCC",
      defaultLang: "ar",
    },
    KW: {
      name: "Kuwait",
      currency: "KWD",
      currencySymbol: "د.ك",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "GCC",
      defaultLang: "ar",
    },
    BH: {
      name: "Bahrain",
      currency: "BHD",
      currencySymbol: "ب.د",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "GCC",
      defaultLang: "ar",
    },
    OM: {
      name: "Oman",
      currency: "OMR",
      currencySymbol: "ر.ع.",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "GCC",
      defaultLang: "ar",
    },
    MY: {
      name: "Malaysia",
      currency: "MYR",
      currencySymbol: "RM",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "SE Asia",
      defaultLang: "ms",
    },
    ID: {
      name: "Indonesia",
      currency: "IDR",
      currencySymbol: "Rp",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "SE Asia",
      defaultLang: "id",
    },
    BD: {
      name: "Bangladesh",
      currency: "BDT",
      currencySymbol: "৳",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 87.48,
      region: "South Asia",
      defaultLang: "bn",
    },
    IN: {
      name: "India",
      currency: "INR",
      currencySymbol: "₹",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "South Asia",
      defaultLang: "hi",
    },
    TR: {
      name: "Türkiye",
      currency: "TRY",
      currencySymbol: "₺",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Europe/Asia",
      defaultLang: "tr",
    },
    EG: {
      name: "Egypt",
      currency: "EGP",
      currencySymbol: "E£",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "MENA",
      defaultLang: "ar",
    },
    NG: {
      name: "Nigeria",
      currency: "NGN",
      currencySymbol: "₦",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Africa",
      defaultLang: "en",
    },
    KE: {
      name: "Kenya",
      currency: "KES",
      currencySymbol: "KSh",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Africa",
      defaultLang: "sw",
    },
    GB: {
      name: "United Kingdom",
      currency: "GBP",
      currencySymbol: "£",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Europe",
      defaultLang: "en",
    },
    US: {
      name: "United States",
      currency: "USD",
      currencySymbol: "$",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Americas",
      defaultLang: "en",
    },
    CA: {
      name: "Canada",
      currency: "CAD",
      currencySymbol: "C$",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Americas",
      defaultLang: "en",
    },
    AU: {
      name: "Australia",
      currency: "AUD",
      currencySymbol: "A$",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Oceania",
      defaultLang: "en",
    },
    FR: {
      name: "France",
      currency: "EUR",
      currencySymbol: "€",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Europe",
      defaultLang: "fr",
    },
    DE: {
      name: "Germany",
      currency: "EUR",
      currencySymbol: "€",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Europe",
      defaultLang: "en",
    },
    GLOBAL: {
      name: "International",
      currency: "USD",
      currencySymbol: "$",
      goldUnit: "gram",
      goldGramsPerUnit: 1,
      nisabGoldGrams: 85,
      region: "Global",
      defaultLang: "en",
      note: "AAOIFI-oriented defaults; select your country for local currency",
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

  function setCountryCode(code) {
    const c = COUNTRIES[code] ? code : "GLOBAL";
    try {
      localStorage.setItem(COUNTRY_KEY, c);
    } catch (_) {}
    return COUNTRIES[c];
  }

  function getCountry() {
    return COUNTRIES[getCountryCode()] || COUNTRIES.GLOBAL;
  }

  function listCountries() {
    return Object.keys(COUNTRIES).map((code) => ({
      code,
      ...COUNTRIES[code],
    }));
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

  /** Populate <select id="..."> with countries */
  function fillCountrySelect(selectEl, selected) {
    if (!selectEl) return;
    const sel = selected || getCountryCode();
    selectEl.innerHTML = listCountries()
      .map(
        (c) =>
          `<option value="${c.code}" ${c.code === sel ? "selected" : ""}>${c.name} (${c.currency})</option>`
      )
      .join("");
  }

  function fillLangSelect(selectEl, selected) {
    if (!selectEl) return;
    const sel = selected || "en";
    selectEl.innerHTML = LANGUAGES.map(
      (l) =>
        `<option value="${l.code}" ${l.code === sel ? "selected" : ""}>${l.native}</option>`
    ).join("");
  }

  return {
    LANGUAGES,
    COUNTRIES,
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
