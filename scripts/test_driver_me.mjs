async function testMe() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://transfer-black-api.onrender.com/api/v1';
  const token = process.env.DRIVER_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Missing DRIVER_ACCESS_TOKEN environment variable.');
  }

  const res = await fetch(`${apiUrl}/driver/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

testMe().catch(console.error);
