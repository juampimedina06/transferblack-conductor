async function run() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://transfer-black-api.onrender.com/api/v1';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@transferblack.com';
  const adminPassword = process.env.ADMIN_PASSWORD;
  const driverId = process.env.DRIVER_ID || '645b08f9-93b5-48a9-93d8-ec376107c57e';

  if (!adminPassword) {
    throw new Error('Missing ADMIN_PASSWORD environment variable.');
  }

  const loginRes = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.access_token;

  const res = await fetch(`${apiUrl}/admin/drivers/${driverId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  console.log('Driver status & location:', JSON.stringify(data, null, 2));
}

run().catch(console.error);
