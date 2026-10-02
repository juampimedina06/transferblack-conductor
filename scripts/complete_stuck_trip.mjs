import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

/**
 * Desbloquea un viaje que quedo trabado en `in_progress` y cuyo conductor ya
 * no puede retomarlo desde la app (sesion cerrada, app reinstallada, logout con
 * `activeTrip` borrado). El unico camino que el backend acepta desde
 * `in_progress` es `POST /rides/:id/complete`: el chofer NO puede cancelar
 * (`canDriverCancelTrip` excluye `in_progress`).
 *
 * El script login como el conductor dueno del viaje y dispara la misma
 * transicion que usaria la app. Ojo: completar liquida el pago, asi que en
 * viajes con voucher consume el voucher (`markVoucherAsUsedInTransaction`).
 * Por eso pide confirmacion antes dePegar el POST.
 *
 *   node scripts/complete_stuck_trip.mjs
 *   node scripts/complete_stuck_trip.mjs --trip-id <uuid>
 *   node scripts/complete_stuck_trip.mjs --public-code TB-A2D4AB820E
 *   node scripts/complete_stuck_trip.mjs --yes
 */

const DEFAULT_API_URL = 'https://transfer-black-api.onrender.com/api/v1';

const DEFAULT_TRIP_ID = '0c28cf97-d8dd-4dcc-8181-5af1fde95e56';
const DEFAULT_PUBLIC_CODE = 'TB-A2D4AB820E';

const DRIVER_CREDENTIALS = {
  email: 'conductor.test@transferblack.com',
  password: 'Test1234',
};

const DEFAULT_COORDS = {
  latitude: -31.4431,
  longitude: -64.1143,
};

const RECOVERABLE_STATUS = 'in_progress';
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
    tripId: DEFAULT_TRIP_ID,
    publicCode: DEFAULT_PUBLIC_CODE,
    coords: { ...DEFAULT_COORDS },
    assumeYes: false,
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
        break;
      case '--trip-id':
        args.tripId = next();
        break;
      case '--public-code':
        args.publicCode = next();
        break;
      case '--lat':
        args.coords.latitude = Number(next());
        break;
      case '--lng':
        args.coords.longitude = Number(next());
        break;
      case '--yes':
      case '-y':
        args.assumeYes = true;
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
Desbloquea un viaje trabado en in_progress completandolo con su propio conductor.

  --trip-id <uuid>       Viaje a completar        (default ${DEFAULT_TRIP_ID})
  --public-code <code>   Codigo publico esperado, de control
                          (default ${DEFAULT_PUBLIC_CODE})
  --lat <n>              Latitud de cierre       (default ${DEFAULT_COORDS.latitude})
  --lng <n>              Longitud de cierre      (default ${DEFAULT_COORDS.longitude})
  --yes, -y              No pedir confirmacion
  --help, -h
