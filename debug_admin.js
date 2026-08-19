const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zcxwvgbbmmypmmvfawxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHd2Z2JibW15cG1tdmZhd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5Nzk3NTMsImV4cCI6MjEwMjU1NTc1M30.F7EBWxAqxk2zkVp6gMgx77KEbt0T6tiZhZenQESwmPs';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetchRole() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@medocare.com',
    password: '@Yush_007*@'
  });

  if (authError) {
    console.error('Login error:', authError.message);
    return;
  }

  console.log('Logged in user ID:', authData.user.id);

  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  console.log('Profile fetch result:');
  console.log('Data:', profile);
  console.log('Error:', profError);
}

testFetchRole();
