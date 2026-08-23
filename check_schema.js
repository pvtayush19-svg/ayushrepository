const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'doctors';
  `);
  console.log(res.rows);
  await client.end();
}
run();
