import crypto from 'node:crypto';
import { io } from 'socket.io-client';

const API_URL = 'https://transfer-black-api.onrender.com';

/**
 * Los conductores demo quedan marcados como 'online' en la DB aunque no haya
 * ningún socket conectado. Ocupan los 5 slots del dispatch y bloquean a otros
 * conductores. Este paso los fuerza a 'offline' antes de despachar.
 */
async function setDemoDriversOffline() {
  const DEMO_DRIVERS = [
    'martin@demo.transferblack.com',
    'lucia@demo.transferblack.com',
    'diego@demo.transferblack.com',
    'sofia@demo.transferblack.com',
  ];

  console.log('0. Setting demo drivers offline...');
  for (const email of DEMO_DRIVERS) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Demo1234' }),
      });
      const token = (await res.json()).data?.tokens?.access_token;
      if (!token) continue;

      // connect -> server sets ONLINE, disconnect -> server sets OFFLINE
      const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
      await new Promise(resolve => socket.on('connect', resolve));
      socket.disconnect();
      console.log(`   OFFLINE: ${email}`);
    } catch {
      // non-critical, continue
    }
  }
}

async function dispatchTrip(lat = -31.4201, lng = -64.1888) {
  await setDemoDriversOffline();
  console.log(`1. Logging in as passenger Bruno Diaz...`);
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
  console.log('Logged in successfully!');

  console.log('Updating Bruno profile with missing fields (gender)...');
  await fetch('https://transfer-black-api.onrender.com/api/v1/users/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      gender: 'MASCULINO'
    })
  });

  console.log(`2. Requesting quote near Barrio Deán Funes Horizonte (${lat}, ${lng})...`);
  const quoteRes = await fetch('https://transfer-black-api.onrender.com/api/v1/rides/quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      origin: {
        address_text: 'Barrio Deán Funes Horizonte, Córdoba',
        place_id: 'place-dean-funes-horizonte',
        latitude: lat,
        longitude: lng
      },
      destination: {
        address_text: 'Duarte Quirós 1400, Nuevocentro Shopping, Córdoba',
        place_id: 'place-nuevocentro-shopping',
        latitude: -31.4116,
        longitude: -64.2023
      }
    })
  });
  const quoteData = await quoteRes.json();
  console.log('Quote status:', quoteRes.status);
  if (quoteRes.status !== 201) {
    console.error('Quote error:', JSON.stringify(quoteData, null, 2));
    return;
  }

  const tripId = quoteData.data.draft.id;
  const quoteId = quoteData.data.quotes[0]?.id;
  console.log(`Quote received! Trip ID: ${tripId}, Quote ID: ${quoteId}`);

  console.log('3. Confirming trip with cash payment and require_pin...');
  const idempotencyKey = crypto.randomUUID();
  const confirmRes = await fetch(`https://transfer-black-api.onrender.com/api/v1/rides/${tripId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({
      fare_quote_id: quoteId,
      payment: {
        type: 'cash'
      },
      require_pin: true
    })
  });
  const confirmData = await confirmRes.json();
  console.log('Confirm status:', confirmRes.status);
  if (confirmRes.status !== 200) {
    console.error('Confirm error:', JSON.stringify(confirmData, null, 2));
    return;
  }
  const boardingPin = confirmData.data?.trip?.boarding_pin || confirmData.data?.boarding_pin;
  console.log('Trip confirmed! Status is now searching.');
  console.log('>>> BOARDING PIN (PIN de abordaje):', boardingPin);

  console.log('4. Triggering dispatch...');
  const dispatchRes = await fetch(`https://transfer-black-api.onrender.com/api/v1/rides/${tripId}/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const dispatchData = await dispatchRes.json();
  console.log('Dispatch status:', dispatchRes.status);
  console.log('Dispatch result:', JSON.stringify(dispatchData, null, 2));

  // Obtener detalle del viaje para asegurar el boarding_pin
  const tripRes = await fetch(`https://transfer-black-api.onrender.com/api/v1/rides/${tripId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const tripData = await tripRes.json();
  const finalPin = tripData.data?.trip?.boarding_pin || tripData.data?.boarding_pin || boardingPin;
  console.log('>>> FINAL PIN PARA INGRESAR EN LA APP:', finalPin);
}

// Ejecutar con coordenadas de Barrio Deán Funes Horizonte, Córdoba
dispatchTrip(-31.4508, -64.1205);
