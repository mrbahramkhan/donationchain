import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/donation_case.dart';

class DataService {
/// Global sample cases aligned with web + backend (country + currency).
  static final List<DonationCase> cases = [
    DonationCase(id: 1, title: 'Heart Surgery — Amina, 7 yrs', category: 'medical', city: 'Cairo', country: 'EG', currency: 'EGP', amount: 185000, raised: 120000, urgency: 'critical', verified: true, vendor: "Children's Cancer Hospital Egypt"),
    DonationCase(id: 2, title: 'Secondary School Fees — Fatima', category: 'education', city: 'Jakarta', country: 'ID', currency: 'IDR', amount: 8500000, raised: 5200000, urgency: 'high', verified: true, vendor: 'SMA Negeri Partner School'),
    DonationCase(id: 3, title: 'Monthly Food Package — Family of 6', category: 'food', city: 'Nairobi', country: 'KE', currency: 'KES', amount: 18000, raised: 11000, urgency: 'medium', verified: true, vendor: 'Verified Grocery Cooperative'),
    DonationCase(id: 4, title: 'Electricity Arrears — Widow Household', category: 'utility', city: 'Lahore', country: 'PK', currency: 'PKR', amount: 18500, raised: 12000, urgency: 'high', verified: true, vendor: 'Regional Power Utility'),
    DonationCase(id: 5, title: 'Cancer Treatment — Cycle 3', category: 'medical', city: 'Istanbul', country: 'TR', currency: 'TRY', amount: 95000, raised: 61000, urgency: 'critical', verified: true, vendor: 'Acibadem Healthcare Group'),
    DonationCase(id: 6, title: 'University Semester Fee — Engineering', category: 'education', city: 'Dhaka', country: 'BD', currency: 'BDT', amount: 45000, raised: 28000, urgency: 'medium', verified: true, vendor: 'BUET Partner Accounts'),
    DonationCase(id: 7, title: 'Emergency Medicines — Elderly Couple', category: 'medical', city: 'Kuala Lumpur', country: 'MY', currency: 'MYR', amount: 2200, raised: 900, urgency: 'high', verified: true, vendor: 'Verified Community Pharmacy'),
    DonationCase(id: 8, title: 'Ramadan Food Drive — 20 Families', category: 'food', city: 'Amman', country: 'JO', currency: 'JOD', amount: 3200, raised: 2100, urgency: 'medium', verified: true, vendor: 'Local NGO Partner'),
    DonationCase(id: 9, title: 'Gas Utility Bill — Low-income Family', category: 'utility', city: 'Casablanca', country: 'MA', currency: 'MAD', amount: 1450, raised: 400, urgency: 'high', verified: true, vendor: 'National Gas Utility'),
    DonationCase(id: 10, title: 'Water Board Bill — Orphan Household', category: 'utility', city: 'Lagos', country: 'NG', currency: 'NGN', amount: 85000, raised: 12000, urgency: 'medium', verified: true, vendor: 'Municipal Water Board'),
  ];

  static Future<List<DonationRecord>> getDonations() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('dc_donations');
    if (raw == null) return [];
    final list = jsonDecode(raw) as List;
    return list.map((e) => DonationRecord.fromJson(e)).toList();
  }

  static Future<void> saveDonation(DonationRecord d) async {
    final prefs = await SharedPreferences.getInstance();
    final list = await getDonations();
    list.insert(0, d);
    await prefs.setString(
      'dc_donations',
      jsonEncode(list.map((e) => e.toJson()).toList()),
    );
  }

  /// role: donor | seeker | guest
  static Future<void> setUser(String name, String phone, {String role = 'donor'}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dc_user_name', name);
    await prefs.setString('dc_user_phone', phone);
    await prefs.setString('dc_user_role', role);
  }

  static Future<Map<String, String?>> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'name': prefs.getString('dc_user_name'),
      'phone': prefs.getString('dc_user_phone'),
      'role': prefs.getString('dc_user_role') ?? 'donor',
    };
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('dc_user_name');
    await prefs.remove('dc_user_phone');
    await prefs.remove('dc_user_role');
  }

  /// Seeker applications (local)
  static Future<List<Map<String, dynamic>>> getApplications() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('dc_applications');
    if (raw == null) return [];
    return List<Map<String, dynamic>>.from(jsonDecode(raw) as List);
  }

  static Future<Map<String, dynamic>> saveApplication(Map<String, dynamic> app) async {
    final prefs = await SharedPreferences.getInstance();
    final list = await getApplications();
    final id = 'APP-${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}';
    final record = {
      ...app,
      'id': id,
      'status': 'pending_review',
      'createdAt': DateTime.now().toIso8601String(),
    };
    list.insert(0, record);
    await prefs.setString('dc_applications', jsonEncode(list));
    return record;
  }

  /// Hawl / Zakat tracker (local)
  static Future<Map<String, dynamic>> getHawlState() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('dc_hawl');
    if (raw == null) {
      return {
        'hawlStart': null,
        'declaredComplete': false,
        'payments': <Map<String, dynamic>>[],
      };
    }
    return Map<String, dynamic>.from(jsonDecode(raw) as Map);
  }

  static Future<void> saveHawlState(Map<String, dynamic> state) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dc_hawl', jsonEncode(state));
  }

  static Future<void> recordZakatPayment(double amount, String receiptId) async {
    final state = await getHawlState();
    final payments = List<Map<String, dynamic>>.from(state['payments'] ?? []);
    payments.add({
      'amount': amount,
      'receiptId': receiptId,
      'at': DateTime.now().toIso8601String(),
    });
    state['payments'] = payments;
    await saveHawlState(state);
  }
}
