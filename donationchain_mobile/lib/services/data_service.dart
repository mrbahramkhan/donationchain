import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/donation_case.dart';

class DataService {
  static final List<DonationCase> cases = [
    DonationCase(
      id: 1,
      title: 'Heart Surgery — Ali, 8 yrs',
      category: 'medical',
      city: 'Lahore',
      amount: 85000,
      raised: 62000,
      urgency: 'critical',
      verified: true,
      vendor: 'Mayo Hospital',
    ),
    DonationCase(
      id: 2,
      title: 'School Fees — Fatima Class 8',
      category: 'education',
      city: 'Karachi',
      amount: 42000,
      raised: 28000,
      urgency: 'high',
      verified: true,
      vendor: 'Beaconhouse',
    ),
    DonationCase(
      id: 3,
      title: 'Monthly Food Package — Family of 6',
      category: 'food',
      city: 'Rawalpindi',
      amount: 15000,
      raised: 9000,
      urgency: 'medium',
      verified: true,
      vendor: 'Verified Grocery Vendor',
    ),
    DonationCase(
      id: 4,
      title: 'Utility Bill (WAPDA) — Widow',
      category: 'utility',
      city: 'Faisalabad',
      amount: 18500,
      raised: 12000,
      urgency: 'high',
      verified: true,
      vendor: 'WAPDA',
    ),
    DonationCase(
      id: 9,
      title: 'SNGPL Gas Bill — Family',
      category: 'utility',
      city: 'Lahore',
      amount: 9200,
      raised: 2100,
      urgency: 'high',
      verified: true,
      vendor: 'SNGPL',
    ),
    DonationCase(
      id: 10,
      title: 'Water Bill (WASA) — Orphan home',
      category: 'utility',
      city: 'Multan',
      amount: 4500,
      raised: 0,
      urgency: 'medium',
      verified: true,
      vendor: 'WASA Multan',
    ),
    DonationCase(
      id: 5,
      title: 'Cancer Treatment — Ayesha',
      category: 'medical',
      city: 'Islamabad',
      amount: 220000,
      raised: 145000,
      urgency: 'critical',
      verified: true,
      vendor: 'Shifa International',
    ),
    DonationCase(
      id: 6,
      title: 'University Semester Fee',
      category: 'education',
      city: 'Lahore',
      amount: 65000,
      raised: 40000,
      urgency: 'medium',
      verified: true,
      vendor: 'UET Lahore',
    ),
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
