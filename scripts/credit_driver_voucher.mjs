import { io } from 'socket.io-client';

const API_URL = 'https://transfer-black-api.onrender.com';

async function run() {
  console.log('--- 1. Login Conductor y Conexión de Socket Activo ---');
  const dLogin = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'conductor.test@transferblack.com', password: 'Test1234' }),
  });
  const dData = await dLogin.json();
  const dToken = dData.data.tokens.access_token;
  const driverId = dData.data.profile.id;
  console.log('✓ Conductor logueado:', driverId);

  // Conectar socket del conductor y emitir GPS
  const driverSocket = io(API_URL, {
    auth: { token: dToken },
    transports: ['websocket', 'polling'],
  });

  await new Promise((resolve) => {
    driverSocket.on('connect', () => {
      console.log('✓ Socket de conductor ONLINE:', driverSocket.id);
      resolve();
    });
  });

  const lat = -31.4431;
  const lng = -64.1143;
  driverSocket.emit('driver:location_update', { latitude: lat, longitude: lng, heading: 0 });
  console.log('✓ Coordenadas GPS enviadas');
  await new Promise((r) => setTimeout(r, 1000));

  console.log('\n--- 2. Despachar viaje corporativo (Carla) ---');
  const cLogin = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'carla@demo.transferblack.com', password: 'Demo1234' }),
  });
  const cData = await cLogin.json();
  const cToken = cData.data.tokens.access_token;

  // Usamos el viaje de voucher ya confirmado (0c28cf97-d8dd-4dcc-8181-5af1fde95e56)
  const tripId = '0c28cf97-d8dd-4dcc-8181-5af1fde95e56';
  const pin = '5191';

  let offerPromise = new Promise((resolve) => {
    driverSocket.on('trip:offer', (offer) => {
      console.log('✓ ¡Oferta recibida por socket!', offer);
      resolve(offer);
    });
  });

  const dispatchRes = await fetch(`${API_URL}/api/v1/rides/${tripId}/dispatch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cToken}` },
  });
  const dispatchData = await dispatchRes.json();
  console.log('Dispatch status:', dispatchRes.status, dispatchData);

  if (dispatchRes.status !== 200 && dispatchRes.status !== 202) {
    console.error('Error al despachar:', dispatchData);
    driverSocket.disconnect();
    return;
  }

  // Esperar o aceptar directamente
  console.log('\n--- 3. Aceptando viaje desde el chofer ---');
  const vehicleId = 'a8f6d23a-15ce-402f-9959-9a0613a144e5';
  const acceptRes = await fetch(`${API_URL}/api/v1/rides/${tripId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dToken}`,
    },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      latitude: lat,
      longitude: lng,
    }),
  });
  console.log('Accept status:', acceptRes.status, await acceptRes.json());

  console.log('\n--- 4. Completando viaje para asentar ganancia digital ---');
  // driver-arriving
  await fetch(`${API_URL}/api/v1/rides/${tripId}/driver-arriving`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dToken}` },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });

  // driver-arrived
  await fetch(`${API_URL}/api/v1/rides/${tripId}/driver-arrived`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dToken}` },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });

  // start con PIN
  const startRes = await fetch(`${API_URL}/api/v1/rides/${tripId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dToken}` },
    body: JSON.stringify({ latitude: lat, longitude: lng, boarding_pin: pin }),
  });
  console.log('Start status:', startRes.status, await startRes.json());

  // complete
  const completeRes = await fetch(`${API_URL}/api/v1/rides/${tripId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dToken}`,
      'Idempotency-Key': `complete-${Date.now()}`,
    },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
  console.log('Complete status:', completeRes.status, await completeRes.json());

  driverSocket.disconnect();

  console.log('\n--- 5. Verificando Bóveda Financiera ---');
  const walletRes = await fetch(`${API_URL}/api/v1/driver/wallet`, {
    headers: { Authorization: `Bearer ${dToken}` },
  });
  const wallet = await walletRes.json();
  console.log('Bóveda final:', JSON.stringify(wallet.data, null, 2));
}

run().catch(console.error);
