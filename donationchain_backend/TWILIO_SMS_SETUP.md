# Twilio SMS Integration Guide — DonationChain

DonationChain backend sends SMS alerts between **donors** and **zarooratmand** (applicants).  
Default mode is **mock** (logs only). Follow this guide to send **real SMS** via Twilio.

---

## 1. What already exists

| Piece | Path |
|--------|------|
| SMS service | `src/services/sms.js` |
| HTTP routes | `src/routes/sms.js` (+ `server-lite.js`) |
| Frontend client | `donationchain/js/sms.js` |

**Endpoints**

```http
POST /api/sms/notify-application   { "phone", "id", "status": "received|approved|rejected" }
POST /api/sms/notify-donation      { "donorPhone", "beneficiaryPhone", "amount", "receiptId", "caseTitle" }
POST /api/sms/send                 { "to", "template"?, "params"?, "body"? }  (auth recommended)
GET  /api/sms/log                  recent messages
```

---

## 2. Twilio account setup

1. Sign up: [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Open **Console** → note:
   - **Account SID**
   - **Auth Token**
3. **Phone Numbers** → Get a number that can send SMS  
   - Trial accounts can only SMS **verified** destination numbers  
   - Verify test phones: Console → Phone Numbers → Verified Caller IDs
4. Copy the Twilio number as `TWILIO_FROM` (E.164), e.g. `+1234567890`

### Pakistan destinations

- Store numbers as `03XXXXXXXXX`; backend normalizes to `+923XXXXXXXXX`
- Twilio must allow SMS to **PK (+92)** on your account / regulatory bundle
- Trial: add each PK test MSISDN under Verified Caller IDs
- Production: upgrade account + complete any geo permissions for Pakistan

---

## 3. Environment variables

In `donationchain_backend/.env` (never commit real secrets):

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM=+1xxxxxxxxxx
```

Optional (already used elsewhere):

```env
PORT=4000
JWT_SECRET=long-random-string
```

`.env.example` already lists these keys.

---

## 4. Enable & run backend

```bash
cd donationchain_backend
cp .env.example .env
# edit .env — set SMS_PROVIDER=twilio and credentials

# Full Express server
npm install
npm start

# Or zero-dep lite server (also loads sms.js)
node src/server-lite.js
```

Health check:

```bash
curl -s http://localhost:4000/health
```

---

## 5. Test SMS

### A. Application alert (needy)

```bash
curl -s -X POST http://localhost:4000/api/sms/notify-application \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "03001234567",
    "id": "APP-TEST-001",
    "status": "received"
  }'
```

Statuses: `received` | `approved` | `rejected`

### B. Donation alert (donor + needy)

```bash
curl -s -X POST http://localhost:4000/api/sms/notify-donation \
  -H 'Content-Type: application/json' \
  -d '{
    "donorPhone": "03001111111",
    "beneficiaryPhone": "03002222222",
    "amount": 5000,
    "receiptId": "DC-TEST-1",
    "caseTitle": "Medical support"
  }'
```

### C. Custom body (admin)

Login for JWT (Express route uses `requireAuth` on `/api/sms/send`):

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@DC2026"}' | jq -r .token)

curl -s -X POST http://localhost:4000/api/sms/send \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"to":"03001234567","body":"DonationChain test message"}'
```

### D. Message log

```bash
curl -s http://localhost:4000/api/sms/log \
  -H "Authorization: Bearer $TOKEN"
```

File log (server): `data/sms-log.json`  
Browser offline log: Admin → **SMS log** (`localStorage`)

---

## 6. Wire with the web app

1. Start backend on port **4000**
2. Admin → **Security** → API base `http://localhost:4000` (or your HTTPS API)
3. Flows that already call SMS:
   - **Apply form** → applicant SMS (`received`)
   - **Admin Approve/Reject** → applicant SMS
   - **Donate** → donor + beneficiary phones when available

Frontend: `donationchain/js/sms.js` posts to the API; if offline, it stores a **mock local log**.

---

## 7. Templates (code)

Defined in `src/services/sms.js` → `templates()`:

| Key | When |
|-----|------|
| `application_received` | New case application |
| `application_approved` | Admin approved |
| `application_rejected` | Admin rejected |
| `donation_received_donor` | Thank-you to donor |
| `donation_received_case` | Alert to case/needy side |
| `proof_ready` | Proof uploaded / ready |
| `generic` | Custom `body` |

Edit Urdu/English copy in that function as needed.

---

## 8. Production checklist

- [ ] `SMS_PROVIDER=twilio` only on server (not in public frontend)
- [ ] Auth token only in env / secret manager
- [ ] HTTPS API; CORS allowlist your web origin
- [ ] Protect `/api/sms/send` with admin JWT (already on Express)
- [ ] Rate-limit SMS endpoints (avoid cost abuse)
- [ ] Trial → paid Twilio; enable PK SMS if required
- [ ] Log PII carefully (phone numbers are personal data)
- [ ] Opt-out / consent for marketing SMS (donations transactional OK with clear purpose)

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `"Twilio env not configured"` | Set all three `TWILIO_*` vars and restart |
| Twilio 21211 / invalid `To` | Use E.164; ensure normalize → `+92…` |
| Trial “unverified number” | Verify destination in Twilio console |
| No SMS, `mock: true` | `SMS_PROVIDER` still `mock` or empty |
| Frontend silent | API base wrong; CORS; backend down → check Admin SMS log |
| `fetch is not defined` on old Node | Use Node **18+** (built-in fetch) |

---

## 10. Cost note

Twilio charges per SMS segment (160 chars GSM). Long Urdu (Unicode) messages use more segments. Keep templates short.

---

## Quick switch back to mock

```env
SMS_PROVIDER=mock
```

Restart server — no external calls; messages only in console + `data/sms-log.json`.


## Rate limit retries (20429 / HTTP 429)

`src/services/sms.js` automatically retries Twilio sends when:

- HTTP **429**, or
- Twilio error code **20429**

Behaviour:

- Up to `SMS_MAX_RETRIES` (default **4**) retries after the first try
- Uses `Retry-After` header when present
- Otherwise exponential backoff: ~1s → 2s → 4s… (+ small jitter), capped at 30s
- Network failures also retry with the same backoff
- SMS log entries include `attempts` and `code`
