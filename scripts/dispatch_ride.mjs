import crypto from 'node:crypto';

async function dispatchTrip(lat = -31.4201, lng = -64.1888) {
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

  console.log(`2. Requesting quote near Barrio Deán Funes (${lat}, ${lng})...`);
  const quoteRes = await fetch('https://transfer-black-api.onrender.com/api/v1/rides/quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      origin: {
        address_text: 'Barrio Deán Funes, Córdoba',
        place_id: 'place-dean-funes-origin',
        latitude: lat,
        longitude: lng
      },
      destination: {
        address_text: 'Patio Olmos Shopping, Córdoba',
        place_id: 'place-cordoba-dest',
        latitude: -31.4197,
        longitude: -64.1878
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

  console.log('3. Confirming trip with cash payment...');
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
      }
    })
  });
  const confirmData = await confirmRes.json();
  console.log('Confirm status:', confirmRes.status);
  if (confirmRes.status !== 200) {
    console.error('Confirm error:', JSON.stringify(confirmData, null, 2));
    return;
  }
  console.log('Trip confirmed! Status is now searching.');

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
}

// Ejecutar con coordenadas de Barrio Deán Funes, Córdoba
dispatchTrip(-31.44466, -64.1195);
