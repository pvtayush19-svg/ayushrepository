const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';

const sql = `
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.ambulance_bookings;

CREATE POLICY "Users can update their own bookings" 
ON public.ambulance_bookings FOR UPDATE 
USING (
  auth.uid() = patient_id OR 
  ambulance_id IN (SELECT id FROM public.ambulance_providers WHERE profile_id = auth.uid())
)
WITH CHECK (
  auth.uid() = patient_id OR 
  ambulance_id IN (SELECT id FROM public.ambulance_providers WHERE profile_id = auth.uid())
);
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
    console.log('Connected on 6543! Executing SQL...');
    await client.query(sql);
    console.log('Applied successfully!');
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
      console.log('Applied successfully!');
    } catch (err2) {
      console.error('Error on 5432:', err2.message);
    }
  } finally {
    await client.end().catch(() => {});
    process.exit(0);
  }
}

upgradeDB();
