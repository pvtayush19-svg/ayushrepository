const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;

async function executeSql(query) {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(query);
  await client.end();
  return res;
}

async function run() {
  try {
    const res = await executeSql(`SELECT id, email, role FROM public.profiles WHERE email = 'admin@medocare.com'`);
    console.log('Profile:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
