/**
 * DonationChain i18n — multi-language (en/ur/ar/fr/id/ms/tr/bn/hi/sw)
 * Missing keys fall back to English.
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
      "nav.needHelp": "Needy",
      "nav.becomeDonor": "Donor",
      "footer.more": "More",
      // hero
      "hero.live": "Direct to hospitals, schools & vendors",
      "hero.title1": "Donors meet people in need.",
      "hero.title2": "Payment goes to the hospital or school.",
      "hero.sub": "Simple: someone needs help, someone gives help. Money is paid only to the relevant organization — never as personal cash.",
      "hero.browse": "See open cases",
      "hero.how": "How it works",
      "hero.donors": "Donors",
      "hero.closed": "Cases closed",
      "hero.fraud": "Fraud reduction",
      "hero.recent": "Recent delivery proof",
      "hero.verified": "Verified",
      "hero.note": "Funds never go to personal cash accounts",
      "hero.pathsHint": "This platform connects Donors and Needy people.",
      "hero.ctaDonor": "Donor",
      "hero.ctaDonorSub": "I want to give · Open cases & register",
      "hero.ctaNeedy": "Needy",
      "hero.ctaNeedySub": "I need help · Apply for support",
      // trust strip
      "trust.ai": "AI fraud screening",
      "trust.vendor": "Direct vendor payouts",
      "trust.audit": "Digital audit trail",
      "trust.zakat": "Zakat compliant",
      "trust.pci": "PCI-ready payments",
      // cases
      "cases.title": "Verified cases",
      "cases.sub": "Pick a case. Your payment goes to the hospital, school, or vendor — not to personal cash.",
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
      "how.sub": "Three steps. No middleman cash.",
      "how.1t": "Need is listed",
      "how.1d": "A person submits a need. We verify the case and the institution.",
      "how.2t": "You give",
      "how.2d": "A donor chooses a case and pays.",
      "how.3t": "Organization is paid",
      "how.3d": "Payment goes straight to that hospital, school, or vendor account.",
      "how.4t": "Proof",
      "how.4d": "You can see that the organization received the payment.",
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
      "donate.demo": "Payment goes only to the verified organization — never personal cash.",
      // login
      "login.title": "Login / Register",
      "login.sub": "OTP-secured access for donors",
      "login.send": "Send OTP",
      "login.verify": "Verify & continue",
      "login.otpHint": "Enter the code sent to your phone",
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
      "footer.copy": "© 2026 DonationChain. Institutional payouts only.",
      // toasts / js
      "toast.otp": "OTP sent",
      "toast.phone": "Enter a valid mobile number (03XX XXXXXXX)",
      "toast.badOtp": "Invalid OTP. Use 123456 for demo.",
      "toast.welcome": "Welcome back",
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
      "nav.needHelp": "ضرورت مند",
      "nav.becomeDonor": "ڈونر",
      "footer.more": "مزید",
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
      "hero.pathsHint": "یہ پلیٹ فارم ڈونر اور ضرورت مندوں کو ملاتا ہے۔",
      "hero.ctaDonor": "ڈونر",
      "hero.ctaDonorSub": "میں دینا چاہتا ہوں · کیسز اور رجسٹر",
      "hero.ctaNeedy": "ضرورت مند",
      "hero.ctaNeedySub": "مجھے مدد چاہیے · سپورٹ کے لیے درخواست",
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
      "donate.demo": "ادائیگی صرف تصدیق شدہ ادارے کو جاتی ہے — ذاتی نقد نہیں۔",
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
    ar: {
      "nav.cases": "الحالات",
      "nav.how": "كيف يعمل",
      "nav.zakat": "الزكاة",
      "nav.trust": "الثقة",
      "nav.verify": "تحقق",
      "nav.explorer": "المستكشف",
      "nav.impact": "أثري",
      "nav.admin": "الإدارة",
      "nav.login": "تسجيل الدخول",
      "nav.dashboard": "لوحة التحكم",
      "nav.donate": "تبرع",
      "nav.needHelp": "محتاج",
      "nav.becomeDonor": "متبرع",
      "footer.more": "المزيد",
      "footer.product": "المنتج",
      "footer.platform": "المنصة",
      "hero.live": "مباشر · تتبع كامل للتبرعات",
      "hero.title1": "كل روبية",
      "hero.title2": "متابعة ومثبتة",
      "hero.sub": "بدون وسيط. دفع مباشر للمستشفيات والمدارس والبائعين الموثوقين. متوافق مع الزكاة.",
      "hero.browse": "تصفح الحالات الموثقة",
      "hero.how": "كيف يعمل",
      "hero.donors": "المتبرعون",
      "hero.closed": "حالات مكتملة",
      "hero.fraud": "تقليل الاحتيال",
      "hero.pathsHint": "هذه المنصة تربط المتبرعين والمحتاجين.",
      "hero.ctaDonor": "متبرع",
      "hero.ctaDonorSub": "أريد أن أتبرع · الحالات والتسجيل",
      "hero.ctaNeedy": "محتاج",
      "hero.ctaNeedySub": "أحتاج مساعدة · قدّم طلباً للدعم",
      "cases.title": "حالات موثقة",
      "cases.sub": "فحص بالذكاء الاصطناعي والموظفين. المدفوعات للمؤسسات المسجلة فقط.",
      "cases.search": "ابحث عن مدينة أو مستشفى أو مدرسة…",
      "cases.all": "الكل",
      "cases.medical": "طبي",
      "cases.education": "تعليم",
      "cases.food": "غذاء",
      "cases.utility": "مرافق",
      "cases.donate": "تبرع",
      "cases.details": "التفاصيل",
      "cases.verified": "موثق",
      "zakat.title": "حاسبة الزكاة",
      "zakat.calc": "احسب الزكاة",
      "donate.title": "إتمام التبرع",
      "nav.login": "تسجيل الدخول",
      "lang.en": "English",
      "lang.ur": "اردو",
      "lang.ar": "العربية",
    },

    fr: {
      "nav.cases": "Cas",
      "nav.zakat": "Zakat",
      "nav.login": "Connexion",
      "nav.dashboard": "Tableau de bord",
      "nav.needHelp": "Besoin d'aide",
      "nav.becomeDonor": "Donateur",
      "hero.ctaDonor": "Donateur",
      "hero.ctaNeedy": "Besoin d'aide",
      "hero.pathsHint": "Cette plateforme relie donateurs et personnes dans le besoin.",
      "hero.title1": "Les donateurs rencontrent ceux qui ont besoin d'aide.",
      "hero.sub": "Les paiements vont uniquement aux organisations vérifiées — jamais en espèces personnelles.",
      "trust.zakat": "Conforme à la Zakat",
      "zakat.title": "Calculateur de Zakat",
      "zakat.calc": "Calculer la Zakat (Nisab + Hawl)",
      "footer.product": "Produit",
      "footer.more": "Plus",
      "nav.how": "Comment ça marche",
      "cases.donate": "Donner",
    },
    id: {
      "nav.cases": "Kasus",
      "nav.zakat": "Zakat",
      "nav.login": "Masuk",
      "nav.dashboard": "Dasbor",
      "nav.needHelp": "Butuh bantuan",
      "nav.becomeDonor": "Donatur",
      "hero.ctaDonor": "Donatur",
      "hero.ctaNeedy": "Butuh bantuan",
      "hero.pathsHint": "Platform ini menghubungkan donatur dan orang yang membutuhkan.",
      "hero.title1": "Donatur bertemu orang yang membutuhkan.",
      "hero.sub": "Pembayaran hanya ke organisasi terverifikasi — bukan uang tunai pribadi.",
      "trust.zakat": "Sesuai Zakat",
      "zakat.title": "Kalkulator Zakat",
      "zakat.calc": "Hitung Zakat (Nisab + Hawl)",
      "footer.product": "Produk",
      "footer.more": "Lainnya",
      "nav.how": "Cara kerja",
      "cases.donate": "Donasi",
    },
    ms: {
      "nav.cases": "Kes",
      "nav.zakat": "Zakat",
      "nav.login": "Log masuk",
      "nav.dashboard": "Papan pemuka",
      "nav.needHelp": "Perlukan bantuan",
      "nav.becomeDonor": "Penderma",
      "hero.ctaDonor": "Penderma",
      "hero.ctaNeedy": "Perlukan bantuan",
      "hero.pathsHint": "Platform ini menghubungkan penderma dan mereka yang memerlukan.",
      "zakat.title": "Kalkulator Zakat",
      "zakat.calc": "Kira Zakat (Nisab + Hawl)",
      "cases.donate": "Derma",
    },
    tr: {
      "nav.cases": "Vakalar",
      "nav.zakat": "Zekât",
      "nav.login": "Giriş",
      "nav.dashboard": "Panel",
      "nav.needHelp": "Yardım gerekli",
      "nav.becomeDonor": "Bağışçı",
      "hero.ctaDonor": "Bağışçı",
      "hero.ctaNeedy": "Yardım gerekli",
      "hero.pathsHint": "Bu platform bağışçıları ihtiyaç sahipleriyle buluşturur.",
      "zakat.title": "Zekât hesaplayıcı",
      "zakat.calc": "Zekât hesapla (Nisab + Havl)",
      "cases.donate": "Bağış yap",
    },
    bn: {
      "nav.cases": "কেস",
      "nav.zakat": "যাকাত",
      "nav.login": "লগইন",
      "nav.dashboard": "ড্যাশবোর্ড",
      "nav.needHelp": "সাহায্য চাই",
      "nav.becomeDonor": "দাতা",
      "hero.ctaDonor": "দাতা",
      "hero.ctaNeedy": "সাহায্য চাই",
      "zakat.title": "যাকাত ক্যালকুলেটর",
      "zakat.calc": "যাকাত হিসাব করুন",
      "cases.donate": "দান করুন",
    },
    hi: {
      "nav.cases": "केस",
      "nav.zakat": "ज़कात",
      "nav.login": "लॉगिन",
      "nav.dashboard": "डैशबोर्ड",
      "nav.needHelp": "मदद चाहिए",
      "nav.becomeDonor": "दाता",
      "hero.ctaDonor": "दाता",
      "hero.ctaNeedy": "मदद चाहिए",
      "zakat.title": "ज़कात कैलकुलेटर",
      "zakat.calc": "ज़कात गणना करें",
      "cases.donate": "दान करें",
    },
    sw: {
      "nav.cases": "Kesi",
      "nav.zakat": "Zaka",
      "nav.login": "Ingia",
      "nav.dashboard": "Dashibodi",
      "nav.needHelp": "Nahitaji msaada",
      "nav.becomeDonor": "Mfadhili",
      "hero.ctaDonor": "Mfadhili",
      "hero.ctaNeedy": "Nahitaji msaada",
      "zakat.title": "Kikokotoo cha Zaka",
      "zakat.calc": "Kokotoa Zaka",
      "cases.donate": "Changia",
    },

  };

  const SUPPORTED = ["en", "ur", "ar"];

  function getLang() {
    const l = localStorage.getItem(KEY) || "en";
    return SUPPORTED.includes(l) ? l : "en";
  }

  function setLang(lang) {
    const supported = ["en","ur","ar","fr","id","ms","tr","bn","hi","sw"];
    if (!supported.includes(lang)) lang = "en";
    try { localStorage.setItem(KEY, lang); } catch (_) {}
    document.documentElement.lang = lang;
    const rtl = lang === "ur" || lang === "ar";
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    apply();
    try {
      const sel = document.getElementById("lang-select");
      if (sel) sel.value = lang;
    } catch (_) {}
    return lang;
  }

  function t(key) {
    const lang = getLang();
    const d = dict[lang] || dict.en;
    if (d && d[key] != null) return d[key];
    if (dict.en && dict.en[key] != null) return dict.en[key];
    return key;
  }

  function apply() {
    const lang = getLang();
    document.documentElement.lang = lang === "ar" ? "ar" : lang === "ur" ? "ur" : "en";
    document.documentElement.dir = (lang === "ur" || lang === "ar") ? "rtl" : "ltr";

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

    const sel = document.getElementById("lang-select");
    if (sel) sel.value = lang;
    const btn = document.getElementById("lang-toggle");
    if (btn) {
      btn.textContent = lang === "en" ? "اردو" : "English";
      btn.setAttribute("aria-label", "Switch language");
    }

    if (typeof renderCases === "function") {
      try { renderCases(); } catch (_) {}
    }

    window.dispatchEvent(new CustomEvent("dc:langchange", { detail: { lang } }));
  }

  function toggle() {
    const order = ["en", "ur", "ar"];
    const i = order.indexOf(getLang());
    return setLang(order[(i + 1) % order.length]);
  }

  return { getLang, setLang, toggle, t, apply, dict, SUPPORTED };
})();

window.I18n = I18n;
window.t = (key) => I18n.t(key);
