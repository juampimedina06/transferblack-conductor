import jwt from 'file:///C:/Users/Juampi/Downloads/Programacion/react-native/freelance/Transfer-Black/backend/node_modules/jsonwebtoken/index.js';

const token = jwt.sign(
  { roles: ['driver'] },
  'transfer-black-local-secret-change-me',
  {
    algorithm: 'HS256',
    subject: '645b08f9-93b5-48a9-93d8-ec376107c57e',
    issuer: 'transfer-black-api',
    audience: 'transfer-black-clients',
    expiresIn: 3600,
  }
);

async function testMe() {
  const res = await fetch('https://transfer-black-api.onrender.com/api/v1/driver/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

testMe();
