/**
 * DonationChain i18n — English / اردو
 */
const I18n = (() => {
  const KEY = "dc_lang";
  const dict = {
    en: {
      // nav
      "nav.cases": "Cases",
      "nav.how": "How it works",
      "nav.zakat": "Zakat",
      "nav.trust": "Trust",
      "nav.verify": "Verify",
      "nav.explorer": "Explorer",
      "nav.impact": "My impact",
      "nav.admin": "Admin",
      "nav.login": "Login",
      "nav.dashboard": "Dashboard",
      "nav.donate": "Donate",
      // hero
      "hero.live": "Live · PKR 2.84B delivered with full audit trail",
      "hero.title1": "Every rupee",
      "hero.title2": "tracked & proven",
      "hero.sub": "Zero middleman. Direct payments to hospitals, schools, and verified vendors. AI fraud checks. Zakat-compliant. Built for donor trust.",
      "hero.browse": "Browse verified cases",
      "hero.how": "How it works",
      "hero.donors": "Donors",
      "hero.closed": "Cases closed",
      "hero.fraud": "Fraud reduction",
      "hero.recent": "Recent delivery proof",
      "hero.verified": "Verified",
      "hero.note": "Funds never go to personal cash accounts",
      // trust strip
      "trust.ai": "AI fraud screening",
      "trust.vendor": "Direct vendor payouts",
      "trust.audit": "Digital audit trail",
      "trust.zakat": "Zakat compliant",
      "trust.pci": "PCI-ready payments",
      // cases
      "cases.title": "Verified cases",
      "cases.sub": "Screened by AI + officers. Payments go only to registered institutions.",
      "cases.search": "Search city, hospital, school…",
      "cases.all": "All",
      "cases.medical": "Medical",
      "cases.education": "Education",
      "cases.food": "Food",
      "cases.utility": "Utility",
      "cases.empty": "No cases match your filters",
      "cases.clear": "Clear filters",
      "cases.details": "Details",
      "cases.donate": "Donate",
      "cases.verified": "Verified",
      "cases.goal": "Goal",
      "cases.funded": "funded",
      "cases.remaining": "remaining",
      "urgency.critical": "Critical",
      "urgency.high": "High",
      "urgency.medium": "Medium",
      // how
      "how.title": "How DonationChain works",
      "how.sub": "Designed so donors never wonder where money went.",
      "how.1t": "Case verified",
      "how.1d": "CNIC checks, AI document scoring, officer review, and optional NGO field visit.",
      "how.2t": "You donate",
      "how.2d": "JazzCash, EasyPaisa, Raast, or card. Amount linked to a specific case and category.",
      "how.3t": "Vendor paid directly",
      "how.3d": "Hospital, school, or utility receives funds in their registered account — never cash-in-hand.",
      "how.4t": "Proof in dashboard",
      "how.4d": "Invoice, delivery photo, or enrollment proof appears in your impact timeline within 48 hours.",
      // zakat
      "zakat.badge": "Islamic giving",
      "zakat.title": "Zakat calculator",
      "zakat.sub": "Estimate 2.5% on gold, silver, cash, and business assets. Distribute only to Zakat-eligible verified cases with a clear trail.",
      "zakat.gold": "Gold (tola)",
      "zakat.silver": "Silver (tola)",
      "zakat.cash": "Cash / bank (PKR)",
      "zakat.business": "Business assets (PKR)",
      "zakat.calc": "Calculate Zakat (2.5%)",
      "zakat.base": "Estimated zakatable base:",
      "zakat.yours": "Your Zakat",
      "zakat.distribute": "Distribute to eligible cases",
      // trust section
      "trust.title": "Built for accountability",
      "trust.1t": "AI pre-screening",
      "trust.1d": "Duplicate CNIC detection, document authenticity scoring, and risk flags before human review.",
      "trust.2t": "No cash to beneficiaries",
      "trust.2d": "Platform rule: payouts only to verified institutional accounts — hospitals, schools, utilities, vendors.",
      "trust.3t": "CSR & Zakat reports",
      "trust.3d": "Export-ready impact summaries for corporate compliance and personal Zakat records.",
      // verify
      "verify.badge": "Blockchain-style verification",
      "verify.title": "Verify a donation",
      "verify.sub": "Each donation is hashed into an append-only chain. Anyone with a receipt ID can check integrity.",
      "verify.receipt": "Receipt ID",
      "verify.ledger": "Verify ledger",
      "verify.onchain": "Check on-chain",
      "verify.merkle": "Merkle proof",
      // donate modal
      "donate.title": "Complete donation",
      "donate.supporting": "Supporting verified case",
      "donate.amount": "Amount (PKR)",
      "donate.method": "Payment method",
      "donate.anonymous": "Donate anonymously",
      "donate.pay": "Pay Securely",
      "donate.demo": "Demo mode — no real charge. Funds message: direct to verified vendor.",
      // login
      "login.title": "Login / Register",
      "login.sub": "OTP-secured access for donors",
      "login.send": "Send OTP",
      "login.verify": "Verify & continue",
      "login.otpHint": "Demo OTP: 123456",
      // receipt
      "receipt.ok": "Payment successful",
      "receipt.digital": "Digital receipt generated",
      "receipt.share": "Share",
      "receipt.impact": "Impact",
      "receipt.done": "Done",
      "receipt.ledger": "Ledger status",
      "receipt.block": "Block",
      "receipt.hash": "Tx hash",
      "receipt.merkle": "Merkle",
      // case detail
      "detail.close": "Close",
      "detail.donate": "Donate to this case",
      "detail.verified": "Verified vendor",
      // footer
      "footer.tag": "Enterprise donation management with radical transparency for South Asia.",
      "footer.product": "Product",
      "footer.platform": "Platform",
      "footer.copy": "© 2026 DonationChain. Demo platform — payments simulated.",
      // toasts / js
      "toast.otp": "OTP sent (Demo: 123456)",
      "toast.phone": "Enter a valid mobile number (03XX XXXXXXX)",
      "toast.badOtp": "Invalid OTP. Use 123456 for demo.",
      "toast.welcome": "Welcome back, Demo Donor",
      "toast.loginDonate": "Please login to donate",
      "toast.maintenance": "Platform is in maintenance mode",
      "toast.copied": "Copied to clipboard",
      "lang.en": "English",
      "lang.ur": "اردو",
    },
    ur: {
      "nav.cases": "کیسز",
      "nav.how": "کیسے کام کرتا ہے",
      "nav.zakat": "زکوٰۃ",
      "nav.trust": "اعتماد",
      "nav.verify": "تصدیق",
      "nav.explorer": "ایکسپلورر",
      "nav.impact": "میرا اثر",
      "nav.admin": "ایڈمن",
      "nav.login": "لاگ اِن",
      "nav.dashboard": "ڈیش بورڈ",
      "nav.donate": "عطیہ دیں",
      "hero.live": "لائیو · ۲.۸۴ ارب روپے مکمل آڈٹ کے ساتھ پہنچائے گئے",
      "hero.title1": "ہر روپیہ",
      "hero.title2": "ٹریک اور ثابت",
      "hero.sub": "صفر درمیانی۔ براہِ راست ہسپتالوں، اسکولوں اور تصدیق شدہ وینڈرز کو ادائیگی۔ اے آئی فراڈ چیک۔ زکوٰۃ کے مطابق۔ عطیہ دہندگان کے اعتماد کے لیے۔",
      "hero.browse": "تصدیق شدہ کیسز دیکھیں",
      "hero.how": "کیسے کام کرتا ہے",
      "hero.donors": "عطیہ دہندگان",
      "hero.closed": "مکمل کیسز",
      "hero.fraud": "فراڈ میں کمی",
      "hero.recent": "حالیہ ڈیلیوری ثبوت",
      "hero.verified": "تصدیق شدہ",
      "hero.note": "فنڈز کبھی ذاتی نقد اکاؤنٹس میں نہیں جاتے",
      "trust.ai": "اے آئی فراڈ اسکریننگ",
      "trust.vendor": "براہِ راست وینڈر ادائیگی",
      "trust.audit": "ڈیجیٹل آڈٹ ٹریل",
      "trust.zakat": "زکوٰۃ کے مطابق",
      "trust.pci": "محفوظ ادائیگیاں",
      "cases.title": "تصدیق شدہ کیسز",
      "cases.sub": "اے آئی اور افسران کی جانچ۔ ادائیگی صرف رجسٹرڈ اداروں کو۔",
      "cases.search": "شہر، ہسپتال، اسکول تلاش کریں…",
      "cases.all": "تمام",
      "cases.medical": "طبی",
      "cases.education": "تعلیم",
      "cases.food": "خوراک",
      "cases.utility": "یوٹیلٹی",
      "cases.empty": "آپ کے فلٹر سے کوئی کیس نہیں ملا",
      "cases.clear": "فلٹر صاف کریں",
      "cases.details": "تفصیل",
      "cases.donate": "عطیہ",
      "cases.verified": "تصدیق شدہ",
      "cases.goal": "ہدف",
      "cases.funded": "جمع",
      "cases.remaining": "باقی",
      "urgency.critical": "انتہائی",
      "urgency.high": "اونچا",
      "urgency.medium": "درمیانہ",
      "how.title": "ڈونیشن چین کیسے کام کرتا ہے",
      "how.sub": "تاکہ عطیہ دہندہ کو یہ نہ سوچنا پڑے کہ پیسہ کہاں گیا۔",
      "how.1t": "کیس تصدیق",
      "how.1d": "شناختی کارڈ چیک، دستاویز اسکورنگ، افسر جائزہ، اور اختیاری فیلڈ وزٹ۔",
      "how.2t": "آپ عطیہ دیتے ہیں",
      "how.2d": "جاز کیش، ایزی پیسہ، راست یا کارڈ۔ رقم مخصوص کیس سے منسلک۔",
      "how.3t": "وینڈر کو براہِ راست ادائیگی",
      "how.3d": "ہسپتال، اسکول یا یوٹیلٹی اپنے رجسٹرڈ اکاؤنٹ میں رقم وصول کرتے ہیں — کبھی نقد نہیں۔",
      "how.4t": "ڈیش بورڈ میں ثبوت",
      "how.4d": "انوائس، ڈیلیوری فوٹو یا داخلہ ثبوت ۴۸ گھنٹوں میں آپ کی ٹائم لائن پر۔",
      "zakat.badge": "اسلامی عطیہ",
      "zakat.title": "زکوٰۃ کیلکولیٹر",
      "zakat.sub": "سونے، چاندی، نقدی اور کاروباری اثاثوں پر ۲.۵٪ کا اندازہ۔ صرف اہل تصدیق شدہ کیسز پر تقسیم۔",
      "zakat.gold": "سونا (تولہ)",
      "zakat.silver": "چاندی (تولہ)",
      "zakat.cash": "نقد / بینک (روپے)",
      "zakat.business": "کاروباری اثاثے (روپے)",
      "zakat.calc": "زکوٰۃ شمار کریں (۲.۵٪)",
      "zakat.base": "تخمینی قابلِ زکوٰۃ بنیاد:",
      "zakat.yours": "آپ کی زکوٰۃ",
      "zakat.distribute": "اہل کیسز پر تقسیم کریں",
      "trust.title": "احتساب کے لیے بنایا گیا",
      "trust.1t": "اے آئی پری اسکریننگ",
      "trust.1d": "ڈپلیکیٹ شناختی کارڈ، دستاویز کی صدای، اور انسانی جائزے سے پہلے رسک فلیگز۔",
      "trust.2t": "مستحقین کو نقد نہیں",
      "trust.2d": "ادائیگی صرف تصدیق شدہ ادارہ جاتی اکاؤنٹس کو — ہسپتال، اسکول، یوٹیلٹی، وینڈر۔",
      "trust.3t": "سی ایس آر اور زکوٰۃ رپورٹس",
      "trust.3d": "کارپوریٹ اور ذاتی زکوٰۃ ریکارڈ کے لیے برآمد کے قابل خلاصے۔",
      "verify.badge": "بلاک چین طرز کی تصدیق",
      "verify.title": "عطیہ کی تصدیق کریں",
      "verify.sub": "ہر عطیہ ایک زنجیر میں ہیش ہوتا ہے۔ رسید آئی ڈی سے سالمیت چیک کریں۔",
      "verify.receipt": "رسید آئی ڈی",
      "verify.ledger": "لیجر تصدیق",
      "verify.onchain": "آن چین چیک",
      "verify.merkle": "مرکل پروف",
      "donate.title": "عطیہ مکمل کریں",
      "donate.supporting": "تصدیق شدہ کیس کی حمایت",
      "donate.amount": "رقم (روپے)",
      "donate.method": "ادائیگی کا طریقہ",
      "donate.anonymous": "گمنام عطیہ",
      "donate.pay": "محفوظ ادائیگی",
      "donate.demo": "ڈیمو موڈ — حقیقی چارج نہیں۔ پیغام: براہِ راست تصدیق شدہ وینڈر۔",
      "login.title": "لاگ اِن / رجسٹر",
      "login.sub": "عطیہ دہندگان کے لیے او ٹی پی محفوظ رسائی",
      "login.send": "او ٹی پی بھیجیں",
      "login.verify": "تصدیق اور آگے",
      "login.otpHint": "ڈیمو او ٹی پی: ۱۲۳۴۵۶",
      "receipt.ok": "ادائیگی کامیاب",
      "receipt.digital": "ڈیجیٹل رسید تیار",
      "receipt.share": "شیئر",
      "receipt.impact": "اثر",
      "receipt.done": "مکمل",
      "receipt.ledger": "لیجر حیثیت",
      "receipt.block": "بلاک",
      "receipt.hash": "ٹرانزیکشن ہیش",
      "receipt.merkle": "مرکل",
      "detail.close": "بند کریں",
      "detail.donate": "اس کیس کو عطیہ دیں",
      "detail.verified": "تصدیق شدہ وینڈر",
      "footer.tag": "جنوبی ایشیا کے لیے شفاف عطیہ انتظام۔",
      "footer.product": "پروڈکٹ",
      "footer.platform": "پلیٹ فارم",
      "footer.copy": "© ۲۰۲۶ ڈونیشن چین۔ ڈیمو — ادائیگیاں فرضی ہیں۔",
      "toast.otp": "او ٹی پی بھیج دیا (ڈیمو: ۱۲۳۴۵۶)",
      "toast.phone": "درست موبائل نمبر درج کریں (۰۳XX XXXXXXX)",
      "toast.badOtp": "غلط او ٹی پی۔ ڈیمو کے لیے ۱۲۳۴۵۶ استعمال کریں۔",
      "toast.welcome": "خوش آمدید، ڈیمو ڈونر",
      "toast.loginDonate": "عطیہ کے لیے لاگ اِن کریں",
      "toast.maintenance": "پلیٹ فارم مینٹیننس موڈ میں ہے",
      "toast.copied": "کلپ بورڈ پر کاپی ہو گیا",
      "lang.en": "English",
      "lang.ur": "اردو",
    },
  };

  function getLang() {
    return localStorage.getItem(KEY) === "ur" ? "ur" : "en";
  }

  function setLang(lang) {
    localStorage.setItem(KEY, lang === "ur" ? "ur" : "en");
    apply();
    return getLang();
  }

  function t(key) {
    const lang = getLang();
    return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || key;
  }

  function apply() {
    const lang = getLang();
    document.documentElement.lang = lang === "ur" ? "ur" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const val = t(key);
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (el.hasAttribute("data-i18n-placeholder")) el.placeholder = val;
        else el.value = val;
      } else {
        el.textContent = val;
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.placeholder = t(key);
    });

    // Toggle button label
    const btn = document.getElementById("lang-toggle");
    if (btn) {
      btn.textContent = lang === "ur" ? "English" : "اردو";
      btn.setAttribute("aria-label", lang === "ur" ? "Switch to English" : "اردو میں تبدیل کریں");
    }

    // Re-render dynamic case cards if available
    if (typeof renderCases === "function") {
      try { renderCases(); } catch (_) {}
    }

    window.dispatchEvent(new CustomEvent("dc:langchange", { detail: { lang } }));
  }

  function toggle() {
    return setLang(getLang() === "ur" ? "en" : "ur");
  }

  return { getLang, setLang, toggle, t, apply, dict };
})();

window.I18n = I18n;
window.t = (key) => I18n.t(key);
