const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';

const sql = `
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
`;

async function fixRLS() {
  const client = new Client({
    connectionString: `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    const res = await client.query(sql);
    console.log("Policies dropped successfully:", res);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end().catch(() => {});
  }
}

fixRLS();
