/**
 * Resolve Firebase service account credentials (no firebase-admin dependency).
 * Priority:
 *   1. FIREBASE_SERVICE_ACCOUNT — raw JSON string (Railway / cloud secrets)
 *   2. GOOGLE_APPLICATION_CREDENTIALS — file path
 *   3. config/serviceAccountKey.json — local default
 */
const path = require('path');
const fs = require('fs');

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && String(raw).trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.client_email || !parsed.private_key) {
        console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT JSON missing client_email/private_key');
        return null;
      }
      // Railway/UI sometimes stores escaped newlines as literal \n
      if (typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return { source: 'env:FIREBASE_SERVICE_ACCOUNT', serviceAccount: parsed };
    } catch (e) {
      console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT is not valid JSON:', e.message);
      return null;
    }
  }

  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../config/serviceAccountKey.json');

  if (!fs.existsSync(credPath)) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.warn('[FCM] Credentials file missing client_email/private_key:', credPath);
      return null;
    }
    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return { source: `file:${credPath}`, serviceAccount };
  } catch (e) {
    console.warn('[FCM] Failed to read credentials file:', credPath, e.message);
    return null;
  }
}

module.exports = { loadServiceAccount };
