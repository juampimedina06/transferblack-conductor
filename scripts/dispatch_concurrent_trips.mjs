/**
 * scripts/dispatch_concurrent_trips.mjs
 *
 * Dispara solicitudes de viajes concurrentes desde múltiples instancias de pasajeros
 * (cuentas demo y/o pasajeros generados dinámicamente) para pruebas de carga,
 * concurrencia del radar y despacho simultáneo hacia la app de conductores.
 *
 * Uso:
 *   node scripts/dispatch_concurrent_trips.mjs
 *   node scripts/dispatch_concurrent_trips.mjs --instances 3
 *   node scripts/dispatch_concurrent_trips.mjs --instances 5
 *   node scripts/dispatch_concurrent_trips.mjs --cluster-origin -31.4508,-64.1205
 *   node scripts/dispatch_concurrent_trips.mjs --clean
 *   node scripts/dispatch_concurrent_trips.mjs --no-watch
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// 1. Detección de URL de la API desde .env del frontend
function getApiUrl() {
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/EXPO_PUBLIC_API_URL\s*=\s*(.+)/);
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

// Plantillas de instancias base de pasajeros demo con ubicaciones en Córdoba
const BASE_INSTANCES = [
  {
    name: 'Instancia 1 (Bruno Díaz)',
    email: 'bruno@demo.transferblack.com',
    password: 'Demo1234',
    origin: {
      address_text: 'Barrio Deán Funes Horizonte, Córdoba',
      place_id: 'dean-funes-horizonte',
      latitude: -31.4508,
      longitude: -64.1205,
    },
    destination: {
      address_text: 'Duarte Quirós 1400, Nuevocentro Shopping, Córdoba',
      place_id: 'nuevocentro-shopping',
      latitude: -31.4116,
      longitude: -64.2023,
    },
  },
  {
    name: 'Instancia 2 (Ana Gómez)',
    email: 'ana@demo.transferblack.com',
    password: 'Demo1234',
    origin: {
      address_text: 'Barrio Jardín / Av. Ricchieri 3200, Córdoba',
      place_id: 'barrio-jardin',
      latitude: -31.4450,
      longitude: -64.1750,
    },
    destination: {
      address_text: 'Patio Olmos Shopping, Av. Vélez Sarsfield 361, Córdoba',
      place_id: 'patio-olmos',
      latitude: -31.4196,
      longitude: -64.1878,
    },
  },
  {
    name: 'Instancia 3 (Carla Ruiz)',
    email: 'carla@demo.transferblack.com',
    password: 'Demo1234',
    origin: {
      address_text: 'Av. Rafael Núñez 4500, Cerro de las Rosas, Córdoba',
      place_id: 'cerro-de-las-rosas',
      latitude: -31.3650,
      longitude: -64.2380,
    },
    destination: {
      address_text: 'Aeropuerto Internacional Taravella, Córdoba',
      place_id: 'aeropuerto-cordoba',
      latitude: -31.3150,
      longitude: -64.2144,
    },
  },
];

// Generador de instancias adicionales dinámicas si se piden > 3
function createDynamicInstance(index, baseOrigin = null) {
  const num = index + 1;
  const email = `test_pax_instance_${num}@demo.transferblack.com`;
  const password = 'Password123!';

  // Dispersión ligera de coordenadas (~300m - 1km) si hay origen base agrupado
  let originLat = -31.4300 + (Math.sin(num) * 0.015);
  let originLng = -64.1800 + (Math.cos(num) * 0.015);
  let address = `Punto de partida Instancia #${num}, Córdoba`;

  if (baseOrigin) {
    originLat = baseOrigin.latitude + ((Math.random() - 0.5) * 0.008);
    originLng = baseOrigin.longitude + ((Math.random() - 0.5) * 0.008);
    address = `Cercanías ${baseOrigin.address_text || 'Radar'} #${num}`;
  }

  return {
    name: `Instancia ${num} (Dinámica)`,
    email,
    password,
    isDynamic: true,
    firstName: `Pasajero${num}`,
    lastName: 'Test',
    origin: {
      address_text: address,
      place_id: `place-instance-${num}`,
      latitude: Number(originLat.toFixed(6)),
      longitude: Number(originLng.toFixed(6)),
    },
    destination: {
      address_text: 'Centro de Córdoba / Plaza San Martín',
      place_id: 'plaza-san-martin-cordoba',
      latitude: -31.4167,
      longitude: -64.1833,
    },
  };
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Autenticación o registro + completitud de perfil para pasajeros dinámicos
async function authenticatePassenger(instance) {
  // Intentar login
  let res = await api('/auth/login', {
    method: 'POST',
    body: { email: instance.email, password: instance.password },
  });

  // Si no existe y es dinámica, registrarlo
  if (!res.ok && instance.isDynamic) {
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: { email: instance.email, password: instance.password },
    });
    if (!regRes.ok) {
      throw new Error(`Fallo registro de ${instance.email}: ${JSON.stringify(regRes.data?.error || regRes.data)}`);
    }
    // Reintentar login tras registro
    res = await api('/auth/login', {
      method: 'POST',
      body: { email: instance.email, password: instance.password },
    });
  }

  const token = res.data?.data?.tokens?.access_token;
  if (!token) {
    throw new Error(`No se pudo obtener token para ${instance.email}: ${JSON.stringify(res.data?.error || res.data)}`);
  }

  // Asegurar que el perfil esté completo para cotizar
  if (instance.isDynamic) {
    await api('/users/me', {
      method: 'PATCH',
      token,
      body: {
        first_name: instance.firstName,
        last_name: instance.lastName,
        phone_number: `+5493519${String(1000000 + Math.floor(Math.random() * 8999999))}`,
        birth_date: '1995-05-15',
        gender: 'MASCULINO',
        document_type: 'DNI',
        document_number: `${30000000 + Math.floor(Math.random() * 9999999)}`,
        address_text: instance.origin.address_text,
      },
    });
  } else {
    // Asegurar gender para perfiles demo
    await api('/users/me', {
      method: 'PATCH',
      token,
      body: { gender: 'MASCULINO' },
    });
  }

  return token;
}

// Ejecución completa de una instancia de viaje
async function executePassengerRide(instance, index, total, options) {
  const prefix = `[#${index + 1}/${total} ${instance.name}]`;
  const result = {
    index: index + 1,
    name: instance.name,
    email: instance.email,
    tripId: null,
    publicCode: null,
    boardingPin: null,
    amount: null,
    status: 'failed',
    offersCreated: 0,
    error: null,
    token: null,
  };

  try {
    if (options.staggerMs > 0 && index > 0) {
      await sleep(index * options.staggerMs);
    }

    console.log(`${prefix} Autenticando...`);
    const token = await authenticatePassenger(instance);
    result.token = token;

    console.log(`${prefix} Cotizando viaje: ${instance.origin.address_text} -> ${instance.destination.address_text}`);
    const quoteRes = await api('/rides/quote', {
      method: 'POST',
      token,
      body: {
        origin: instance.origin,
        destination: instance.destination,
      },
    });

    if (quoteRes.status !== 201) {
      throw new Error(`Error en cotización (${quoteRes.status}): ${JSON.stringify(quoteRes.data?.error || quoteRes.data)}`);
    }

    const draft = quoteRes.data?.data?.draft;
    const quotes = quoteRes.data?.data?.quotes || [];
    const selectedQuote = quotes[0];

    if (!draft?.id || !selectedQuote) {
      throw new Error('La respuesta de cotización no contiene borrador o tarifas válidas.');
    }

    result.tripId = draft.id;
    result.publicCode = draft.public_code;
    result.amount = `$${selectedQuote.pricing?.total_amount} ${selectedQuote.currency || 'ARS'}`;

    console.log(`${prefix} Confirmando viaje (Draft ID: ${draft.id}, Tarifa: ${result.amount})...`);
    const confirmRes = await api(`/rides/${draft.id}/confirm`, {
      method: 'POST',
      token,
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: {
        fare_quote_id: selectedQuote.id,
        payment: { type: 'cash' },
        require_pin: true,
      },
    });

    if (confirmRes.status !== 200) {
      throw new Error(`Error en confirmación (${confirmRes.status}): ${JSON.stringify(confirmRes.data?.error || confirmRes.data)}`);
    }

    const trip = confirmRes.data?.data?.trip || confirmRes.data?.data || {};
    result.boardingPin = trip.boarding_pin || confirmRes.data?.data?.boarding_pin || 'N/A';

    console.log(`${prefix} Disparando al radar (/rides/${draft.id}/dispatch)...`);
    const dispatchRes = await api(`/rides/${draft.id}/dispatch`, {
      method: 'POST',
      token,
    });

    // 202 Accepted o 200 OK
    if (dispatchRes.status !== 200 && dispatchRes.status !== 202) {
      const errCode = dispatchRes.data?.error?.code;
      if (errCode === 'NO_DRIVERS_AVAILABLE') {
        console.warn(`${prefix} ⚠️ Sin choferes disponibles en el radar.`);
      } else {
        throw new Error(`Error en despacho (${dispatchRes.status}): ${JSON.stringify(dispatchRes.data?.error || dispatchRes.data)}`);
      }
    }

    result.offersCreated = dispatchRes.data?.offersCreated ?? 0;
    result.status = 'searching';

    console.log(`${prefix} ✅ VIAJE DISPARADO CON ÉXITO | Trip: ${result.tripId} | Code: ${result.publicCode} | PIN: ${result.boardingPin} | Ofertas: ${result.offersCreated}`);
  } catch (err) {
    result.error = err.message;
    console.error(`${prefix} ❌ FALLÓ: ${err.message}`);
  }

  return result;
}

// Limpieza previa opcional de viajes en 'searching'
async function cleanupSearchingRides() {
  console.log('\n🧹 [Limpieza] Iniciando sesión como admin para limpiar viajes huérfanos...');
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: ADMIN_CREDENTIALS,
  });

  const adminToken = loginRes.data?.data?.tokens?.access_token;
  if (!adminToken) {
    console.warn('⚠️ No se pudo autenticar como admin. Se omite limpieza previa.');
    return;
  }

  const ridesRes = await api('/admin/rides?limit=50', { token: adminToken });
  const rides = ridesRes.data?.data || ridesRes.data?.rides || [];
  const searchingTrips = rides.filter((r) => r.status === 'searching');

  if (searchingTrips.length === 0) {
    console.log('✓ No hay viajes en "searching" para limpiar.');
    return;
  }

  console.log(`Cancelando ${searchingTrips.length} viajes en estado "searching"...`);
  for (const st of searchingTrips) {
    await api(`/rides/${st.id}/cancel`, {
      method: 'POST',
      token: adminToken,
      body: {
        reason_code: 'admin_cancelled',
        notes: 'Limpieza previa para pruebas concurrentes',
      },
    });
  }
  console.log('✓ Limpieza completada exitosamente.\n');
}

// Monitoreo en vivo de los viajes disparados
async function watchTrips(results, seconds) {
  const activeTrips = results.filter((r) => r.status === 'searching' && r.tripId && r.token);
  if (activeTrips.length === 0) return;

  console.log(`\n⏱️ Monitoreando ${activeTrips.length} viajes concurrentes en vivo durante ${seconds}s...`);
  console.log('   (Podes aceptar cualquiera de ellos desde la app de conductor para verificar el flujo)');

  const deadline = Date.now() + seconds * 1000;
  const pollInterval = 3000;

  while (Date.now() < deadline) {
    let allFinished = true;

    for (const item of activeTrips) {
      if (['assigned', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed', 'cancelled'].includes(item.currentStatus)) {
        continue;
      }

      allFinished = false;
      const res = await api(`/rides/${item.tripId}`, { token: item.token });
      if (res.ok) {
        const trip = res.data?.data || {};
        const newStatus = trip.status;
        if (newStatus && newStatus !== item.currentStatus) {
          item.currentStatus = newStatus;
          const time = new Date().toLocaleTimeString();
          if (trip.driver_id) {
            console.log(`    🔔 [${time}] Viaje ${item.publicCode} ACEPTADO por conductor ${trip.driver_id}! Estado: ${newStatus}`);
          } else {
            console.log(`    ℹ️ [${time}] Viaje ${item.publicCode} cambió a estado: ${newStatus}`);
          }
        }
      }
    }

    if (allFinished) {
      console.log('✓ Todos los viajes han sido resueltos o cambiaron de estado.');
      break;
    }

    await sleep(pollInterval);
  }
}

function parseCliArgs() {
  const args = {
    instances: 3,
    staggerMs: 0,
    clusterOrigin: null, // { latitude, longitude, address_text }
    clean: false,
    watch: true,
    watchSeconds: 60,
  };

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--instances' || flag === '-n') {
      args.instances = Math.max(1, parseInt(argv[++i], 10) || 3);
    } else if (flag === '--stagger-ms') {
      args.staggerMs = Math.max(0, parseInt(argv[++i], 10) || 0);
    } else if (flag === '--cluster-origin') {
      const parts = (argv[++i] || '').split(',');
      if (parts.length >= 2) {
        args.clusterOrigin = {
          latitude: parseFloat(parts[0]),
          longitude: parseFloat(parts[1]),
          address_text: 'Cluster Cercano',
          place_id: 'cluster-origin',
        };
      }
    } else if (flag === '--clean') {
      args.clean = true;
    } else if (flag === '--no-watch') {
      args.watch = false;
    } else if (flag === '--watch-seconds') {
      args.watchSeconds = parseInt(argv[++i], 10) || 60;
    } else if (flag === '--help' || flag === '-h') {
      console.log(`
Uso: node scripts/dispatch_concurrent_trips.mjs [opciones]

Opciones:
  --instances, -n <numero>   Cantidad de instancias/pasajeros concurrentes (default: 3)
  --cluster-origin <lat,lng> Ubicación origen concentrada para todas las instancias (ej: -31.4508,-64.1205)
  --stagger-ms <ms>          Milisegundos de separación entre disparos (default: 0 = concurrencia simultánea)
  --clean                    Limpia/cancela viajes en 'searching' previos antes de disparar
  --no-watch                 No monitorea en vivo el estado tras despachar
  --watch-seconds <seg>      Segundos máximos de monitoreo en vivo (default: 60)
  --help, -h                 Muestra esta ayuda
      `);
      process.exit(0);
    }
  }

  return args;
}

async function main() {
  const options = parseCliArgs();

  console.log('===============================================================');
  console.log('🚀 TRANSFERBLACK - GENERADOR DE VIAJES CONCURRENTES');
  console.log('===============================================================');
  console.log(`API URL:        ${API_URL}`);
  console.log(`Instancias:     ${options.instances}`);
  console.log(`Concurrencia:   ${options.staggerMs === 0 ? 'Simultánea (Promise.all)' : `Escalonada (${options.staggerMs}ms)`}`);
  console.log(`Origen Clúster: ${options.clusterOrigin ? `${options.clusterOrigin.latitude}, ${options.clusterOrigin.longitude}` : 'Puntos distribuidos en Córdoba'}`);
  console.log(`Monitoreo:      ${options.watch ? `Activo (${options.watchSeconds}s)` : 'Desactivado'}`);
  console.log('---------------------------------------------------------------\n');

  if (options.clean) {
    await cleanupSearchingRides();
  }

  // Armar lista de instancias según la cantidad solicitada
  const instances = [];
  for (let i = 0; i < options.instances; i++) {
    let inst;
    if (i < BASE_INSTANCES.length) {
      inst = { ...BASE_INSTANCES[i] };
      if (options.clusterOrigin) {
        inst.origin = {
          ...options.clusterOrigin,
          latitude: Number((options.clusterOrigin.latitude + ((Math.random() - 0.5) * 0.005)).toFixed(6)),
          longitude: Number((options.clusterOrigin.longitude + ((Math.random() - 0.5) * 0.005)).toFixed(6)),
          address_text: `${options.clusterOrigin.address_text} (Instancia #${i + 1})`,
        };
      }
    } else {
      inst = createDynamicInstance(i, options.clusterOrigin);
    }
    instances.push(inst);
  }

  console.log(`🔥 Disparando ${instances.length} viajes en simultáneo...\n`);
  const startTime = Date.now();

  // Ejecución concurrente real
  const results = await Promise.all(
    instances.map((inst, index) => executePassengerRide(inst, index, instances.length, options))
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n===============================================================');
  console.log(`📊 RESUMEN DE DISPARO CONCURRENTE (${durationSec}s)`);
  console.log('===============================================================');

  const tableData = results.map((r) => ({
    Instancia: r.name,
    Email: r.email,
    Estado: r.status,
    'Trip ID': r.tripId ? `${r.tripId.slice(0, 8)}...` : 'N/A',
    Código: r.publicCode || 'N/A',
    PIN: r.boardingPin || 'N/A',
    Tarifa: r.amount || 'N/A',
    Ofertas: r.offersCreated,
  }));

  console.table(tableData);

  const successful = results.filter((r) => r.status === 'searching').length;
  console.log(`\nTotal exitosos: ${successful} / ${results.length}`);

  if (options.watch && successful > 0) {
    await watchTrips(results, options.watchSeconds);
  }

  console.log('\n🏁 Script finalizado.\n');
}

main().catch((err) => {
  console.error('\n💥 Error fatal:', err);
  process.exit(1);
});
