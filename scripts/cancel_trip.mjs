async function cancelTrip(tripId) {
  const loginRes = await fetch('https://transfer-black-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bruno@demo.transferblack.com',
      password: 'Demo1234'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.access_token;
  if (!token) {
    console.error('Failed to get token:', loginData);
    return;
  }

  const res = await fetch(`https://transfer-black-api.onrender.com/api/v1/rides/${tripId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      reason_code: 'passenger_cancelled',
      notes: 'Cancelado para prueba'
    })
  });
  console.log('Cancel status:', res.status);
  const data = await res.json();
  console.log('Cancel response:', JSON.stringify(data, null, 2));
}

cancelTrip('eea8da56-8807-481d-bb9e-ec1126090fcb');
