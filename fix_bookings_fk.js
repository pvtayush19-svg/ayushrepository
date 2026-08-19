const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';

const sql = `
ALTER TABLE public.ambulance_bookings
  DROP CONSTRAINT IF EXISTS ambulance_bookings_patient_id_fkey;

ALTER TABLE public.ambulance_bookings
  ADD CONSTRAINT ambulance_bookings_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
`;

async function upgradeDB() {
  console.log('Connecting to database on 6543...');
  let client = new Client({
    connectionString: `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log('Connected on 6543! Executing upgrade SQL...');
    await client.query(sql);
    console.log('Database upgrade applied successfully!');
  } catch (err) {
    console.error('Error on 6543, trying 5432...', err.message);
    const connectionString5432 = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:5432/postgres`;
    client = new Client({
      connectionString: connectionString5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    try {
      await client.connect();
      console.log('Connected on 5432! Executing...');
      await client.query(sql);
      console.log('Database upgrade applied successfully!');
    } catch (err2) {
      console.error('Error on 5432:', err2.message);
    }
  } finally {
    await client.end().catch(() => {});
    process.exit(0);
  }
}

upgradeDB();
