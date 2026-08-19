const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHd2Z2JibW15cG1tdmZhd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5Nzk3NTMsImV4cCI6MjEwMjU1NTc1M30.F7EBWxAqxk2zkVp6gMgx77KEbt0T6tiZhZenQESwmPs';

const data = JSON.stringify({
  email: 'testpatient@medocare.com',
  password: 'password123',
  data: {
    full_name: 'Test Patient',
    role: 'patient'
  }
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
    console.log('Status Code:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
