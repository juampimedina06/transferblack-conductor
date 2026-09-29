import fs from 'node:fs';
import path from 'node:path';

// Leer URL del backend desde el .env del frontend
function getApiUrl() {
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/EXPO_PUBLIC_API_URL\s*=\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim().replace(/['"]/g, '');
      }
    }
  } catch {
    // fallback
  }
  return 'https://transfer-black-api.onrender.com/api/v1';
}

const API_URL = getApiUrl();

async function requestTestTrip() {
  console.log('--- Disparando viaje de prueba desde el Frontend ---');
  console.log(`Target API: ${API_URL}`);

  // 1. Iniciar sesión como pasajero demo
  console.log('\n1. Autenticando pasajero...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ana@demo.transferblack.com',
      password: 'Demo1234',
    }),
  });

  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    throw new Error(`Error en login de pasajero (${loginRes.status}): ${errorText}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.access_token || loginData.tokens?.access_token;
  if (!token) {
    throw new Error('No se recibió token de acceso en la respuesta de login');
  }
  console.log('✓ Pasajero autenticado:', loginData.data?.profile?.email || 'ana@demo.transferblack.com');

  // 2. Cotizar viaje (Draft)
  console.log('\n2. Cotizando viaje (Deán Funes Horizonte -> Nuevocentro Shopping)...');
  const quoteBody = {
    origin: {
      address_text: 'Barrio Deán Funes Horizonte, Córdoba',
      place_id: 'Barrio Dean Funes Horizonte',
      latitude: -31.4508,
      longitude: -64.1205,
    },
    destination: {
      address_text: 'Duarte Quirós 1400, Nuevocentro Shopping, Córdoba',
      place_id: 'Nuevocentro Shopping',
      latitude: -31.4116,
      longitude: -64.2023,
    },
  };

  const quoteRes = await fetch(`${API_URL}/rides/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(quoteBody),
  });

  if (!quoteRes.ok) {
    const errorText = await quoteRes.text();
    throw new Error(`Error al cotizar viaje (${quoteRes.status}): ${errorText}`);
  }

  const quoteData = await quoteRes.json();
  const tripId = quoteData.data?.draft?.id;
  const quotes = quoteData.data?.quotes || [];
  if (!tripId || quotes.length === 0) {
    throw new Error('No se recibieron opciones de cotización válidas');
  }

  const selectedQuote = quotes[0];
  console.log(`✓ Borrador creado: ${tripId}`);
  console.log(`✓ Tarifa cotizada: $${selectedQuote.pricing?.total_amount} ARS (${selectedQuote.service_type?.name})`);

  // 3. Confirmar viaje con pago en efectivo y PIN requerido
  console.log('\n3. Confirmando viaje...');
  const confirmBody = {
    fare_quote_id: selectedQuote.id,
    payment: { type: 'cash' },
    require_pin: true,
  };

  const confirmRes = await fetch(`${API_URL}/rides/${tripId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(confirmBody),
  });

  if (!confirmRes.ok) {
    const errorText = await confirmRes.text();
    throw new Error(`Error al confirmar viaje (${confirmRes.status}): ${errorText}`);
  }

  const confirmData = await confirmRes.json();
  const trip = confirmData.data?.trip;
  const boardingPin = trip?.boarding_pin || 'No especificado';

  console.log('\n====================================================');
  console.log('🚀 VIAJE CONFIRMADO Y EN BÚSQUEDA');
  console.log(`Trip ID:      ${tripId}`);
  console.log(`Public Code:  ${trip?.public_code}`);
  console.log(`Status:       ${trip?.status}`);
  console.log(`Boarding PIN: ${boardingPin}`);
  console.log('Origen:       Barrio Deán Funes Horizonte');
  console.log('Destino:      Duarte Quirós 1400, Nuevocentro Shopping');
  console.log('Pago:         Efectivo');
  console.log('====================================================\n');
}

requestTestTrip().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
