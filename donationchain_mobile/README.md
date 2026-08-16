# DonationChain Mobile App (Flutter)

End-to-end transparent donation platform — Android + iOS + Web.

## Features
- OTP Login (demo OTP: 123456)
- Case Discovery with filters (Medical, Education, Food, Utility)
- Donate flow with JazzCash / EasyPaisa / Raast / Stripe simulation
- Donor Impact Dashboard (local storage)
- Zakat Calculator (2.5%)
- Admin Panel overview (pipeline + fraud alerts)
- Design tokens matching web (primary #1A56DB)

## Run
```bash
cd donationchain_mobile
export PATH="/opt/flutter/bin:$PATH"
flutter pub get
flutter run -d chrome
flutter build apk --release
```

## Structure
lib/main.dart, theme/, models/, services/, screens/ (login, cases, donate, dashboard, zakat, admin)

## Firebase Push Notifications
See **FIREBASE_SETUP.md** for full steps.

Already included:
- `firebase_core`, `firebase_messaging`, `flutter_local_notifications`
- `lib/services/notification_service.dart`
- Placeholder `android/app/google-services.json` + `lib/firebase_options.dart`
- Demo "Test Push Notification" button on Impact tab

Connect real Firebase:
1. Create project at console.firebase.google.com
2. Add Android app (package: `pk.donationchain.donationchain_app`)
3. Replace `google-services.json`
4. Run `flutterfire configure`
5. `flutter pub get && flutter run`
