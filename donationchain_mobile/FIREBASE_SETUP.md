# DonationChain — Firebase Push Notifications (End-to-End)

Mobile (Flutter) + Backend (Node FCM sender) complete setup.

---

## Already in the project

| Piece | Location |
|-------|----------|
| Dependencies | `pubspec.yaml` → firebase_core, firebase_messaging, flutter_local_notifications |
| Init | `lib/main.dart` |
| FCM service | `lib/services/notification_service.dart` |
| Options (placeholder) | `lib/firebase_options.dart` |
| Android config | `android/app/google-services.json` + Google Services plugin |
| Backend sender | `donationchain_backend/src/services/fcm.js` |
| Demo button | Impact tab → **Test Push Notification** |

---

## Step 1 — Create Firebase project

1. Open https://console.firebase.google.com  
2. **Add project** → name e.g. `donationchain-prod`  
3. Google Analytics optional → Create  

---

## Step 2 — Add Android app

1. Project Overview → **Add app** → Android  
2. **Android package name:**  
   `pk.donationchain.donationchain_app`  
3. Download **google-services.json**  
4. Replace file:  
   `donationchain_mobile/android/app/google-services.json`  

---

## Step 3 — iOS APNs Setup (detailed)

Push on iOS requires **Apple Push Notification service (APNs)** + Firebase.  
You need an **Apple Developer account** (paid).

### 3.1 Create iOS app in Firebase

1. Firebase Console → Project Overview → **Add app** → **iOS**  
2. **iOS bundle ID** (must match Xcode):  
   `pk.donationchain.donationchainApp`  
3. App nickname: `DonationChain iOS`  
4. Register → Download **GoogleService-Info.plist**  
5. Place file here (do not rename):  
   ```
   donationchain_mobile/ios/Runner/GoogleService-Info.plist
   ```  
6. In Xcode, confirm the file is in the **Runner** target (Copy Bundle Resources).

### 3.2 Create APNs Auth Key (Apple Developer Portal)

Prefer **APNs Auth Key (.p8)** over certificates (simpler, no yearly renew per app).

1. Open https://developer.apple.com/account  
2. **Certificates, Identifiers & Profiles**  
3. Sidebar → **Keys** → **+** (Create a key)  
4. Key Name: `DonationChain APNs Key`  
5. Enable **Apple Push Notifications service (APNs)**  
6. Continue → Register → **Download** the `.p8` file  
   - You can download it **only once** — store it securely  
7. Note on the page:  
   - **Key ID** (e.g. `AB12CD34EF`)  
   - **Team ID** (top-right of developer account, e.g. `A1B2C3D4E5`)

### 3.3 Upload APNs key to Firebase

1. Firebase Console → **Project Settings** (gear) → **Cloud Messaging** tab  
2. Scroll to **Apple app configuration**  
3. Under **APNs Authentication Key** → **Upload**  
4. Select your `.p8` file  
5. Enter:  
   - **Key ID**  
   - **Team ID**  
6. Save  

Firebase will now route FCM → APNs → iPhone.

### 3.3b APNs Certificate Authentication (alternative to .p8)

Use this if your org requires **certificate-based** APNs instead of an Auth Key.

Apple issues **two** SSL certificates:

| Certificate | Environment | When used |
|-------------|-------------|-----------|
| **Apple Push Services (Sandbox)** | Development | Xcode debug builds on device |
| **Apple Push Services (Production)** | Production | TestFlight + App Store |

Firebase accepts **one or both** as `.p12` / `.p8` under Cloud Messaging → Apple app configuration.

#### A. Create a Certificate Signing Request (CSR) on Mac

1. Open **Keychain Access** → menu **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority**  
2. User Email: your Apple ID email  
3. Common Name: `DonationChain APNs`  
4. Select **Saved to disk** → Continue  
5. Save `CertificateSigningRequest.certSigningRequest`

#### B. Create APNs SSL certificate (Apple Developer Portal)

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles**  
2. **Identifiers** → select App ID `pk.donationchain.donationchainApp`  
   - Ensure **Push Notifications** is enabled → Save  
