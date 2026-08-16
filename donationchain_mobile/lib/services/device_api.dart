import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'notification_service.dart';

/// Registers this device's FCM token with DonationChain backend.
class DeviceApi {
  /// Change to your backend URL (emulator: 10.0.2.2:4000, device: your LAN IP)
  static String baseUrl = 'http://10.0.2.2:4000';

  static Future<bool> registerToken(String userId) async {
    final token = NotificationService().fcmToken;
    if (token == null || token.isEmpty) {
      debugPrint('DeviceApi: no FCM token yet');
      return false;
    }
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/devices/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'token': token}),
      );
      debugPrint('DeviceApi register: ${res.statusCode} ${res.body}');
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('DeviceApi error: $e');
      return false;
    }
  }
}
