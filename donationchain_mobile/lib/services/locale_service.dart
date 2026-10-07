import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight multi-language strings for mobile (country → default language).
class LocaleService {
  static const _key = 'dc_lang';
  static String _lang = 'en';

  static const supported = [
    'en', 'ur', 'ar', 'fr', 'es', 'pt', 'id', 'ms', 'tr', 'bn', 'hi', 'sw', 'de', 'fa', 'ha', 'ps'
  ];

  /// ISO country → default UI language
  static const countryLang = {
    'PK': 'ur', 'IN': 'hi', 'BD': 'bn', 'AF': 'ps',
    'SA': 'ar', 'AE': 'ar', 'QA': 'ar', 'KW': 'ar', 'BH': 'ar', 'OM': 'ar',
    'EG': 'ar', 'JO': 'ar', 'MA': 'ar', 'DZ': 'ar', 'TN': 'ar',
    'MY': 'ms', 'ID': 'id', 'BN': 'ms',
    'TR': 'tr', 'FR': 'fr', 'DE': 'de', 'ES': 'es', 'BR': 'pt', 'MX': 'es',
    'KE': 'sw', 'TZ': 'sw', 'NG': 'en', 'IR': 'fa',
    'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'GLOBAL': 'en',
  };

  static final Map<String, Map<String, String>> _t = {
    'en': {
      'app.title': 'DonationChain',
      'role.donate': 'Donate',
      'role.needHelp': 'Need help',
      'cases': 'Cases',
      'impact': 'Impact',
      'zakat': 'Zakat',
      'donate': 'Donate',
      'verified': 'Verified',
      'all': 'All',
      'medical': 'Medical',
      'education': 'Education',
      'food': 'Food',
      'utility': 'Utility',
      'emptyCases': 'No cases in this category',
      'showAll': 'Show all cases',
    },
    'ur': {
      'app.title': 'ڈونیشن چین',
      'role.donate': 'عطیہ دیں',
      'role.needHelp': 'مدد درکار',
      'cases': 'کیسز',
      'impact': 'اثر',
      'zakat': 'زکوٰۃ',
      'donate': 'عطیہ',
      'verified': 'تصدیق شدہ',
      'all': 'تمام',
      'medical': 'طبی',
      'education': 'تعلیم',
      'food': 'خوراک',
      'utility': 'یوٹیلٹی',
      'emptyCases': 'اس زمرے میں کوئی کیس نہیں',
      'showAll': 'تمام کیسز دکھائیں',
    },
    'ar': {
      'app.title': 'دونيشن تشين',
      'role.donate': 'تبرّع',
      'role.needHelp': 'أحتاج مساعدة',
      'cases': 'الحالات',
      'impact': 'أثري',
      'zakat': 'زكاة',
      'donate': 'تبرّع',
      'verified': 'موثّق',
      'all': 'الكل',
      'medical': 'طبي',
      'education': 'تعليم',
      'food': 'غذاء',
      'utility': 'مرافق',
      'emptyCases': 'لا توجد حالات في هذه الفئة',
      'showAll': 'عرض كل الحالات',
    },
    'fr': {
      'app.title': 'DonationChain',
      'role.donate': 'Donner',
      'role.needHelp': "Besoin d'aide",
      'cases': 'Cas',
      'impact': 'Impact',
      'zakat': 'Zakat',
      'donate': 'Donner',
      'verified': 'Vérifié',
      'all': 'Tous',
      'medical': 'Médical',
      'education': 'Éducation',
      'food': 'Alimentation',
      'utility': 'Services',
      'emptyCases': 'Aucun cas dans cette catégorie',
      'showAll': 'Afficher tous les cas',
    },
    'id': {
      'app.title': 'DonationChain',
      'role.donate': 'Donasi',
      'role.needHelp': 'Butuh bantuan',
      'cases': 'Kasus',
      'impact': 'Dampak',
      'zakat': 'Zakat',
      'donate': 'Donasi',
      'verified': 'Terverifikasi',
      'all': 'Semua',
      'medical': 'Medis',
      'education': 'Pendidikan',
      'food': 'Pangan',
      'utility': 'Utilitas',
      'emptyCases': 'Tidak ada kasus di kategori ini',
      'showAll': 'Tampilkan semua kasus',
    },
    'tr': {
      'app.title': 'DonationChain',
      'role.donate': 'Bağış yap',
      'role.needHelp': 'Yardıma ihtiyacım var',
      'cases': 'Vakalar',
      'impact': 'Etki',
      'zakat': 'Zekât',
      'donate': 'Bağış',
      'verified': 'Doğrulandı',
      'all': 'Tümü',
      'medical': 'Sağlık',
      'education': 'Eğitim',
      'food': 'Gıda',
      'utility': 'Fatura',
      'emptyCases': 'Bu kategoride vaka yok',
      'showAll': 'Tüm vakaları göster',
    },
    'hi': {
      'app.title': 'डोनेशनचेन',
      'role.donate': 'दान करें',
      'role.needHelp': 'मदद चाहिए',
      'cases': 'मामले',
      'impact': 'प्रभाव',
      'zakat': 'ज़कात',
      'donate': 'दान',
      'verified': 'सत्यापित',
      'all': 'सभी',
      'medical': 'चिकित्सा',
      'education': 'शिक्षा',
      'food': 'भोजन',
      'utility': 'उपयोगिता',
      'emptyCases': 'इस श्रेणी में कोई मामला नहीं',
      'showAll': 'सभी मामले दिखाएँ',
    },
    'bn': {
      'app.title': 'ডোনেশনচেইন',
      'role.donate': 'দান করুন',
      'role.needHelp': 'সাহায্য চাই',
      'cases': 'কেস',
      'impact': 'প্রভাব',
      'zakat': 'যাকাত',
      'donate': 'দান',
      'verified': 'যাচাইকৃত',
      'all': 'সব',
      'medical': 'চিকিৎসা',
      'education': 'শিক্ষা',
      'food': 'খাদ্য',
      'utility': 'ইউটিলিটি',
      'emptyCases': 'এই বিভাগে কোনো কেস নেই',
      'showAll': 'সব কেস দেখান',
    },
    'sw': {
      'app.title': 'DonationChain',
      'role.donate': 'Changia',
      'role.needHelp': 'Nahitaji msaada',
      'cases': 'Kesi',
      'impact': 'Athari',
      'zakat': 'Zaka',
      'donate': 'Changia',
      'verified': 'Imethibitishwa',
      'all': 'Zote',
      'medical': 'Matibabu',
      'education': 'Elimu',
      'food': 'Chakula',
      'utility': 'Huduma',
      'emptyCases': 'Hakuna kesi katika kategoria hii',
      'showAll': 'Onyesha kesi zote',
    },
  };

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final l = prefs.getString(_key) ?? 'en';
    _lang = supported.contains(l) ? l : 'en';
  }

  static Future<void> setLang(String code) async {
    _lang = supported.contains(code) ? code : 'en';
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, _lang);
  }

  static Future<void> setFromCountry(String countryCode) async {
    final lang = countryLang[countryCode.toUpperCase()] ?? 'en';
    await setLang(lang);
  }

  static String get lang => _lang;

  static String t(String key) {
    final d = _t[_lang] ?? _t['en']!;
    return d[key] ?? _t['en']![key] ?? key;
  }
}
