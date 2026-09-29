const passwords = ['Demo1234', '123456', '12345678', 'Admin123456!', 'Juampi123', 'Juampi123!'];

async function testPasswords() {
  for (const pwd of passwords) {
    const res = await fetch('https://transfer-black-api.onrender.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jpmedinagomez1@gmail.com',
        password: pwd
      })
    });
    const data = await res.json();
    if (res.status === 200) {
      console.log(`Password is: ${pwd}`);
      console.log('Login data:', JSON.stringify(data, null, 2));
      const token = data.data?.tokens?.access_token;
      
      const meRes = await fetch('https://transfer-black-api.onrender.com/api/v1/driver/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('GET /driver/me status:', meRes.status);
      const meData = await meRes.json();
      console.log('GET /driver/me data:', JSON.stringify(meData, null, 2));
      return;
    }
  }
  console.log('None of the common passwords matched.');
}

testPasswords();
