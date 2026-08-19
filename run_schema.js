const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;

async function tryConnect() {
  const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`Connecting to ${host}...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`Connected successfully!`);
    
    console.log('Executing schema...');
    await client.query(schemaSql);
    console.log('Schema executed successfully!');
    
    console.log('Creating admin user via SQL...');
    const adminSql = `
      DO $$
      DECLARE
        new_user_id uuid;
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@medocare.com') THEN
          new_user_id := gen_random_uuid();
          
          INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            confirmation_token, recovery_token, email_change_token_new, email_change
          )
          VALUES (
            new_user_id, '00000000-0000-0000-0000-000000000000', 'admin@medocare.com', crypt('admin@1hai', gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
            '', '', '', ''
          );
          
          INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
          VALUES (new_user_id::text, new_user_id, format('{"sub": "%s", "email": "admin@medocare.com"}', new_user_id)::jsonb, 'email', now(), now(), now(), new_user_id);
          
          UPDATE public.profiles SET role = 'admin' WHERE id = new_user_id;
        END IF;
      END $$;
    `;
    await client.query(adminSql);
    console.log('Admin user created successfully!');
    
  } catch (err) {
    console.error(`Error executing script:`, err);
  } finally {
    await client.end();
  }
}

tryConnect();
