const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zcxwvgbbmmypmmvfawxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHd2Z2JibW15cG1tdmZhd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5Nzk3NTMsImV4cCI6MjEwMjU1NTc1M30.F7EBWxAqxk2zkVp6gMgx77KEbt0T6tiZhZenQESwmPs';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'testpatient@medocare.com', // Replace with their patient ID if needed
    password: 'password123'
  });

  if (error) {
    console.error('Login error:', error.message);
    return;
  }

  console.log('Logged in user ID:', data.user.id);

  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  console.log('Profile data:', profile);
  console.log('Profile error:', profError);
}

testLogin();
