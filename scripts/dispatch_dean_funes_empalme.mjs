import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Dispara un viaje real al radar NATURAL: no toca el estado de ningun chofer.
 * El backend busca los 5 choferes `online` mas cercanos al pickup (radio 5km)
 * y crea una oferta para cada uno. El primero que acepte se queda el viaje.
 *
 * Origen:    Barrio Deán Funes / Horizonte, Córdoba
 * Destino:   Barrio Empalme, Córdoba
 *
 * El script NO acepta la oferta: la idea es que entre a la app de conductor
 * y la aceptes desde el telefono. Solo informa por consola a quien le llego.
 *
 *   node scripts/dispatch_dean_funes_empalme.mjs
 *   node scripts/dispatch_dean_funes_empalme.mjs --origin-lat -31.4431 --origin-lng -64.1143
 *   node scripts/dispatch_dean_funes_empalme.mjs --no-watch
 */

const DEFAULT_API_URL = 'https://transfer-black-api.onrender.com/api/v1';

const ADMIN_CREDENTIALS = {
  email: 'admin@transferblack.com',
  password: 'Admin123456!',
};

const DEFAULT_PASSENGER = {
  email: 'bruno@demo.transferblack.com',
  password: 'Demo1234',
};

const ORIGIN = {
  address_text: 'Barrio Deán Funes / Horizonte, Córdoba',
  place_id: 'barrio-dean-funes-horizonte-cordoba',
  latitude: -31.444551,
  longitude: -64.116464,
};

const DESTINATION = {
  address_text: 'Barrio Empalme, Córdoba',
  place_id: 'barrio-empalme-cordoba',
  latitude: -31.4405,
  longitude: -64.1262,
};

const RADAR_RADIUS_METERS = 5000;
const POLL_INTERVAL_MS = 3000;
const FINAL_STATUSES = ['completed', 'cancelled'];

function getApiUrl() {
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, 'utf8').match(/EXPO_PUBLIC_API_URL\s*=\s*(.+)/);
      if (match && match[1]) return match[1].trim().replace(/['"]/g, '');
    }
  } catch {
    // fallback al default
  }
  return DEFAULT_API_URL;
}

const API_URL = getApiUrl();

