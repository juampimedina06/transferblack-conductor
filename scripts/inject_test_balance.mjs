import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from '../../Transfer-Black/backend/node_modules/pg/lib/index.js';

async function injectBalance(amount = '25000.00') {
  console.log(`--- Acreditando $${amount} ARS de saldo a favor al chofer ---`);

  const envContent = fs.readFileSync('../Transfer-Black/backend/.env', 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (!match) throw new Error('No se encontró DATABASE_URL');

  const connectionString = match[1].trim();
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const driverId = 'e78d1d97-7495-4cb4-b591-2e054c2c7fe5'; // conductor.test@transferblack.com
  const adminId = '33024af9-3a64-46aa-844a-a57e9953784c';

  const entryGroupId = crypto.randomUUID();
  const reference = `manual_adjustment:${crypto.randomUUID()}`;
  const notes = 'Carga de saldo de prueba por administración para probar retiros';

  try {
    await client.query('BEGIN');

    // 1. Renglón chofer (+ amount)
    await client.query(
      `INSERT INTO app.wallet_transactions (
        id, entry_group_id, entry_type, account_type, account_id,
        amount, currency, reference, actor_user_id, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        crypto.randomUUID(),
        entryGroupId,
        'manual_adjustment',
        'driver',
        driverId,
        amount,
        'ARS',
        reference,
        adminId,
        notes,
      ]
    );

    // 2. Renglón plataforma (- amount) para partida doble (suma cero)
    await client.query(
      `INSERT INTO app.wallet_transactions (
        id, entry_group_id, entry_type, account_type, account_id,
        amount, currency, reference, actor_user_id, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        crypto.randomUUID(),
        entryGroupId,
        'manual_adjustment',
        'platform',
        null,
        `-${amount}`,
        'ARS',
        reference,
        adminId,
        notes,
      ]
    );

    await client.query('COMMIT');
    console.log(`✅ Asiento contable registrado con éxito (+ $${amount} ARS).`);

    // Consultar el saldo resultante por la API
    const res = await fetch('https://transfer-black-api.onrender.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'conductor.test@transferblack.com', password: 'Test1234' }),
    });
    const login = await res.json();
    const token = login.data?.tokens?.access_token;

    const walletRes = await fetch('https://transfer-black-api.onrender.com/api/v1/driver/wallet', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const wallet = await walletRes.json();
    console.log('\n=== NUEVO ESTADO DE LA BÓVEDA ===');
    console.log(`💰 Saldo actual: $${wallet.data.balance} ARS`);
    console.log(`✨ Habilitado para retiros: ${parseFloat(wallet.data.balance) > 0 ? 'SÍ' : 'NO'}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inyectando saldo:', error);
  } finally {
    await client.end();
  }
}

injectBalance();
