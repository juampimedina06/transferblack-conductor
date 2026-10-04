/**
 * scripts/create_scheduled_trips.mjs
 *
 * Crea viajes reservados/programados con los pasajeros demo de Swagger
 * (Bruno Díaz, Ana Gómez, Carla Ruiz) y los asigna al conductor
 * prueba2@gmail.com (o el conductor que especifiques por CLI).
 *
 * Uso:
 *   node scripts/create_scheduled_trips.mjs
 *   node scripts/create_scheduled_trips.mjs --driver b20d7915-6a70-4690-86e0-375884ae44d4
 *   node scripts/create_scheduled_trips.mjs --driver prueba2@gmail.com
 */

import fs from 'node:fs';
import path from 'node:path';

// Leer URL base de .env si existe, o usar Render por defecto
let API_URL = 'https://transfer-black-api.onrender.com/api/v1';
try {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_API_URL=(.+)/);
    if (match) {
      API_URL = match[1].trim().replace(/\/$/, '');
    }
  }
} catch {
  // fallback
}

const ADMIN_CREDENTIALS = {
  email: 'admin@transferblack.com',
  password: 'Admin123456!',
};

// ID del conductor prueba2@gmail.com
const DEFAULT_DRIVER_ID = 'b20d7915-6a70-4690-86e0-375884ae44d4';

// Pasajeros y viajes programados de prueba
const RESERVATION_TEMPLATES = [
  {
    passenger_email: 'bruno@demo.transferblack.com',
    passenger_name: 'Bruno Diaz',
    hoursFromNow: 4, // En 4 horas
    origin: {
      address: 'Aeropuerto Internacional Ing. Ambrosio Taravella, Córdoba',
      lat: -31.3150,
      lng: -64.2144,
      place_id: 'cordoba-aeropuerto',
    },
    destination: {
      address: 'Hotel Quinto Centenario, Duarte Quirós 1300, Córdoba',
      lat: -31.4115,
      lng: -64.1952,
      place_id: 'hotel-quinto-centenario',
    },
    agreed_fare: '19500.00',
    notes: 'Vuelo AR1540. Pasajero con equipaje de mano. Esperar en arribos.',
  },
  {
    passenger_email: 'ana@demo.transferblack.com',
    passenger_name: 'Ana Gomez',
    hoursFromNow: 24, // Mañana a la misma hora
    origin: {
      address: 'Barrio Jardín / Av. Ricchieri 3200, Córdoba',
      lat: -31.4450,
      lng: -64.1750,
      place_id: 'barrio-jardin',
    },
    destination: {
      address: 'Ciudad Universitaria - Pabellón Argentina, Córdoba',
      lat: -31.4345,
      lng: -64.1885,
      place_id: 'ciudad-universitaria',
    },
    agreed_fare: '8400.00',
    notes: 'Traslado ejecutivo matutino.',
  },
  {
    passenger_email: 'carla@demo.transferblack.com',
    passenger_name: 'Carla Ruiz',
    hoursFromNow: 48, // Pasado mañana
    origin: {
      address: 'Av. Rafael Núñez 4500, Cerro de las Rosas, Córdoba',
      lat: -31.3650,
      lng: -64.2380,
      place_id: 'cerro-de-las-rosas',
    },
    destination: {
      address: 'Aeropuerto Internacional Ing. Ambrosio Taravella, Córdoba',
      lat: -31.3150,
      lng: -64.2144,
      place_id: 'cordoba-aeropuerto',
    },
    agreed_fare: '16800.00',
    notes: 'Reserva corporativa con equipaje de bodega.',
  },
];

async function loginAdmin() {
  console.log(`\n[1/3] Iniciando sesión como administrador (${ADMIN_CREDENTIALS.email})...`);
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDENTIALS),
  });

  const data = await res.json();
  if (res.status !== 200 || !data.data?.tokens?.access_token) {
    console.error('Error al autenticar administrador:', data);
    process.exit(1);
  }

  console.log('✓ Sesión de administrador iniciada correctamente.');
  return data.data.tokens.access_token;
}

async function createReservation(adminToken, template, driverId) {
  const scheduledDate = new Date(Date.now() + template.hoursFromNow * 60 * 60 * 1000);

  const payload = {
    passenger_email: template.passenger_email,
    origin: template.origin,
    destination: template.destination,
    scheduled_at: scheduledDate.toISOString(),
    agreed_fare: template.agreed_fare,
    reserved_driver_id: driverId,
    notes: template.notes,
  };

  const res = await fetch(`${API_URL}/admin/scheduled-trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  return { status: res.status, data: body.data || body };
}

async function main() {
  console.log('====================================================');
  console.log(' GENERADOR DE RESERVAS / VIAJES PROGRAMADOS');
  console.log(` API Target: ${API_URL}`);
  console.log('====================================================');

  const args = process.argv.slice(2);
  let targetDriverId = DEFAULT_DRIVER_ID;

  const driverArgIdx = args.indexOf('--driver');
  if (driverArgIdx !== -1 && args[driverArgIdx + 1]) {
    targetDriverId = args[driverArgIdx + 1];
  }

  console.log(`Conductor asignado objetivo: ${targetDriverId} (prueba2@gmail.com)`);

  const adminToken = await loginAdmin();

  console.log(`\n[2/3] Creando ${RESERVATION_TEMPLATES.length} viajes reservados y asignándolos al conductor...`);
  
  const results = [];
  for (let i = 0; i < RESERVATION_TEMPLATES.length; i++) {
    const t = RESERVATION_TEMPLATES[i];
    console.log(`\n -> [${i + 1}/${RESERVATION_TEMPLATES.length}] Creando reserva para ${t.passenger_name} (${t.passenger_email})...`);
    console.log(`    Origen:  ${t.origin.address}`);
    console.log(`    Destino: ${t.destination.address}`);
    console.log(`    Tarifa:  $${t.agreed_fare} ARS`);

    const result = await createReservation(adminToken, t, targetDriverId);
    if (result.status === 201) {
      console.log(`    ✓ RESERVA CREADA CON ÉXITO:`);
      console.log(`      ID:          ${result.data.id}`);
      console.log(`      Código:      ${result.data.public_code}`);
      console.log(`      Fecha/Hora:  ${result.data.scheduled_at}`);
      console.log(`      Estado:      ${result.data.status}`);
      console.log(`      Chofer:      ${result.data.reserved_driver?.first_name} ${result.data.reserved_driver?.last_name || ''} (${result.data.reserved_driver?.vehicle?.brand || ''} ${result.data.reserved_driver?.vehicle?.model || ''})`);
      results.push(result.data);
    } else {
      console.error(`    ✗ Falló al crear reserva (Status ${result.status}):`, result.data);
    }
  }

  console.log('\n[3/3] Resumen final:');
  console.log(`✓ ${results.length} de ${RESERVATION_TEMPLATES.length} viajes programados creados y asignados a prueba2@gmail.com.`);
  console.log('\nYa podés abrir la app del conductor, entrar a "Mis Reservas" y vas a ver las tarjetas con todos los detalles.');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('[!] Error inesperado:', err);
  process.exit(1);
});