3. **Certificates** → **+**  
4. Under **Services**, choose:
   - **Apple Push Notification service SSL (Sandbox)** for development, **or**
   - **Apple Push Notification service SSL (Sandbox & Production)** if shown (newer combined type), **or**
   - **Apple Push Notification service SSL (Production)** for distribution  
5. Select App ID: `pk.donationchain.donationchainApp` → Continue  
6. Upload the CSR from step A → Continue  
7. **Download** the `.cer` file (e.g. `aps_development.cer` or `aps.cer`)

Repeat for Production if you created Sandbox and Production separately.

#### C. Install .cer and export .p12

1. Double-click the `.cer` file → it installs into **Keychain Access → login → My Certificates**  
2. In Keychain Access, find:
   - `Apple Development IOS Push Services: pk.donationchain.donationchainApp`  
   - or `Apple Push Services: pk.donationchain.donationchainApp`  
3. Expand the certificate — a **private key** must be nested under it  
   - If no private key: CSR was created on a different Mac; recreate CSR + certificate on this machine  
4. Right-click certificate → **Export…**  
5. File Format: **Personal Information Exchange (.p12)**  
6. Set an export password (remember it) → save e.g. `DonationChain_APNs_Dev.p12`

#### D. Upload .p12 to Firebase

1. Firebase Console → **Project Settings** → **Cloud Messaging**  
2. Select your **iOS app** (`pk.donationchain.donationchainApp`)  
3. Under **APNs Certificates** (not Auth Key):  
   - **Development** → Upload `DonationChain_APNs_Dev.p12` → enter export password  
   - **Production** → Upload production `.p12` → enter export password  
4. Status should show the certificate and expiry date  

FCM will use:

- Development certificate for debug / sandbox device tokens  
- Production certificate for release / TestFlight / App Store tokens  

#### E. Certificate vs Auth Key (.p8)

| | APNs Auth Key (.p8) | APNs Certificate (.p12) |
|--|---------------------|-------------------------|
| Setup | One key for all apps in team | One cert per App ID (+ sandbox/prod) |
| Expiry | Key does not expire yearly the same way | Certificates expire (~1 year) — must renew |
| Firebase UI | “APNs Authentication Key” | “APNs Certificates” |
| Recommended | Yes (simpler) | When policy requires certificates |

You only need **one** method: either `.p8` **or** `.p12` (or both). Do not mix conflicting configs without knowing which Firebase will prefer.

#### F. Renewing an expired certificate

1. Create new CSR → new APNs SSL cert in Developer Portal  
2. Export new `.p12`  
3. Upload to Firebase (replaces old development/production cert)  
4. No app store resubmit required only for cert swap on Firebase; keep Xcode capabilities unchanged  

### 3.4 App ID + Push capability (Apple Developer)

1. Developer Portal → **Identifiers** → your App ID  
   (`pk.donationchain.donationchainApp`)  
2. If creating new:  
   - App IDs → App → Bundle ID = `pk.donationchain.donationchainApp`  
3. Enable capability: **Push Notifications**  
4. Save  

### 3.5 Xcode project setup

```bash
cd donationchain_mobile
open ios/Runner.xcworkspace
```

Use **`.xcworkspace`**, not `.xcodeproj`.

1. Select **Runner** target → **Signing & Capabilities**  
2. Team: your Apple Developer team  
3. Bundle Identifier: `pk.donationchain.donationchainApp`  
4. Click **+ Capability** → add:  
   - **Push Notifications**  
   - **Background Modes** → enable **Remote notifications**  

### 3.6 Info.plist (optional UI text)

File: `ios/Runner/Info.plist`  
Permission dialog text (recommended):

