import fs from 'node:fs';
import path from 'node:path';
import { io } from 'socket.io-client';

// 1. Leer URL del backend desde el .env del frontend (respetando la convención del proyecto)
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
const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '');

// Conductores conocidos para forzar a offline (todos excepto jpmedinagomez1@gmail.com)
const DRIVERS_TO_OFFLINE = [
  { email: 'martin@demo.transferblack.com', password: 'Demo1234' },
  { email: 'lucia@demo.transferblack.com', password: 'Demo1234' },
  { email: 'diego@demo.transferblack.com', password: 'Demo1234' },
  { email: 'sofia@demo.transferblack.com', password: 'Demo1234' },
  { email: 'conductor.test@transferblack.com', password: 'Test1234' },
  { email: 'prueba1@gmail.com', password: 'Prueba123' },
];

const TARGET_ONLINE_DRIVER = 'jpmedinagomez1@gmail.com';

async function setDriverOffline(driver) {
  try {
    console.log(`\nIniciando proceso para: ${driver.email}...`);
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: driver.email, password: driver.password }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn(`[!] No se pudo iniciar sesión con ${driver.email} (${res.status}):`, data.error?.message || data);
      return false;
    }

    const token = data.data?.tokens?.access_token;
    if (!token) {
      console.warn(`[!] No se recibió token para ${driver.email}`);
      return false;
    }

    // Conectar socket (el servidor lo marca ONLINE) y desconectar (el servidor lo marca OFFLINE)
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Timeout esperando conexión socket'));
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    // Desconectar inmediatamente para activar setAvailabilityStatusIfNot -> OFFLINE en el backend
    socket.disconnect();
    console.log(`[✓] ${driver.email} puesto en OFFLINE exitosamente.`);
    return true;
  } catch (error) {
    console.error(`[X] Error procesando ${driver.email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('====================================================');
  console.log('   TRANSFERBLACK - PONER CONDUCTORES EN OFFLINE');
  console.log('====================================================');
  console.log(`API URL:    ${API_URL}`);
  console.log(`SOCKET URL: ${SOCKET_URL}`);
  console.log(`Conductor exceptuado (debe quedar online): ${TARGET_ONLINE_DRIVER}`);
  console.log('----------------------------------------------------');

  let successCount = 0;
  for (const driver of DRIVERS_TO_OFFLINE) {
    if (driver.email.toLowerCase() === TARGET_ONLINE_DRIVER.toLowerCase()) {
      console.log(`\n[-] Saltando conductor exceptuado: ${driver.email}`);
      continue;
    }
    const ok = await setDriverOffline(driver);
    if (ok) successCount++;
  }

  console.log('\n====================================================');
  console.log(`Proceso finalizado. Conductores pasados a offline: ${successCount}/${DRIVERS_TO_OFFLINE.length}`);
  console.log(`El único conductor habilitado en la zona debe ser: ${TARGET_ONLINE_DRIVER}`);
  console.log('====================================================\n');
}

main().catch(console.error);
