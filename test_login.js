const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// load env vars from .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@medocare.com',
    password: '@Yush_007*@'
  });

  if (error) {
    console.error('Login error:', error);
    return;
  }
  
  console.log('Logged in user ID:', data.user.id);
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('Profile error:', profileError);
  } else {
    console.log('Profile fetched:', profile);
  }
}

testLogin();
