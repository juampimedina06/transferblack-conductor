
async function testWallet() {
  console.log('--- TEST: Bóveda Financiera (Billetera) ---');

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://transfer-black-api.onrender.com/api/v1';
  
  // 1. Iniciar sesión
  console.log('\n[1] Iniciando sesión...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'conductor.test@transferblack.com',
      password: 'Test1234'
    })
  });
  
  const loginData = await loginRes.json();
  if (loginRes.status !== 200) {
    console.log('Error login:', loginData);
    return;
  }
  const token = loginData.data.tokens.access_token;
  console.log('✅ Token obtenido');

  // 2. Obtener Bóveda
  console.log('\n[2] Obteniendo resumen de la bóveda (/driver/wallet)...');
  const walletRes = await fetch(`${API_URL}/driver/wallet`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const walletData = await walletRes.json();
  console.log('Status:', walletRes.status);
  console.log('Data:', JSON.stringify(walletData, null, 2));

  if (walletRes.status !== 200) return;

  const balance = parseFloat(walletData.data.balance);
  const isRestricted = walletData.data.is_cash_restricted;

  console.log(`\n=== ESTADO DEL CHOFER ===`);
  console.log(`💰 Saldo: $${balance}`);
  console.log(`⚠️ Restringido para Efectivo: ${isRestricted ? 'SÍ' : 'NO'}`);
  console.log(`✅ Habilitado para Viajes: ${walletData.data.can_accept_trips ? 'SÍ' : 'NO'}`);

  // 3. Simular un intento de retiro
  console.log('\n[3] Solicitando retiro...');
  if (balance <= 0) {
    console.log('❌ El saldo es 0 o negativo. No se puede solicitar retiro por API, se espera que falle.');
    const failPayoutRes = await fetch(`${API_URL}/driver/wallet/payouts`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 1000 })
    });
    console.log('Status:', failPayoutRes.status);
    console.log('Respuesta (debería ser error):', await failPayoutRes.json());
  } else {
    console.log(`✅ Saldo positivo ($${balance}). Solicitando retiro de $${balance}...`);
    const payoutRes = await fetch(`${API_URL}/driver/wallet/payouts`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: balance })
    });
    
    console.log('Status:', payoutRes.status);
    console.log('Response:', await payoutRes.json());

    // 4. Volver a consultar la bóveda
    console.log('\n[4] Consultando bóveda después del retiro...');
    const refreshRes = await fetch(`${API_URL}/driver/wallet`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Nueva Bóveda:', JSON.stringify(await refreshRes.json(), null, 2));
  }
}

testWallet().catch(console.error);
