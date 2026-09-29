import pg from 'file:///C:/Users/Juampi/Downloads/Programacion/react-native/freelance/Transfer-Black/backend/node_modules/pg/lib/index.js';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.oqdbvkazqomfvfwkkwca:transfer-black123!@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const userRes = await client.query(`
    SELECT u.id as user_id, u.email, dp.*
    FROM app.users u
    LEFT JOIN app.driver_profiles dp ON dp.id = u.id
    WHERE u.email = 'jpmedinagomez1@gmail.com'
  `);
  console.log('User & Driver Profile:', JSON.stringify(userRes.rows, null, 2));

  if (userRes.rows.length > 0) {
    const userId = userRes.rows[0].user_id;
    const vehicleRes = await client.query(`
      SELECT *
      FROM app.vehicles
      WHERE driver_id = $1
    `, [userId]);
    console.log('Vehicles:', JSON.stringify(vehicleRes.rows, null, 2));
  }
  await client.end();
}

main().catch(console.error);
