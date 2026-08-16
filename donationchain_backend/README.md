# DonationChain Backend — Real FCM Sender

Node.js + Express + **Firebase Admin SDK** push notification service.

## Features
- Send to single device token
- Multicast (up to 500 tokens)
- Topic messaging (`all_donors`, emergency campaigns)
- Domain events matching SRS:
  - `payment-success`
  - `case-approved`
  - `donation-matched`
  - `proof-ready`
  - `fraud-alert`
  - `emergency`
- Device token registry (in-memory demo)
- Mock mode when service account is missing (logs only)

## Quick start

```bash
cd donationchain_backend
npm install
cp .env.example .env

# Add Firebase service account:
# Firebase Console → Project Settings → Service accounts → Generate key
# Save as config/serviceAccountKey.json

npm start
# → http://localhost:4000
```

## API

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | — |
| POST | `/api/notifications/send` | `{ token, title, body, data? }` |
| POST | `/api/notifications/multicast` | `{ tokens[], title, body }` |
| POST | `/api/notifications/topic` | `{ topic, title, body }` |
| POST | `/api/notifications/events/payment-success` | `{ token, amount, caseTitle, donationId? }` |
| POST | `/api/notifications/events/case-approved` | `{ token, caseTitle, caseId? }` |
| POST | `/api/notifications/events/donation-matched` | `{ token, caseTitle, amount, donationId? }` |
| POST | `/api/notifications/events/proof-ready` | `{ token, caseTitle, caseId? }` |
| POST | `/api/notifications/events/fraud-alert` | `{ token, caseId, riskScore? }` |
| POST | `/api/notifications/events/emergency` | `{ topic?, title, body, campaignId? }` |
| POST | `/api/devices/register` | `{ userId, token }` |

### Example: payment success
```bash
curl -X POST http://localhost:4000/api/notifications/events/payment-success \
  -H "Content-Type: application/json" \
  -d '{
    "token": "DEVICE_FCM_TOKEN",
    "amount": 5000,
    "caseTitle": "Heart Surgery — Ali, 8 yrs",
    "donationId": "don_123"
  }'
```

### CLI test
```bash
node scripts/test-fcm.js <YOUR_FCM_TOKEN>
```

## Flutter integration
1. App gets token via `NotificationService().fcmToken`
2. Register with backend:
   ```dart
   POST /api/devices/register
   { "userId": "user_123", "token": "<fcm_token>" }
   ```
3. Backend sends on events (payment, proof, etc.)

## Production notes
- Replace in-memory `tokenStore` with PostgreSQL / Redis
- Protect routes with API key or JWT
- Use Firebase service account with minimal IAM
- Never commit `serviceAccountKey.json`
