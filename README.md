# DonationChain

End-to-end transparent donation platform (Pakistan-focused demo).

## Packages

| Path | Description |
|------|-------------|
| `donationchain/` | Static web app (PWA, admin, donor, Zakat, ledger, Merkle, i18n EN/UR) |
| `donationchain_mobile/` | Flutter mobile app + Firebase push setup |
| `donationchain_backend/` | Node.js API (FCM, ledger, Merkle) |
| `donationchain_contracts/` | Solidity `DonationRegistry` + Hardhat |

## Quick start — Web

```bash
cd donationchain
python3 -m http.server 3080
# http://localhost:3080
```

Demo OTP: `123456`

## GitHub Pages

Push to `main` → Actions deploys `donationchain/` to GitHub Pages automatically.

## License

Demo / educational use.
