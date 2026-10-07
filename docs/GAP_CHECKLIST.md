# DonationChain — Requirements Gap Checklist

**Date:** 2026-10-07  
**Against:** SRS v2.0 International + Multi-tenant / FX / Marketplace designs  
**Stack:** Web (`donationchain/`) + Flutter (`donationchain_mobile/`) + Backend (`donationchain_backend/`)

**Legend**
- `[x]` Done / aligned
- `[~]` Partial
- `[ ]` Missing / needs work
- **P0** = must for international MVP · **P1** = should · **P2** = nice / later

---

## 1. Product positioning & content

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| C1 | SRS is international (multi-country, multi-currency) | [x] | — | `DonationChain_SRS_v2.0_International.docx` |
| C2 | Web meta / tagline not Pakistan-only | [x] | — | Updated global meta in v2.2.0-global |
| C3 | Sample impact amounts not hard-coded PKR only | [x] | — | Feed uses USD; formatMoney locale-aware |
| C4 | Apply form ID field is country-agnostic | [~] | P0 | Placeholder improved; labels still mention CNIC in places |
| C5 | Sample cases use multi-country cities / vendors | [x] | — | EG/ID/KE/PK/TR/BD/MY/JO/MA/NG + country/currency |
| C6 | Zakat UI not PKR-only | [ ] | P1 | Nisab / amounts assume PKR |
| C7 | Privacy / terms / about copy global | [~] | P2 | Review when launching new countries |

---

## 2. Multi-tenant & country scope

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| T1 | `countries` / tenant config model | [ ] | P0 | Need country registry + feature flags |
| T2 | `country_code` on cases, users, donations | [ ] | P0 | Not enforced in cases routes |
| T3 | JWT / middleware injects tenant context | [ ] | P0 | Role exists; country scope weak |
| T4 | Country Admin scoped to one country | [~] | P0 | `regional_admin` exists; hard filter missing |
| T5 | Super Admin can switch / see all countries | [ ] | P1 | |
| T6 | Row-level filters on list APIs | [ ] | P0 | Cases, donations, vendors |
| T7 | Per-country payment + KYC provider config | [ ] | P1 | |

---

## 3. Multi-currency & FX

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| F1 | FX service (rates, quotes, spread) | [x] | — | `services/fx.js` + `routes/fx.js` |
| F2 | Quote lock TTL for donations | [~] | P0 | Service supports; donation flow not fully wired |
| F3 | Dual amounts on donations/ledger (`original` + `settled`) | [ ] | P0 | |
| F4 | Multi-currency wallet balances | [ ] | P1 | Hybrid design agreed; not implemented |
| F5 | Web donate UI shows FX breakdown | [ ] | P0 | |
| F6 | Mobile donate UI shows FX breakdown | [ ] | P1 | |
| F7 | Admin FX override / rate dashboard | [ ] | P2 | |

---

## 4. Needy ↔ Donor reachability (marketplace)

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| M1 | Only verified/live cases on marketplace | [~] | P0 | Concept yes; filter/API incomplete |
| M2 | `GET /cases/marketplace` | [ ] | P0 | OpenAPI defined; route missing |
| M3 | `POST /cases/:id/interest` (Support this case) | [ ] | P0 | OpenAPI defined; not implemented |
| M4 | Withdraw interest | [ ] | P1 | |
| M5 | Needy sees interest list on dashboard | [ ] | P1 | |
| M6 | Platform-mediated messaging (matched only) | [ ] | P1 | No direct contact — by design |
| M7 | Anonymous donor option | [ ] | P2 | |
| M8 | Web UI: Support button on case cards | [ ] | P0 | |
| M9 | Mobile UI: Support / interest flow | [ ] | P1 | |

---

