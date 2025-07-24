const { io } = require('socket.io-client');
const http = require('http');
const fs = require('fs');

console.log('🏥 Health Check - Video Call System');
console.log('=====================================\n');

// Check 1: Environment Variables
console.log('1️⃣ Checking Environment Variables...');
const frontendEnv = fs.readFileSync('./social_media/src/.env', 'utf8');
const backendEnv = fs.readFileSync('./Backend/.env', 'utf8');

const serverUrl = frontendEnv.match(/REACT_APP_SERVER_URL = (.+)/)?.[1];
const host = backendEnv.match(/HOST=(.+)/)?.[1];

console.log(`   Frontend Server URL: ${serverUrl}`);
console.log(`   Backend Host: ${host}`);

if (serverUrl && host === '0.0.0.0') {
  console.log('   ✅ Environment variables configured correctly\n');
} else {
  console.log('   ❌ Environment variables not configured properly\n');
}

// Check 2: Server Accessibility
console.log('2️⃣ Checking Server Accessibility...');
const testUrl = serverUrl || 'http://localhost:5000';

http.get(`${testUrl}/test`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('   ✅ Backend server is accessible');
      console.log(`   Response: ${data}\n`);
      
      // Check 3: Socket Connection
      testSocketConnection();
    } else {
      console.log(`   ❌ Server returned status: ${res.statusCode}\n`);
    }
  });
}).on('error', (err) => {
  console.log(`   ❌ Cannot connect to server: ${err.message}`);
  console.log('   💡 Make sure backend server is running\n');
});

function testSocketConnection() {
  console.log('3️⃣ Testing Socket Connection...');
  
  const socket = io(testUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    timeout: 5000
  });

  socket.on('connect', () => {
    console.log('   ✅ Socket connected successfully');
    console.log(`   Socket ID: ${socket.id}`);
    
    // Test joining room
    socket.emit('join', 'health-check-user');
    console.log('   📤 Sent join event');
    
    setTimeout(() => {
      socket.disconnect();
      console.log('   🔌 Socket disconnected\n');
      
      // Final summary
      printSummary();
    }, 2000);
  });

  socket.on('connect_error', (error) => {
    console.log(`   ❌ Socket connection failed: ${error.message}`);
    console.log('   💡 Check CORS configuration and server binding\n');
  });

  socket.on('updateOnlineUsers', (users) => {
    console.log(`   📊 Online users update received: ${users.length} users`);
  });
}

function printSummary() {
  console.log('📋 Health Check Summary');
  console.log('=======================');
  console.log('✅ System Status: Ready for cross-device video calls');
  console.log('\n🚀 Next Steps:');
  console.log('1. Start backend: cd Backend && npm start');
  console.log('2. Start frontend: cd social_media && npm start');
  console.log(`3. Access from other devices: ${testUrl.replace(':5000', ':3000')}`);
  console.log('\n🔧 If issues persist:');
  console.log('- Check firewall settings (ports 3000, 5000)');
  console.log('- Ensure devices are on same network');
  console.log('- Run: node debug-socket.js for detailed testing');
  
  process.exit(0);
}

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Health check timeout');
  process.exit(1);
}, 10000);