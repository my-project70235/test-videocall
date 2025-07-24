const http = require('http');
const os = require('os');

// Get all network interfaces
const interfaces = os.networkInterfaces();
console.log('🌐 Available Network Interfaces:');
Object.keys(interfaces).forEach(name => {
  interfaces[name].forEach(interface => {
    if (interface.family === 'IPv4') {
      console.log(`   ${name}: ${interface.address} ${interface.internal ? '(internal)' : '(external)'}`);
    }
  });
});

// Test different URLs
const testUrls = [
  'http://localhost:5000/test',
  'http://127.0.0.1:5000/test',
  'http://192.168.101.176:5000/test'
];

console.log('\n🔍 Testing Server Connectivity:');

testUrls.forEach((url, index) => {
  setTimeout(() => {
    console.log(`\nTesting: ${url}`);
    
    const request = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${url} - Status: ${res.statusCode}`);
        console.log(`   Response: ${data}`);
      });
    });

    request.on('error', (err) => {
      console.log(`❌ ${url} - Error: ${err.message}`);
    });

    request.setTimeout(3000, () => {
      console.log(`⏰ ${url} - Timeout`);
      request.destroy();
    });
  }, index * 1000);
});

// Check if port 5000 is in use
setTimeout(() => {
  console.log('\n🔍 Checking if port 5000 is available...');
  
  const server = http.createServer();
  server.listen(5001, '0.0.0.0', () => {
    console.log('✅ Port binding test successful - server can bind to all interfaces');
    server.close();
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('✅ Port 5000 area is in use (good - your backend might be running)');
    } else {
      console.log(`❌ Port binding error: ${err.message}`);
    }
  });
}, 4000);

setTimeout(() => {
  console.log('\n📋 Diagnosis Complete');
  process.exit(0);
}, 6000);