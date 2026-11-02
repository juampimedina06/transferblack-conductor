async function resolvePayout() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://transfer-black-api.onrender.com/api/v1';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@transferblack.com';
  const adminPassword = process.env.ADMIN_PASSWORD;
  const payoutId = process.env.PAYOUT_ID;

  if (!adminPassword || !payoutId) {
    throw new Error('Missing ADMIN_PASSWORD or PAYOUT_ID environment variables.');
  }

  const adminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const adminData = await adminRes.json();
  const token = adminData.data.tokens.access_token;

  console.log(`Resolviendo retiro ${payoutId} como 'paid'...`);

  const res = await fetch(`${API_URL}/admin/payouts/${payoutId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'paid',
      transfer_reference: process.env.TRANSFER_REFERENCE || 'TRANSF-CBU-987654321',
    }),
  });

  console.log('Resolve status:', res.status, await res.json());
}

resolvePayout().catch(console.error);
