import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.oqdbvkazqomfvfwkkwca:transfer-black123!@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT dl.driver_id, 
           ST_X(dl.location::geometry) as lng, 
           ST_Y(dl.location::geometry) as lat,
           dl.updated_at,
           dp.availability_status
    FROM app.driver_locations dl
    JOIN app.driver_profiles dp ON dp.id = dl.driver_id
    WHERE dl.driver_id = '645b08f9-93b5-48a9-93d8-ec376107c57e'
  `);
  console.log('Driver location in DB:', JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
