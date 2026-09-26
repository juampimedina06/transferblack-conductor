async function checkTelemetry() {
  const loginRes = await fetch('https://transfer-black-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@transferblack.com',
      password: 'Admin123456!'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.access_token;

  const heatRes = await fetch('https://transfer-black-api.onrender.com/api/v1/admin/telemetry/heatmap', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Heatmap status:', heatRes.status);
  const heatData = await heatRes.json();
  console.log('Heatmap:', JSON.stringify(heatData, null, 2));
}

checkTelemetry();
