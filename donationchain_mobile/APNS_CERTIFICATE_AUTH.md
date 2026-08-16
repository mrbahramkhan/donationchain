# APNs Certificate Authentication (.p12)

Certificate-based APNs setup for DonationChain iOS (alternative to Auth Key `.p8`).

Bundle ID: `pk.donationchain.donationchainApp`

## Overview

```
Keychain CSR → Apple Developer APNs SSL cert (.cer)
    → Export .p12 with private key
    → Upload to Firebase (Development + Production)
    → FCM delivers via APNs to device
```

Flutter app code does **not** change. Certificates are configured in Apple + Firebase only.

## Steps

### 1. CSR (Mac Keychain Access)

- Certificate Assistant → Request from Certificate Authority  
- Saved to disk → `CertificateSigningRequest.certSigningRequest`

### 2. Apple Developer → Certificates

- Enable Push on App ID `pk.donationchain.donationchainApp`  
- Create **Apple Push Notification service SSL** (Sandbox and/or Production)  
- Upload CSR → Download `.cer`

### 3. Export .p12

- Install `.cer` in Keychain  
- Must show **private key** under certificate  
- Export as **.p12** with password  

### 4. Firebase

- Project Settings → Cloud Messaging → iOS app  
- **APNs Certificates** → upload Development + Production `.p12`

### 5. Xcode

- Push Notifications capability  
- Background Modes → Remote notifications  
- Real device only for remote push  

## Auth Key (.p8) vs Certificate (.p12)

| Prefer .p8 when | Prefer .p12 when |
|-----------------|------------------|
| You want one key for the whole team | Org policy requires SSL certificates |
| Less renewal overhead | Existing cert-based infra |

Full guide: see **FIREBASE_SETUP.md** section **3.3b**.

## Security

- Do not commit `.p12` or export passwords  
- Store in password manager / secrets vault  
- Renew before certificate expiry (~1 year)
