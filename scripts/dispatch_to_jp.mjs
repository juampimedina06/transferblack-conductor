import crypto from 'node:crypto';
import { io } from 'socket.io-client';

const API_URL = 'https://transfer-black-api.onrender.com';

async function setDemoDriversOffline() {
  const DEMO_DRIVERS = [
    'martin@demo.transferblack.com',
    'lucia@demo.transferblack.com',
    'diego@demo.transferblack.com',
    'sofia@demo.transferblack.com',
    'prueba1@gmail.com',
  ];

  console.log('1. Poniendo choferes demo en offline para que no te roben el viaje...');
  for (const email of DEMO_DRIVERS) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: email.startsWith('conductor') ? 'Test1234' : 'Demo1234' }),
      });
      const data = await res.json();
      const token = data.data?.tokens?.access_token;
      if (!token) continue;

      const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
      await new Promise(resolve => {
        socket.on('connect', resolve);
        setTimeout(resolve, 1500);
      });
      socket.disconnect();
    } catch {
      // ignore
    }
  }
}

async function dispatchTripToDriver(lat = -31.4431, lng = -64.1143) {
  await setDemoDriversOffline();

  console.log('2. Iniciando sesión como pasajero (Bruno Diaz)...');
  const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bruno@demo.transferblack.com',
      password: 'Demo1234',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.access_token;
  if (!token) {
    console.error('Error al iniciar sesión de pasajero:', loginData);
    return;
  }

  console.log(`3. Cotizando viaje al lado tuyo (${lat}, ${lng})...`);
  const quoteRes = await fetch(`${API_URL}/api/v1/rides/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      origin: {
        address_text: 'Punto de Inicio Conductor',
        place_id: 'conductor-near-origin',
        latitude: lat,
        longitude: lng,
      },
      destination: {
        address_text: 'Aeropuerto Internacional Ing. Ambrosio Taravella, Córdoba',
        place_id: 'place-aeropuerto-taravella',
        latitude: -31.3150,
        longitude: -64.2144,
      },
    }),
  });

  const quoteData = await quoteRes.json();
  if (quoteRes.status !== 201) {
    console.error('Error al cotizar viaje:', quoteData);
    return;
  }

  const tripId = quoteData.data.draft.id;
  const quoteId = quoteData.data.quotes[0]?.id;
  console.log(`✓ Cotización lista. Trip ID: ${tripId}`);

  console.log('4. Confirmando viaje (efectivo con PIN)...');
  const idempotencyKey = crypto.randomUUID();
  const confirmRes = await fetch(`${API_URL}/api/v1/rides/${tripId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      fare_quote_id: quoteId,
      payment: {
        type: 'cash',
      },
      require_pin: true,
    }),
  });

  const confirmData = await confirmRes.json();
  if (confirmRes.status !== 200) {
    console.error('Error al confirmar viaje:', confirmData);
    return;
  }

  const boardingPin = confirmData.data?.trip?.boarding_pin || confirmData.data?.boarding_pin;
  console.log('✓ Viaje confirmado!');
  console.log('🔑 PIN DE ABORDAJE (para ingresar en la app):', boardingPin);

  console.log('5. Disparando despacho al radar...');
  const dispatchRes = await fetch(`${API_URL}/api/v1/rides/${tripId}/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const dispatchData = await dispatchRes.json();
  if (dispatchRes.status !== 200) {
    console.log('Resultado del despacho:', dispatchData);
    if (dispatchData.error?.code === 'NO_DRIVERS_AVAILABLE') {
      console.log('\n⚠️ AVISO: Asegurate de estar CONECTADO (Switch "Disponible" en verde) en la app.');
    }
  } else {
    console.log('🚀 VIAJE DESPACHADO CON ÉXITO! Revisá la pantalla de la app.');
  }
}

dispatchTripToDriver();
