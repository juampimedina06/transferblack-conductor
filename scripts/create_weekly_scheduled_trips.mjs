/**
 * scripts/create_weekly_scheduled_trips.mjs
 *
 * Genera un cronograma completo de viajes reservados/programados distribuidos
 * a lo largo de toda la semana (Lunes a Domingo) con distintas instancias de pasajeros
 * (Bruno, Ana, Carla y casos corporativos/ejecutivos), variedad de horarios y trayectos,
 * asignados al conductor para testear la pantalla "Mis Reservas" en la app.
 *
 * Uso:
 *   node scripts/create_weekly_scheduled_trips.mjs
 *   node scripts/create_weekly_scheduled_trips.mjs --clean
 *   node scripts/create_weekly_scheduled_trips.mjs --driver jpmedinagomez1@gmail.com
 *   node scripts/create_weekly_scheduled_trips.mjs --driver prueba2@gmail.com
 *   node scripts/create_weekly_scheduled_trips.mjs --days 7 --per-day 2
 *   node scripts/create_weekly_scheduled_trips.mjs --start monday
 */

import fs from 'node:fs';
import path from 'node:path';

// 1. Detección de API URL desde .env
function getApiUrl() {
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, 'utf8').match(/EXPO_PUBLIC_API_URL\s*=\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim().replace(/['"]/g, '').replace(/\/$/, '');
      }
    }
  } catch {
    // fallback
  }
  return 'https://transfer-black-api.onrender.com/api/v1';
}

const API_URL = getApiUrl();

const ADMIN_CREDENTIALS = {
  email: 'admin@transferblack.com',
  password: 'Admin123456!',
};

// Mapeo rápido de conductores conocidos
const KNOWN_DRIVERS = {
  'prueba2@gmail.com': 'b20d7915-6a70-4690-86e0-375884ae44d4',
  'jpmedinagomez1@gmail.com': 'a64fe09d-9663-454a-a9b3-584701cfd29c',
  default: 'b20d7915-6a70-4690-86e0-375884ae44d4',
};

// Pasajeros demo oficiales con perfiles activos
const PASSENGERS = [
  {
    email: 'bruno@demo.transferblack.com',
    name: 'Bruno Díaz',
    phone: '+543511100002',
  },
  {
    email: 'ana@demo.transferblack.com',
    name: 'Ana Gómez',
    phone: '+543511100001',
  },
  {
    email: 'carla@demo.transferblack.com',
    name: 'Carla Ruiz',
    phone: '+543511100003',
  },
];

// Pool de trayectos reales en Córdoba con coordenadas precisas
const ROUTES_POOL = [
  {
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
    fare: '21500.00',
    notes: 'Vuelo AR1540. Pasajero con equipaje de mano y valija. Esperar en arribos.',
  },
  {
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
    fare: '8800.00',
    notes: 'Traslado universitario matutino.',
  },
  {
    origin: {
      address: 'Av. Rafael Núñez 4500, Cerro de las Rosas, Córdoba',
      lat: -31.3650,
      lng: -64.2380,
      place_id: 'cerro-de-las-rosas',
    },
    destination: {
      address: 'Duarte Quirós 1400, Nuevocentro Shopping, Córdoba',
      lat: -31.4116,
      lng: -64.2023,
      place_id: 'nuevocentro-shopping',
    },
    fare: '14200.00',
    notes: 'Reserva corporativa con factura A.',
  },
  {
    origin: {
      address: 'Barrio Deán Funes Horizonte, Córdoba',
      lat: -31.4508,
      lng: -64.1205,
      place_id: 'dean-funes-horizonte',
    },
    destination: {
      address: 'Patio Olmos Shopping, Av. Vélez Sarsfield 361, Córdoba',
      lat: -31.4196,
      lng: -64.1878,
      place_id: 'patio-olmos',
    },
    fare: '12600.00',
    notes: 'Reunión de trabajo en el centro. Llegar 10 min antes.',
  },
  {
    origin: {
      address: 'Barrio General Paz / 24 de Septiembre 900, Córdoba',
      lat: -31.4140,
      lng: -64.1700,
      place_id: 'barrio-general-paz',
    },
    destination: {
      address: 'Aeropuerto Internacional Ing. Ambrosio Taravella, Córdoba',
      lat: -31.3150,
      lng: -64.2144,
      place_id: 'cordoba-aeropuerto',
    },
    fare: '23000.00',
    notes: 'Vuelo de cabotaje a Bs. As. Puntualidad crítica.',
  },
  {
    origin: {
      address: 'Country Las Delicias, Av. Ejército Argentino, Córdoba',
      lat: -31.3780,
      lng: -64.2750,
      place_id: 'country-las-delicias',
    },
    destination: {
      address: 'San Jerónimo 160, Plaza San Martín, Centro, Córdoba',
      lat: -31.4167,
      lng: -64.1833,
      place_id: 'plaza-san-martin-centro',
    },
    fare: '17500.00',
    notes: 'Traslado ejecutivo VIP.',
  },
  {
    origin: {
      address: 'Belgrano y Fructuoso Rivera, Barrio Güemes, Córdoba',
      lat: -31.4255,
      lng: -64.1905,
      place_id: 'barrio-guemes',
    },
    destination: {
      address: 'Villa Belgrano / Av. Recta Martinolli 5500, Córdoba',
      lat: -31.3520,
      lng: -64.2490,
      place_id: 'villa-belgrano',
    },
    fare: '16900.00',
    notes: 'Retorno nocturno cena corporativa.',
  },
  {
    origin: {
      address: 'Av. Colón 4000, Córdoba',
      lat: -31.3980,
      lng: -64.2310,
      place_id: 'av-colon-4000',
    },
    destination: {
      address: 'San Vicente / San Jerónimo 2800, Córdoba',
      lat: -31.4230,
      lng: -64.1520,
      place_id: 'san-vicente',
    },
    fare: '11300.00',
    notes: 'Traslado familiar con equipaje pequeño.',
  },
];

