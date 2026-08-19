const https = require('https');
const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const connectionString = `postgresql://postgres.zcxwvgbbmmypmmvfawxo:%40Yush_007%2A%40@${host}:6543/postgres`;
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHd2Z2JibW15cG1tdmZhd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5Nzk3NTMsImV4cCI6MjEwMjU1NTc1M30.F7EBWxAqxk2zkVp6gMgx77KEbt0T6tiZhZenQESwmPs';

async function executeSql(query) {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(query);
  await client.end();
  return res;
}

function signUpUser() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: 'admin@medocare.com',
      password: '@Yush_007*@'
    });

    const options = {
      hostname: 'zcxwvgbbmmypmmvfawxo.supabase.co',
      port: 443,
      path: '/auth/v1/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', error => reject(error));
    req.write(data);
    req.end();
  });
}

async function nukeAndFix() {
  try {
    console.log('1. Dropping ALL auth triggers to prevent ANY database errors during signup...');
    await executeSql("DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;");
    await executeSql("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;");

    console.log('2. Deleting old bad admin user via SQL...');
    await executeSql("DELETE FROM auth.users WHERE email = 'admin@medocare.com'");
    await executeSql("DELETE FROM public.profiles WHERE email = 'admin@medocare.com'");
    
    console.log('3. Signing up admin user via perfectly clean Supabase API...');
    const signupRes = await signUpUser();
    console.log('Signup Status:', signupRes.status);
    console.log('Signup Response:', signupRes.body);
    
    // Sleep for 2 seconds
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('4. Fetching the new admin user ID...');
    const res = await executeSql("SELECT id FROM auth.users WHERE email = 'admin@medocare.com'");
    if (res.rows.length === 0) {
      throw new Error('Admin user was not created in auth.users!');
    }
    const adminId = res.rows[0].id;
    
    console.log('5. Manually creating profile and confirming email...');
    await executeSql(`
      INSERT INTO public.profiles (id, email, full_name, role) 
      VALUES ('${adminId}', 'admin@medocare.com', 'System Admin', 'admin')
    `);
    await executeSql(`UPDATE auth.users SET email_confirmed_at = now() WHERE id = '${adminId}'`);
    
    console.log('6. Re-enabling the profiles trigger...');
    await executeSql(`
      create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
    `);
    
    console.log('Done! Admin should 100% work now.');
  } catch (err) {
    console.error('Error:', err);
  }
}

nukeAndFix();
