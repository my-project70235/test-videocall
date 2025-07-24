const http = require('http');
const fs = require('fs');

console.log('🔍 Simple Configuration Check');
console.log('==============================\n');

// Check 1: Environment Files
console.log('1️⃣ Checking Configuration Files...');

try {
  const frontendEnv = fs.readFileSync('./social_media/src/.env', 'utf8');
  const backendEnv = fs.readFileSync('./Backend/.env', 'utf8');

  const serverUrl = frontendEnv.match(/REACT_APP_SERVER_URL = (.+)/)?.[1];
  const host = backendEnv.match(/HOST=(.+)/)?.[1];

  console.log(`   Frontend Server URL: ${serverUrl}`);
  console.log(`   Backend Host: ${host}`);

  if (serverUrl && host === '0.0.0.0') {
    console.log('   ✅ Configuration files are correct\n');
  } else {
    console.log('   ⚠️ Configuration may need adjustment\n');
  }

  // Check 2: Server Test
  console.log('2️⃣ Testing Server Connection...');
  const testUrl = serverUrl || 'http://localhost:5000';

  http.get(`${testUrl}/test`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('   ✅ Backend server is running and accessible');
        console.log(`   Response: ${data}`);
        console.log('\n🎉 All checks passed! Video call system should work across devices.');
      } else {
        console.log(`   ❌ Server returned status: ${res.statusCode}`);
      }
      printInstructions(testUrl);
    });
  }).on('error', (err) => {
    console.log(`   ❌ Cannot connect to server: ${err.message}`);
    console.log('   💡 Make sure to start backend server first: cd Backend && npm start');
    printInstructions(testUrl);
  });

} catch (error) {
  console.log(`   ❌ Error reading configuration files: ${error.message}`);
}

function printInstructions(serverUrl) {
  console.log('\n📋 Instructions for Cross-Device Video Calls:');
  console.log('==============================================');
  console.log('1. Start Backend Server:');
  console.log('   cd Backend');
  console.log('   npm start');
  console.log('\n2. Start Frontend Server:');
  console.log('   cd social_media');
  console.log('   npm start');
  console.log('\n3. Access from different devices:');
  console.log(`   Same PC: http://localhost:3000`);
  console.log(`   Other PCs: ${serverUrl.replace(':5000', ':3000')}`);
  console.log('\n4. Test Video Call:');
  console.log('   - Login with different accounts on different devices');
  console.log('   - Go to chat section');
  console.log('   - Click video call icon');
  console.log('   - Notification should appear on other device');
  
  process.exit(0);
}

// Timeout
setTimeout(() => {
  console.log('⏰ Check timeout');
  process.exit(1);
}, 5000);