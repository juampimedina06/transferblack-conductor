async function resolvePayout() {
  const API_URL = 'https://transfer-black-api.onrender.com/api/v1';

  // Login Admin
  const adminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@transferblack.com', password: 'Admin123456!' }),
  });
  const adminData = await adminRes.json();
  const token = adminData.data.tokens.access_token;

  const payoutId = 'f073dbaf-2694-4f42-824f-f5f92fce5492';
  console.log(`Resolviendo retiro ${payoutId} como 'paid'...`);

  const res = await fetch(`${API_URL}/admin/payouts/${payoutId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'paid',
      transfer_reference: 'TRANSF-CBU-987654321',
    }),
  });

  console.log('Resolve status:', res.status, await res.json());
}

resolvePayout().catch(console.error);