// Horarios de turnos diarios
const DAILY_SLOTS = [
  { hour: 8, minute: 30, label: 'Mañana' },
  { hour: 13, minute: 15, label: 'Mediodía' },
  { hour: 17, minute: 45, label: 'Tarde' },
  { hour: 21, minute: 0, label: 'Noche' },
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

async function api(endpoint, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { status: res.status, ok: res.ok, data };
}

async function loginAdmin() {
  console.log(`[1] Iniciando sesión como administrador (${ADMIN_CREDENTIALS.email})...`);
  const res = await api('/auth/login', {
    method: 'POST',
    body: ADMIN_CREDENTIALS,
  });

  const token = res.data?.data?.tokens?.access_token;
  if (!token) {
    console.error('Error al autenticar administrador:', res.data);
    process.exit(1);
  }

  console.log('✓ Administrador autenticado correctamente.\n');
  return token;
}

// Cancela las reservas previas del chofer
async function cleanDriverScheduledTrips(adminToken, driverId) {
  console.log(`[Limpieza] Buscando viajes reservados existentes para el chofer ${driverId}...`);
  const listRes = await api('/admin/scheduled-trips', { token: adminToken });
  const allTrips = listRes.data?.data || listRes.data || [];

  const driverTrips = allTrips.filter(
    (t) =>
      (t.reserved_driver?.id === driverId || t.reserved_driver_id === driverId || t.driver_id === driverId) &&
      ['scheduled', 'searching', 'assigned'].includes(t.status)
  );

  if (driverTrips.length === 0) {
    console.log('✓ No hay reservas activas pendientes de limpiar.');
    return;
  }

  console.log(`Cancelando ${driverTrips.length} reservas activas anteriores...`);
  for (const trip of driverTrips) {
    await api(`/admin/scheduled-trips/${trip.id}/cancel`, {
      method: 'POST',
      token: adminToken,
      body: { reason_code: 'admin_cleanup' },
    });
  }
  console.log('✓ Limpieza completada.\n');
}

// Crear un viaje reservado individual
async function createScheduledTrip(adminToken, payload) {
  return await api('/admin/scheduled-trips', {
    method: 'POST',
    token: adminToken,
    body: payload,
  });
}

function parseCliArgs() {
  const args = {
    driver: KNOWN_DRIVERS.default,
    days: 7,
    perDay: 2,
    clean: false,
    start: 'today', // 'today' | 'monday'
  };

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--driver' || flag === '-d') {
      const val = argv[++i];
      args.driver = KNOWN_DRIVERS[val] || val;
    } else if (flag === '--days') {
      args.days = Math.max(1, Math.min(14, parseInt(argv[++i], 10) || 7));
    } else if (flag === '--per-day') {
      args.perDay = Math.max(1, Math.min(4, parseInt(argv[++i], 10) || 2));
    } else if (flag === '--clean') {
      args.clean = true;
    } else if (flag === '--start') {
      args.start = argv[++i] === 'monday' ? 'monday' : 'today';
    } else if (flag === '--help' || flag === '-h') {
      console.log(`
Uso: node scripts/create_weekly_scheduled_trips.mjs [opciones]

Opciones:
  --driver, -d <email|id> Conductor asignado (default: prueba2@gmail.com o jpmedinagomez1@gmail.com)
  --days <numero>         Cantidad de días a cubrir (default: 7 = toda la semana)
  --per-day <1..4>        Cantidad de reservas por día en distintos turnos (default: 2)
  --clean                 Cancela las reservas activas previas del conductor antes de crear
  --start <today|monday>  Comienza hoy o el próximo lunes (default: today)
  --help, -h              Muestra esta ayuda
      `);
      process.exit(0);
    }
  }

  return args;
}

