const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;

const sql = `
-- 1. Fix the Admin User
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Delete the faulty admin user if exists
  DELETE FROM auth.users WHERE email = 'admin@medocare.com';

  new_user_id := gen_random_uuid();
  
  -- Insert perfectly formatted GoTrue user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 'admin@medocare.com', 
    crypt('admin@1hai', gen_salt('bf')), now(), now(), 
    '{"provider":"email","providers":["email"]}', '{"role": "admin"}', now(), now(), 
    '', '', '', ''
  );
  
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
  VALUES (new_user_id::text, new_user_id, format('{"sub": "%s", "email": "admin@medocare.com"}', new_user_id)::jsonb, 'email', now(), now(), now(), new_user_id);
  
  -- Update profile to admin (the profile was auto-created by the handle_new_user trigger)
  UPDATE public.profiles SET role = 'admin' WHERE id = new_user_id;
END $$;

-- 2. Auto-Confirm Emails Trigger
-- This ensures any new patient or doctor registering doesn't need to click an email link.
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email();

-- 3. Also auto-confirm any existing users who are stuck
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
`;

async function fix() {
  console.log('Fixing auth...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Fixed successfully!');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

fix();