`);
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
  const code = apiError?.code ? ` [${apiError.code}]` : '';
  const message = apiError?.message || JSON.stringify(result.data);
  console.error(`[X] ${label} (HTTP ${result.status})${code}: ${message}`);
}

async function login(credentials, roleLabel) {
  const result = await api('/auth/login', {
    method: 'POST',
    body: { email: credentials.email, password: credentials.password },
  });
  const tokens = result.data?.data?.tokens;
  if (!tokens?.access_token) {
    describeError(`No se pudo iniciar sesion como ${roleLabel}`, result);
    return null;
  }
  return tokens.access_token;
}

/** El conductor logueado tiene que ser el dueno del viaje, no un tercero. */
async function fetchDriverId(driverToken) {
  const result = await api('/driver/me', { token: driverToken });
  if (!result.ok) {
    describeError('No se pudo leer el perfil del conductor', result);
    return null;
  }
  return result.data?.data?.driverProfile?.id ?? null;
}

/**
 * Mismo contrato que usa la app: `GET /rides/:id` con el token del conductor
 * dueno. Un 403 acá significa que el viaje es de otro chofer.
 */
async function fetchTrip(driverToken, tripId) {
  const result = await api(`/rides/${tripId}`, { token: driverToken });
  if (result.status === 403) {
    console.error(`[X] El viaje ${tripId} pertenece a otro conductor.`);
    return null;
  }
  if (!result.ok) {
    describeError('No se pudo leer el viaje', result);
    return null;
  }
  return result.data?.data ?? null;
}

function printTrip(trip) {
  console.log(`    Codigo:   ${trip.public_code ?? '(sin codigo)'}`);
  console.log(`    Estado:   ${trip.status}`);
  console.log(`    Chofer:   ${trip.driver_id ?? '(sin chofer)'}`);
  console.log(`    Pago:     ${trip.payment_method ?? '(desconocido)'}`);
  console.log(`    Inicio:   ${trip.started_at ?? '(sin inicio)'}`);
  console.log(`    Cierre:   ${trip.finished_at ?? '(sin cerrar)'}`);
}

async function confirm(question) {
  if (!process.stdin.isTTY) {
    console.log('');
    console.log('[!] Sin terminal interactiva no se puede confirmar. Usá --yes si estas seguro.');
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} [s/N] `);
    return /^s(i)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('====================================================');
  console.log('   TRANSFERBLACK - DESBLOQUEO DE VIAJE IN_PROGRESS');
  console.log('====================================================');
  console.log(`API:   ${API_URL}`);
  console.log(`Trip:  ${args.tripId} (${args.publicCode})`);
  console.log(`Coords: ${args.coords.latitude}, ${args.coords.longitude}`);
  console.log('----------------------------------------------------');

  console.log('\n[1] Iniciando sesion como el conductor del viaje...');
  const driverToken = await login(DRIVER_CREDENTIALS, 'conductor');
  if (!driverToken) return;

  console.log('\n[2] Verificando que el viaje exista y sea del conductor logueado...');
  const driverId = await fetchDriverId(driverToken);
  const trip = await fetchTrip(driverToken, args.tripId);
  if (!trip) {
    console.error(`    No se pudo leer el viaje ${args.tripId}.`);
    console.error('    Verifica --trip-id, o que no este ya borrado.');
    return;
  }
  printTrip(trip);

  // Guarda contra copy-paste: si el id y el codigo no son del mismo viaje,
  // mejor frenar ahora que completar el viaje equivocado.
  if (trip.public_code && args.publicCode && trip.public_code !== args.publicCode) {
    console.error(`\n[X] El id ${args.tripId} corresponde al codigo ${trip.public_code},`);
    console.error(`    no a ${args.publicCode}. Corregi --trip-id / --public-code.`);
    return;
  }

  if (!trip.driver_id) {
    console.error('\n[X] Ese viaje no tiene chofer asignado. No hay nada que desbloquear.');
    return;
  }
  if (driverId && trip.driver_id !== driverId) {
    console.error(`\n[X] El viaje es de otro chofer (${trip.driver_id}).`);
    console.error('    Logueate como ese chofer para poder completarlo.');
    return;
  }

  if (FINAL_STATUSES.includes(trip.status)) {
    console.log(`\n[OK] El viaje ya esta en ${trip.status}. No hace falta tocar nada.`);
    return;
  }
  if (trip.status !== RECOVERABLE_STATUS) {
    console.log(`\n[X] El viaje esta en ${trip.status}, no en ${RECOVERABLE_STATUS}.`);
    console.log('    Solo los viajes en curso se pueden completar desde aca;');
    console.log('    para otros estados usa el ciclo de vida normal de la app.');
    return;
  }

  console.log('\n[!] Completar el viaje liquida el pago del lado del backend.');
  if (trip.payment_method === 'voucher') {
    console.log('    Ojo: este viaje paga con voucher, asi que el script tambien lo consume.');
  }

  if (!args.assumeYes) {
    const ok = await confirm('    Completar el viaje ahora?');
    console.log('');
    if (!ok) {
      console.log('[!] Cancelado por el operador. No se disparo nada.');
      return;
    }
  }

  console.log('[3] Completando el viaje...');
  const result = await api(`/rides/${args.tripId}/complete`, {
    method: 'POST',
    token: driverToken,
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: { latitude: args.coords.latitude, longitude: args.coords.longitude },
  });

  if (result.status !== 200) {
    describeError('No se pudo completar el viaje', result);
    console.log('');
    console.log('    El viaje sigue en in_progress. Causas probables:');
    console.log('    - la liquidacion del pago (voucher) fallo y la transaccion se revirtio;');
    console.log('    - el chofer autenticado no es el dueno del viaje;');
    console.log('    - el viaje ya no esta en in_progress.');
    return;
  }

  console.log('    ✓ HTTP 200');
  const updated = result.data?.data ?? {};
  console.log(`    Estado final: ${updated.status ?? '?'}`);
  console.log(`    Cerrado:      ${updated.finished_at ?? '(sin finished_at)'}`);

  console.log('\n[4] Verificando contra el backend...');
  const after = await fetchTrip(driverToken, args.tripId);
  if (!after) {
    console.log('    No se pudo releer el viaje para verificar.');
    return;
  }
  printTrip(after);

  if (after.status === 'completed') {
    console.log('\n[OK] Viaje completado. El conductor ya puede volver a aceptar ofertas.');
  } else {
    console.log(`\n[!] La API respondio 200 pero el viaje quedo en ${after.status}. Mirá el log del backend.`);
  }
}

main().catch((error) => {
  console.error('[X] Error inesperado:', error);
  process.exit(1);
});