function parseArgs(argv) {
  const args = {
    origin: { ...ORIGIN },
    destination: { ...DESTINATION },
    passenger: { ...DEFAULT_PASSENGER },
    watch: true,
    watchSeconds: 120,
    force: false,
  };

  const readValue = (argv, index, flag) => {
    const value = argv[index + 1];
    if (value === undefined) {
      console.error(`Falta el valor de ${flag}`);
      printHelp();
      process.exit(1);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => readValue(argv, i++, flag);

    switch (flag) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      case '--no-watch':
        args.watch = false;
        break;
      case '--force':
        args.force = true;
        break;
      case '--origin-lat':
        args.origin.latitude = Number(next());
        break;
      case '--origin-lng':
        args.origin.longitude = Number(next());
        break;
      case '--dest-lat':
        args.destination.latitude = Number(next());
        break;
      case '--dest-lng':
        args.destination.longitude = Number(next());
        break;
      case '--passenger-email':
        args.passenger.email = next();
        break;
      case '--passenger-password':
        args.passenger.password = next();
        break;
      case '--watch-seconds':
        args.watchSeconds = Number(next());
        break;
      default:
        console.error(`Parametro desconocido: ${flag}`);
        printHelp();
        process.exit(1);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Dispara un viaje al radar natural: Deán Funes / Horizonte -> Barrio Empalme.

  --origin-lat <n>       Latitud del origen   (default ${ORIGIN.latitude})
  --origin-lng <n>       Longitud del origen  (default ${ORIGIN.longitude})
  --dest-lat <n>         Latitud del destino  (default ${DESTINATION.latitude})
  --dest-lng <n>         Longitud del destino (default ${DESTINATION.longitude})
  --passenger-email <e>  Pasajero que pide el viaje
  --passenger-password <p>
  --watch-seconds <n>    Segundos de espera por aceptacion (default 120)
  --no-watch             Dispara y sale, sin esperar a que acepte alguien
  --force                Dispara aunque no haya choferes online en el radar
  --help, -h
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function describeError(label, result) {
  const apiError = result.data?.error;
  const message = apiError?.message || apiError?.code || JSON.stringify(result.data);
  console.error(`[X] ${label} (HTTP ${result.status}): ${message}`);
  return result.data;
}

async function login(credentials, roleLabel) {
  const result = await api('/auth/login', {
    method: 'POST',
    body: { email: credentials.email, password: credentials.password },
  });
  const token = result.data?.data?.tokens?.access_token;
  if (!token) {
    describeError(`No se pudo iniciar sesion como ${roleLabel}`, result);
    return null;
  }
  return token;
}

/**
 * Foto del radar antes de dispatchar: cuantos choferes `online` hay dentro del
 * radio de busqueda. El heatmap agrega en celdas de ~550m y descarta posiciones
 * con mas de 120s de antiguedad, asi que es una foto indicativa, no exacta.
 */
async function preflightRadar(lat, lng) {
  const token = await login(ADMIN_CREDENTIALS, 'admin');
  if (!token) {
    console.log('[!] Sin token de admin: se omite la foto del radar.');
    return null;
  }

  const deltaLat = RADAR_RADIUS_METERS / 111_320;
  const deltaLng = RADAR_RADIUS_METERS / (111_320 * Math.cos((lat * Math.PI) / 180));
  const params = new URLSearchParams({
    minLat: (lat - deltaLat).toFixed(5),
    maxLat: (lat + deltaLat).toFixed(5),
    minLng: (lng - deltaLng).toFixed(5),
    maxLng: (lng + deltaLng).toFixed(5),
    status: 'online',
  });

  const result = await api(`/admin/telemetry/heatmap?${params}`, { token });
  if (!result.ok) {
    describeError('No se pudo leer el heatmap', result);
    return null;
  }

  const cells = result.data?.cells ?? [];
  const meta = result.data?.meta ?? {};
  const onlineInRange = cells.reduce((total, cell) => total + (cell.breakdown?.online ?? 0), 0);

  console.log(`[1] Foto del radar en un radio de ${RADAR_RADIUS_METERS}m alrededor del origen`);
  console.log(`    Choferes online cerca: ${onlineInRange} (celdas con datos: ${cells.length}, conductores en el heatmap: ${meta.totalDrivers ?? '?'})`);

  if (onlineInRange > 0) {
    for (const cell of cells.slice(0, 5)) {
      const { lat: cellLat, lng: cellLng, breakdown } = cell;
      console.log(`      - celda (${cellLat}, ${cellLng}): ${breakdown?.online ?? 0} online, ${breakdown?.in_trip ?? 0} en viaje`);
    }
  } else {
    console.log('    (ninguna celda con choferes online en la zona)');
  }

  return { onlineInRange, totalDrivers: meta.totalDrivers ?? null };
}

/** Nombre, email y telefono del chofer que se quedo el viaje. */
async function resolveDriverIdentity(adminToken, publicCode, tripId) {
  if (!adminToken || !publicCode) return null;
  const result = await api(`/admin/rides?search=${encodeURIComponent(publicCode)}&limit=5`, {
    token: adminToken,
  });
  if (!result.ok) return null;
  const rides = result.data?.data ?? [];
  const ride = rides.find((item) => item.id === tripId);
  return ride?.driver ?? null;
}

function printDriver(driver) {
  if (!driver) {
    console.log('    (el backend no devolvio los datos del chofer en /admin/rides)');
    return;
  }
  const fullName = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() || '(sin nombre)';
  console.log(`    Chofer: ${fullName}`);
  console.log(`    Email:  ${driver.email}`);
  if (driver.phone) console.log(`    Telefono: ${driver.phone}`);
}

/**
 * Espera a que alguien acepte. Imprime cada cambio de estado y, apenas hay
 * chofer asignado, resuelve su identidad contra el endpoint de admin.
 */
async function watchTrip(passengerToken, adminToken, tripId, publicCode, seconds) {
  console.log(`\n[6] Esperando a que un chofer acepte (max ${seconds}s). Aceptalo vos desde la app.`);

  let lastStatus = null;
  const deadline = Date.now() + seconds * 1000;

  while (Date.now() < deadline) {
    const result = await api(`/rides/${tripId}`, { token: passengerToken });
    if (!result.ok) {
      describeError('Error consultando el estado del viaje', result);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const trip = result.data?.data ?? {};
    const status = trip.status;

    if (status && status !== lastStatus) {
      lastStatus = status;
      console.log(`    [${new Date().toLocaleTimeString()}] Estado: ${status}`);

      if (trip.driver_id) {
        console.log('    >>> LLEGO EL VIAJE');
        console.log(`    Chofer asignado (id): ${trip.driver_id}`);
        const driver = await resolveDriverIdentity(adminToken, publicCode, tripId);
        printDriver(driver);
        return;
      }

      if (FINAL_STATUSES.includes(status)) {
        console.log(`    El viaje quedo en ${status}. No hay chofer asignado.`);
        return;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.log(`    Se acabaron los ${seconds}s sin aceptacion.`);
  console.log('    El viaje sigue searching y el worker del backend reintenta solo;');
  console.log('    si lo quieres volver a disparar, corré el script de nuevo.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { origin, destination, passenger } = args;

  console.log('====================================================');
  console.log('   TRANSFERBLACK - DISPARO AL RADAR NATURAL');
  console.log('====================================================');
  console.log(`API:         ${API_URL}`);
  console.log(`Origen:      ${origin.address_text} (${origin.latitude}, ${origin.longitude})`);
  console.log(`Destino:     ${destination.address_text} (${destination.latitude}, ${destination.longitude})`);
  console.log('----------------------------------------------------');

  const adminToken = await login(ADMIN_CREDENTIALS, 'admin');
  const radar = adminToken
    ? await preflightRadar(origin.latitude, origin.longitude)
    : null;

  if (radar && radar.onlineInRange === 0 && !args.force) {
    console.log('\n[!] No hay ningun chofer online en el radio de busqueda.');
    console.log('    Conectate en la app (switch "Disponible" en verde) y volve a correrlo,');
    console.log('    o usá --force para dispatchar igual y ver el error del backend.');
    return;
  }

  console.log('\n[2] Iniciando sesion como pasajero...');
  const passengerToken = await login(passenger, 'pasajero');
  if (!passengerToken) return;

  await api('/users/me', {
    method: 'PATCH',
    token: passengerToken,
    body: { gender: 'MASCULINO' },
  });

  console.log('[3] Cotizando el viaje...');
  const quoteResult = await api('/rides/quote', {
    method: 'POST',
    token: passengerToken,
    body: { origin, destination },
  });
  if (quoteResult.status !== 201) {
    describeError('Error al cotizar el viaje', quoteResult);
    return;
  }

  const draft = quoteResult.data?.data?.draft ?? {};
  const quotes = quoteResult.data?.data?.quotes ?? [];
  const quote = quotes[0];
  if (!draft.id || !quote) {
    console.error('[X] La cotizacion vino sin draft o sin tarifas:', JSON.stringify(quoteResult.data, null, 2));
    return;
  }

  const tripId = draft.id;
  console.log(`    ✓ Trip ${tripId} (codigo publico ${draft.public_code})`);
  console.log(`    ✓ ${quote.service_type?.name ?? 'standard'}: $${quote.pricing?.total_amount} ${quote.currency}`);
  console.log(`    ✓ Distancia: ${quoteResult.data.data.route?.distance_km} km`);

  console.log('[4] Confirmando el viaje (efectivo, con PIN)...');
  const confirmResult = await api(`/rides/${tripId}/confirm`, {
    method: 'POST',
    token: passengerToken,
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: { fare_quote_id: quote.id, payment: { type: 'cash' }, require_pin: true },
  });
  if (confirmResult.status !== 200) {
    describeError('Error al confirmar el viaje', confirmResult);
    return;
  }

  const trip = confirmResult.data?.data?.trip ?? confirmResult.data?.data ?? {};
  const boardingPin = trip.boarding_pin ?? confirmResult.data?.data?.boarding_pin;
  console.log('    ✓ Viaje confirmado');
  console.log(`    >>> PIN DE ABORDAJE: ${boardingPin ?? '(sin PIN)'}`);

  console.log('[5] Disparando al radar...');
  const dispatchResult = await api(`/rides/${tripId}/dispatch`, {
    method: 'POST',
    token: passengerToken,
  });

  // El controller responde 202 Accepted: los scripts viejos chequeaban 200 y
  // por eso siempre mostraban esto como si fuera un error.
  if (dispatchResult.status !== 200 && dispatchResult.status !== 202) {
    describeError('Error en el despacho', dispatchResult);
    if (dispatchResult.data?.error?.code === 'NO_DRIVERS_AVAILABLE') {
      console.log('    Nadie estaba disponible cerca del origen en el momento del despacho.');
    }
    return;
  }

  const offersCreated = dispatchResult.data?.offersCreated;
  console.log(`    ✓ Despacho OK. Ofertas creadas: ${offersCreated ?? '?'} (llego a los ${offersCreated ?? '?'} choferes online mas cercanos)`);

  if (!args.watch) return;
  await watchTrip(passengerToken, adminToken, tripId, draft.public_code, args.watchSeconds);
}

main().catch((error) => {
  console.error('[X] Error inesperado:', error);
  process.exit(1);
});