```xml
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

Notification permission is requested in Dart via `firebase_messaging` / `NotificationService.init()` — no extra plist key required for the system dialog on modern iOS, but background modes must be set.

### 3.7 Flutter / Dart (already done)

- `Firebase.initializeApp()` in `main.dart`  
- `FirebaseMessaging.instance.requestPermission()` in `NotificationService`  
- Foreground: local notifications plugin  
- Background: `firebaseMessagingBackgroundHandler`  

No extra iOS-specific Dart code required for basic push.

### 3.8 Run on a real iPhone

APNs **does not work on Simulator** for remote pushes (local notifications only).

```bash
cd donationchain_mobile
flutter pub get
flutter run -d <your_iphone_device_id>
```

- Accept the notification permission dialog  
- Copy **FCM token** from Xcode / `flutter` debug console  
- Send test from Firebase Console → Messaging → “Send test message”  
  or from backend (`/api/notifications/send`)

### 3.9 iOS troubleshooting

| Problem | Fix |
|---------|-----|
| No permission dialog | Call `requestPermission` before getting token (already in `NotificationService`) |
| Token null on iOS | Check Bundle ID matches Firebase + GoogleService-Info.plist |
| Push not received | Confirm APNs key uploaded; test on **physical device** |
| “Missing Push Notification Entitlement” | Add Push Notifications capability in Xcode |
| Background delivery fails | Enable **Remote notifications** under Background Modes |
| Wrong environment | Development builds use sandbox APNs; TestFlight/App Store use production (Firebase handles both with .p8 key) |
| Provisional / quiet notifications | User may have muted alerts — check iOS Settings → DonationChain → Notifications |

---

## Step 4 — Generate real `firebase_options.dart`

```bash
dart pub global activate flutterfire_cli
cd donationchain_mobile
flutterfire configure
```

Select Android + iOS apps. This overwrites `lib/firebase_options.dart` with real keys.

---

## Step 5 — Run mobile app

```bash
cd donationchain_mobile
flutter pub get
flutter run          # Android or iOS device
```

- Allow notification permission when prompted  
- Debug console prints **FCM Token**  
- Impact tab → **Test Push Notification** (local; works without Firebase)  

---

## Step 6 — Backend (real FCM send)

1. Firebase Console → Project Settings → **Service accounts**  
2. **Generate new private key** → JSON download  
3. Save as:  
   `donationchain_backend/config/serviceAccountKey.json`  

```bash
cd donationchain_backend
npm install
npm start
# http://localhost:4000
```

### Send test from backend

```bash
curl -X POST http://localhost:4000/api/notifications/events/payment-success \
  -H "Content-Type: application/json" \
  -d '{
    "token": "PASTE_DEVICE_FCM_TOKEN",
    "amount": 5000,
    "caseTitle": "Heart Surgery — Ali",
    "donationId": "don_1"
  }'
```

Or CLI:

```bash
node scripts/test-fcm.js PASTE_DEVICE_FCM_TOKEN
```

Same API works for **Android and iOS** tokens (FCM abstracts APNs).

---

## Step 7 — Register device token from app

After login, app registers via `DeviceApi.registerToken`:

```http
POST http://YOUR_BACKEND/api/devices/register
Content-Type: application/json

{
  "userId": "user_123",
  "token": "<fcm_token from NotificationService>"
}
```

Backend then sends on payment / proof / case events.

---

## Notification types (SRS)

| Event | API path | When |
|-------|----------|------|
| Payment success | `/api/notifications/events/payment-success` | Donor paid |
| Case approved | `/api/notifications/events/case-approved` | Admin approved |
| Donation matched | `/api/notifications/events/donation-matched` | Matched to case |
| Proof ready | `/api/notifications/events/proof-ready` | Vendor uploaded proof |
| Fraud alert | `/api/notifications/events/fraud-alert` | High risk score |
| Emergency | `/api/notifications/events/emergency` | Topic broadcast |

---

## Troubleshooting (all platforms)

| Problem | Fix |
|---------|-----|
| Token is null | Package/Bundle ID must match Firebase config files |
| No notification Android 13+ | Runtime permission required (app requests it) |
| Background not received | Keep `@pragma('vm:entry-point')` on background handler |
| Backend mock only | Add `config/serviceAccountKey.json` |
| iOS no push | APNs .p8 **or** .p12 cert in Firebase + Push capability + **real device** |
| iOS cert export has no private key | Create CSR on the **same Mac** that exports .p12 |
| iOS works in debug only | Upload **Production** .p12 for TestFlight/App Store |

---

## Security notes

- Never commit `serviceAccountKey.json`, `.p8` APNs key, `.p12` push certificates, or production `GoogleService-Info.plist` to public repos  
- Protect backend routes with API key / JWT in production  
- Store device tokens in DB (Postgres/Redis), not only in-memory  
