import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/login_screen.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  // Firebase init (works with placeholder options; replace with real config)
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    await NotificationService().init();
    debugPrint('Firebase + FCM initialized');
  } catch (e) {
    debugPrint('Firebase init skipped/failed (add real google-services.json): $e');
  }

  runApp(const DonationChainApp());
}

class DonationChainApp extends StatelessWidget {
  const DonationChainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DonationChain',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const LoginScreen(),
    );
  }
}
