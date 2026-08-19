const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;

const sql = `
-- 1. Add is_available column to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- 2. Add media columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 3. Drop policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Public Access to Image" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to Image" ON storage.objects;

-- 4. Create policy to allow public access to Image
CREATE POLICY "Public Access to Image"
ON storage.objects FOR SELECT
USING (bucket_id = 'Image');

-- 5. Create policy to allow authenticated users to upload to Image
CREATE POLICY "Authenticated users can upload to Image"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'Image' 
    AND auth.role() = 'authenticated'
);
`;

async function upgradeDB() {
  console.log('Connecting to database on 6543...');
  let client = new Client({
    connectionString,
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
    const connectionString5432 = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`;
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
