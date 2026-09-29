async function checkRides() {
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
  if (!token) {
    console.error('Failed to login as admin:', loginData);
    return;
  }

  const ridesRes = await fetch('https://transfer-black-api.onrender.com/api/v1/admin/rides', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const ridesData = await ridesRes.json();
  console.log('Rides status:', ridesRes.status);
  const rides = ridesData.data || ridesData.rides || [];
  console.log(`Total rides returned: ${rides.length}`);
  
  const DRIVER_ID = '645b08f9-93b5-48a9-93d8-ec376107c57e';
  const driverRides = rides.filter(r => r.driver_id === DRIVER_ID || r.driverId === DRIVER_ID);
  console.log('Rides for driver:', JSON.stringify(driverRides, null, 2));

  // Check all active rides
  const activeRides = rides.filter(r => !['completed', 'cancelled'].includes(r.status));
  console.log('All active rides in system:', JSON.stringify(activeRides.map(r => ({ id: r.id, status: r.status, driver_id: r.driver_id || r.driverId, passenger: r.passenger_name || r.passengerUserId })), null, 2));
}

checkRides();
