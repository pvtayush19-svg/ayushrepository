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
      password: '@Yush_007*@',
      data: { full_name: 'System Admin' }
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

async function fixAdmin() {
  try {
    console.log('1. Deleting old bad admin user via SQL...');
    await executeSql("DELETE FROM auth.users WHERE email = 'admin@medocare.com'");
    
    console.log('2. Signing up admin user via Supabase API (this ensures perfectly correct password hashing)...');
    const signupRes = await signUpUser();
    console.log('Signup Status:', signupRes.status);
    console.log('Signup Response:', signupRes.body);
    
    // Sleep for 2 seconds to ensure Supabase handles the database inserts
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('3. Elevating role to admin in profiles table...');
    await executeSql("UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@medocare.com'");
    
    // Also explicitly confirm the email just in case the trigger didn't fire correctly for API calls
    await executeSql("UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'admin@medocare.com'");
    
    console.log('Done! Admin is fixed properly.');
  } catch (err) {
    console.error('Error:', err);
  }
}

fixAdmin();
