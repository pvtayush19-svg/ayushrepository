const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;

async function fixTrigger() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const sql = `
    create or replace function public.handle_new_user()
    returns trigger as $$
    begin
      insert into public.profiles (id, email, full_name, role)
      values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role)
      );
      return new;
    end;
    $$ language plpgsql security definer set search_path = public;
  `;
  
  try {
    await client.query(sql);
    console.log('Trigger fixed!');
  } catch (err) {
    console.error('Error fixing trigger:', err);
  } finally {
    await client.end();
  }
}

fixTrigger();
