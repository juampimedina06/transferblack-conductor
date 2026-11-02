async function testUserMe() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://transfer-black-api.onrender.com/api/v1';
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD environment variables.');
  }

  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (res.status !== 200) {
    console.error('Login failed:', res.status, data);
    return;
  }

  const token = data.data?.tokens?.access_token;
  const meRes = await fetch(`${apiUrl}/driver/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('GET /driver/me status:', meRes.status);
  const meData = await meRes.json();
  console.log('GET /driver/me data:', JSON.stringify(meData, null, 2));
}

testUserMe().catch(console.error);
