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
    console.log('Adding associated_doctor_id to ambulance_providers...');
    await executeSql(`
      ALTER TABLE public.ambulance_providers 
      ADD COLUMN IF NOT EXISTS associated_doctor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    `);
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
