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

  static Future<void> setUser(String name, String phone) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dc_user_name', name);
    await prefs.setString('dc_user_phone', phone);
  }

  static Future<Map<String, String?>> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'name': prefs.getString('dc_user_name'),
      'phone': prefs.getString('dc_user_phone'),
    };
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('dc_user_name');
    await prefs.remove('dc_user_phone');
  }
}
