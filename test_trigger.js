const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;

async function testInsert() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("DELETE FROM auth.users WHERE email = 'testtrigger@medocare.com'");
    await client.query(`
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
      VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'testtrigger@medocare.com', 'foo', now(), '{}', '{}', now(), now(), '', '', '', '')
    `);
    console.log('Insert succeeded!');
  } catch(e) {
    console.error('Trigger Exception:', e.message);
  } finally {
    await client.end();
  }
}

testInsert();
