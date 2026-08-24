const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';

const sql = `
-- 1. Function to enforce one active booking per patient
CREATE OR REPLACE FUNCTION check_active_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ambulance_bookings 
    WHERE patient_id = NEW.patient_id 
    AND status IN ('pending', 'accepted', 'en_route')
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Patient already has an active emergency booking.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_single_booking ON public.ambulance_bookings;

-- 3. Create the trigger
CREATE TRIGGER enforce_single_booking
BEFORE INSERT ON public.ambulance_bookings
FOR EACH ROW EXECUTE PROCEDURE check_active_bookings();

-- 4. Tighten Insert Policy to ensure they can't book on behalf of someone else
DROP POLICY IF EXISTS "Patients can insert bookings" ON public.ambulance_bookings;
CREATE POLICY "Patients can insert bookings" 
ON public.ambulance_bookings FOR INSERT 
WITH CHECK (
  auth.uid() = patient_id 
  AND 
  NOT EXISTS (
    SELECT 1 FROM public.ambulance_bookings 
    WHERE patient_id = auth.uid() 
    AND status IN ('pending', 'accepted', 'en_route')
  )
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
    console.log('Database upgrade applied successfully! DoS protections in place.');
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
      console.log('Connected on 5432! Executing SQL...');
      await client.query(sql);
      console.log('Database upgrade applied successfully! DoS protections in place.');
    } catch (err2) {
      console.error('Error on 5432:', err2.message);
    }
  } finally {
    await client.end().catch(() => {});
    process.exit(0);
  }
}

upgradeDB();
