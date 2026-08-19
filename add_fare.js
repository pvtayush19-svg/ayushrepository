const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';

const sql = `
CREATE TABLE IF NOT EXISTS public.ambulance_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  ambulance_id uuid REFERENCES public.ambulance_providers(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'en_route', 'completed', 'cancelled')) DEFAULT 'pending',
  pickup_lat double precision,
  pickup_lng double precision,
  fare numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ambulance_bookings ADD COLUMN IF NOT EXISTS fare numeric;
ALTER TABLE public.ambulance_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own bookings" ON public.ambulance_bookings;
CREATE POLICY "Users can read their own bookings" 
ON public.ambulance_bookings FOR SELECT 
USING (auth.uid() = patient_id OR auth.uid() IN (SELECT profile_id FROM public.ambulance_providers WHERE id = ambulance_bookings.ambulance_id));

DROP POLICY IF EXISTS "Patients can insert bookings" ON public.ambulance_bookings;
CREATE POLICY "Patients can insert bookings" 
ON public.ambulance_bookings FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.ambulance_bookings;
CREATE POLICY "Users can update their own bookings" 
ON public.ambulance_bookings FOR UPDATE 
USING (auth.uid() = patient_id OR auth.uid() IN (SELECT profile_id FROM public.ambulance_providers WHERE id = ambulance_bookings.ambulance_id));

DO $$
BEGIN
  -- try to add to publication if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ambulance_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulance_bookings;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore error if publication doesn't exist
END $$;
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
