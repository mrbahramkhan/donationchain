/**
 * Quick test: node scripts/test-fcm.js <FCM_TOKEN>
 */
require('dotenv').config();
const fcm = require('../src/services/fcm');

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: node scripts/test-fcm.js <FCM_DEVICE_TOKEN>');
    process.exit(1);
  }

  console.log('Sending test payment-success notification...');
  const result = await fcm.notifyPaymentSuccess(token, {
    amount: 5000,
    caseTitle: 'Heart Surgery — Ali, 8 yrs',
    donationId: 'demo-001',
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
