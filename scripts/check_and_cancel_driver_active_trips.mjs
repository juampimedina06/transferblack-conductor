async function checkAndCancel() {
  console.log('1. Autenticando como admin...');
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
    console.error('Error al loguearse como admin:', loginData);
    return;
  }

  console.log('2. Consultando viajes en el sistema...');
  const ridesRes = await fetch('https://transfer-black-api.onrender.com/api/v1/admin/rides', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const ridesData = await ridesRes.json();
  const rides = ridesData.data || ridesData.rides || [];
  console.log(`Total de viajes en listado: ${rides.length}`);

  const DRIVER_ID = '645b08f9-93b5-48a9-93d8-ec376107c57e';
  const driverActiveTrips = rides.filter(r => 
    (r.driver_id === DRIVER_ID || r.driverId === DRIVER_ID) &&
    ['assigned', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(r.status)
  );

  console.log(`Viajes activos encontrados para el chofer: ${driverActiveTrips.length}`);

  for (const trip of driverActiveTrips) {
    console.log(`Cancelando viaje activo ${trip.id} (estado: ${trip.status})...`);
    const cancelRes = await fetch(`https://transfer-black-api.onrender.com/api/v1/rides/${trip.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reason_code: 'admin_cancelled',
        notes: 'Cancelado por solicitud del chofer en pruebas'
      })
    });
    console.log(`Resultado cancelación ${trip.id}:`, cancelRes.status);
  }

  // También buscar viajes huérfanos en 'searching' para limpiar
  const searchingTrips = rides.filter(r => r.status === 'searching');
  console.log(`Viajes en estado 'searching': ${searchingTrips.length}`);
  for (const st of searchingTrips) {
    console.log(`Cancelando viaje en searching ${st.id}...`);
    await fetch(`https://transfer-black-api.onrender.com/api/v1/rides/${st.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reason_code: 'admin_cancelled',
        notes: 'Limpieza de pruebas'
      })
    });
  }

  console.log('✓ Limpieza completada.');
}

checkAndCancel();