async function main() {
  const options = parseCliArgs();

  console.log('================================================================');
  console.log('📅 TRANSFERBLACK - GENERADOR DE RESERVAS SEMANALES PARA CHOFER');
  console.log('================================================================');
  console.log(`API URL:         ${API_URL}`);
  console.log(`Conductor ID:    ${options.driver}`);
  console.log(`Días a generar:  ${options.days} días`);
  console.log(`Viajes por día:  ${options.perDay}`);
  console.log(`Inicio:          ${options.start === 'monday' ? 'Próximo Lunes' : 'A partir de hoy'}`);
  console.log(`Limpieza previa: ${options.clean ? 'Sí' : 'No'}`);
  console.log('----------------------------------------------------------------\n');

  const adminToken = await loginAdmin();

  if (options.clean) {
    await cleanDriverScheduledTrips(adminToken, options.driver);
  }

  // Determinar la fecha base de inicio
  const now = new Date();
  let startDate = new Date(now);

  if (options.start === 'monday') {
    const dayOfWeek = startDate.getDay(); // 0 = Domingo, 1 = Lunes
    const daysUntilMonday = (8 - (dayOfWeek === 0 ? 7 : dayOfWeek)) % 7 || 7;
    startDate.setDate(startDate.getDate() + daysUntilMonday);
    startDate.setHours(0, 0, 0, 0);
  } else {
    // Si empieza hoy, asegurar que el primer viaje esté al menos 2 horas en el futuro
    startDate.setHours(now.getHours() + 2, 0, 0, 0);
  }

  console.log(`[2] Creando cronograma de viajes reservados a lo largo de ${options.days} días...\n`);

  const createdTrips = [];
  let passengerIndex = 0;
  let routeIndex = 0;

  for (let dayOffset = 0; dayOffset < options.days; dayOffset++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + dayOffset);

    const dayName = DAY_NAMES[currentDay.getDay()];
    const dateStr = currentDay.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    console.log(`📌 ${dayName.toUpperCase()} (${dateStr}):`);

    // Seleccionar turnos del día según --per-day
    const slotStep = Math.floor(DAILY_SLOTS.length / options.perDay);
    const daySlots = [];
    for (let s = 0; s < options.perDay; s++) {
      daySlots.push(DAILY_SLOTS[(s * slotStep) % DAILY_SLOTS.length]);
    }

    for (const slot of daySlots) {
      const scheduledDateTime = new Date(currentDay);
      scheduledDateTime.setHours(slot.hour, slot.minute, 0, 0);

      // Si la fecha/hora ya pasó con respecto a 'now', sumar 1 hora extra hacia adelante
      if (scheduledDateTime.getTime() <= now.getTime()) {
        scheduledDateTime.setTime(now.getTime() + (dayOffset + 1) * 3600 * 1000 * 4);
      }

      const passenger = PASSENGERS[passengerIndex % PASSENGERS.length];
      passengerIndex++;

      const route = ROUTES_POOL[routeIndex % ROUTES_POOL.length];
      routeIndex++;

      const timeLabel = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')} hs`;

      const payload = {
        passenger_email: passenger.email,
        origin: route.origin,
        destination: route.destination,
        scheduled_at: scheduledDateTime.toISOString(),
        agreed_fare: route.fare,
        reserved_driver_id: options.driver,
        notes: `[${slot.label} ${dayName}] ${route.notes}`,
      };

      const result = await createScheduledTrip(adminToken, payload);

      if (result.status === 201) {
        const trip = result.data?.data || result.data;
        console.log(`  ✓ [${timeLabel}] ${passenger.name} | ${route.origin.address.slice(0, 35)}... -> ${route.destination.address.slice(0, 30)}... | $${route.fare} ARS (ID: ${trip.public_code || trip.id?.slice(0, 8)})`);
        createdTrips.push({
          Día: `${dayName} ${dateStr}`,
          Hora: timeLabel,
          Pasajero: passenger.name,
          Tarifa: `$${route.fare}`,
          Código: trip.public_code || trip.id?.slice(0, 8),
          Estado: trip.status || 'scheduled',
        });
      } else {
        console.error(`  ✗ Error al crear reserva para ${timeLabel}:`, result.data?.error || result.data);
      }
    }
    console.log('');
  }

  console.log('================================================================');
  console.log(`📊 RESUMEN DEL CRONOGRAMA SEMANAL CREADO (${createdTrips.length} RESERVAS)`);
  console.log('================================================================');
  console.table(createdTrips);

  console.log(`\n🎉 ¡Listo! Se crearon ${createdTrips.length} viajes reservados para la semana.`);
  console.log('📱 Abrí la app de conductor y entrá en "Mis Reservas" para ver la lista completa ordenada por fecha y hora.');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('[!] Error fatal:', err);
  process.exit(1);
});
