import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcxwvgbbmmypmmvfawxo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHd2Z2JibW15cG1tdmZhd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5Nzk3NTMsImV4cCI6MjEwMjU1NTc1M30.F7EBWxAqxk2zkVp6gMgx77KEbt0T6tiZhZenQESwmPs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateBucket() {
  console.log("Attempting to create bucket...");
  const { data, error } = await supabase.storage.createBucket('chat_media', {
    public: true,
  });
  
  if (error) {
    console.error("Error creating bucket:", error.message);
  } else {
    console.log("Bucket created successfully!", data);
  }
}

testCreateBucket();
