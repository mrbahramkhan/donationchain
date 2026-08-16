# Firebase Service Account

1. Firebase Console → Project Settings → Service accounts
2. Generate new private key → download JSON
3. Save as `serviceAccountKey.json` in this folder
4. Never commit this file to git

Without this file the server runs in **MOCK mode** (logs only, no real push).