## 5. Case verification workflow

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| V1 | Status state machine documented | [x] | — | 9 stages in design |
| V2 | Submit case (`POST /cases`) | [~] | P0 | Exists; schema not full international |
| V3 | AI pre-screen endpoint + result | [ ] | P0 | |
| V4 | Officer review (`approve` / `reject` / `needs_info`) | [ ] | P0 | |
| V5 | Request / submit additional info | [ ] | P1 | |
| V6 | Field / NGO verify | [ ] | P1 | |
| V7 | Admin final approve → live | [ ] | P0 | |
| V8 | Verification queue + stats API | [ ] | P0 | |
| V9 | Timeline / audit log per case | [~] | P1 | |
| V10 | SLA / overdue flags in admin | [ ] | P2 | |

---

## 6. OpenAPI & API contract

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| O1 | Case verification OpenAPI exists | [x] | — | `docs/openapi-case-verification.yaml` |
| O2 | OpenAPI version 3.1 | [ ] | P1 | Currently `3.0.3`; still uses `nullable: true` |
| O3 | Replace `nullable` with `type: [..., "null"]` | [ ] | P1 | |
| O4 | `if`/`then`/`else` for ReviewRequest etc. | [ ] | P2 | Optional hardening |
| O5 | Full platform OpenAPI (auth, payments, FX, wallet) | [ ] | P2 | |
| O6 | Backend routes match OpenAPI paths | [ ] | P0 | Large gap on verification + marketplace |

---

## 7. Payments & zero-middleman

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| P1 | No cash to beneficiary personal account | [x] | — | Core rule documented + messaging |
| P2 | Direct pay to vendor/hospital/school | [~] | P0 | Flows designed; multi-country rails partial |
| P3 | Local wallets + cards + bank rails pluggable | [~] | P1 | PKR rails stronger than others |
| P4 | Proof upload after delivery | [~] | P1 | |
| P5 | Donor receipt with proof link | [~] | P1 | |

---

## 8. Web app

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| W1 | Separate apply vs donor register | [x] | — | |
| W2 | i18n / language switch | [~] | P1 | Partial Urdu/Arabic hooks |
| W3 | Country selector on register / apply | [ ] | P0 | |
| W4 | Currency preference | [ ] | P0 | |
| W5 | Case marketplace browse + filters | [~] | P0 | Browse exists; country/currency weak |
| W6 | Admin verification Kanban / queue UI | [~] | P1 | Admin exists; full workflow UI incomplete |
| W7 | PWA / a11y baseline | [x] | — | Prior work done |

---

## 9. Mobile (Flutter)

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| App1 | Role select donor / seeker | [x] | — | |
| App2 | Apply + cases + donate screens | [x] | — | |
| App3 | Country / currency on first launch | [ ] | P0 | |
| App4 | Interest / support case | [ ] | P1 | |
| App5 | FX quote on donate | [ ] | P1 | |
| App6 | Push notifications | [~] | P1 | FCM setup present |

---

## 10. Security & compliance (international)

| ID | Item | Status | Priority | Notes |
|----|------|--------|----------|-------|
| S1 | RBAC permissions matrix | [x] | — | `rbac.js` |
| S2 | Tenant isolation on data access | [ ] | P0 | |
| S3 | Sanctions / PEP screening hook | [ ] | P1 | |
| S4 | GDPR + local PDPA style controls | [~] | P1 | Documented; implementation partial |
| S5 | Immutable audit log | [~] | P1 | Ledger / merkle pieces exist |

---

## Suggested implementation order

### Sprint 1 — P0 alignment (international visible)
1. Web copy + sample data (C2, C3, C5)
2. `country_code` on cases + list filters (T2, T6)
3. Marketplace list + interest API + Web Support button (M2, M3, M8)
4. Wire FX quote into donate path (F2, F5)

### Sprint 2 — Verification truth
5. Officer review + admin approve + queue (V3–V8)
6. OpenAPI 3.1 upgrade + route parity (O2, O3, O6)

### Sprint 3 — Wallet & mobile
7. Dual-currency ledger + wallet balances (F3, F4)
8. Mobile country/currency + interest (App3–App5)
9. Tenant middleware hardening (T3, T4)

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Product | | | |
| Backend | | | |
| Web | | | |
| Mobile | | | |

---

*Generated from gap review against SRS v2.0 International, multi-tenant design, FX/wallet design, and marketplace reachability requirements.*
