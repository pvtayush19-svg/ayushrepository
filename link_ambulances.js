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
    console.log('Linking an ambulance to doctors so the feature works...');
    // We will assign the first ambulance provider to ALL doctors for testing purposes
    // Or just link them randomly.
    await executeSql(`
      UPDATE public.ambulance_providers
      SET associated_doctor_id = (SELECT profile_id FROM public.doctors LIMIT 1)
      WHERE associated_doctor_id IS NULL;
    `);
    
    // Better yet, just take any doctor and any ambulance and link them, or 
    // link ambulance 1 to doctor 1, etc. Let's just do a naive update where we assign a doctor to ambulance providers.
    await executeSql(`
        WITH RankedDoctors AS (
            SELECT profile_id, ROW_NUMBER() OVER(ORDER BY profile_id) as rn
            FROM public.doctors
        ),
        RankedAmbulances AS (
            SELECT id, ROW_NUMBER() OVER(ORDER BY id) as rn
            FROM public.ambulance_providers
        )
        UPDATE public.ambulance_providers a
        SET associated_doctor_id = d.profile_id
        FROM RankedAmbulances ra
        JOIN RankedDoctors d ON ra.rn = d.rn
        WHERE a.id = ra.id;
    `);

    // If there are more doctors than ambulances, some doctors might not get one.
    // Let's just map the first ambulance to ALL doctors if they don't have one, just so the demo works.
    await executeSql(`
      UPDATE public.ambulance_providers 
      SET associated_doctor_id = (SELECT profile_id FROM public.doctors LIMIT 1)
      WHERE associated_doctor_id IS NULL;
    `);
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
