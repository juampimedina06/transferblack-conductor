async function main() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://transfer-black-api.onrender.com/api/v1';
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD environment variables.');
  }

  const loginRes = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.access_token;

  const meRes = await fetch(`${apiUrl}/driver/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log('Driver profile & vehicle:', JSON.stringify(meData, null, 2));
}

main().catch(console.error);
