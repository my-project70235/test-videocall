const os = require('os');
const fs = require('fs');
const path = require('path');

// Get network interfaces
const networkInterfaces = os.networkInterfaces();
let networkIP = null;

// Find the first non-internal IPv4 address
Object.keys(networkInterfaces).forEach(interfaceName => {
  networkInterfaces[interfaceName].forEach(interface => {
    if (interface.family === 'IPv4' && !interface.internal) {
      if (!networkIP) {
        networkIP = interface.address;
      }
    }
  });
});

if (networkIP) {
  console.log(`🌐 Network IP detected: ${networkIP}`);
  
  // Update frontend .env file
  const frontendEnvPath = path.join(__dirname, 'social_media', 'src', '.env');
  let frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf8');
  
  // Replace the server URL
  frontendEnvContent = frontendEnvContent.replace(
    /REACT_APP_SERVER_URL = .*/,
    `REACT_APP_SERVER_URL = http://${networkIP}:5000`
  );
  
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log(`✅ Updated frontend .env with network IP: http://${networkIP}:5000`);
  
  // Update backend .env file
  const backendEnvPath = path.join(__dirname, 'Backend', '.env');
  let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
  
  // Add HOST configuration if not exists
  if (!backendEnvContent.includes('HOST=')) {
    backendEnvContent += `\nHOST=0.0.0.0\n`;
  } else {
    backendEnvContent = backendEnvContent.replace(/HOST=.*/, 'HOST=0.0.0.0');
  }
  
  fs.writeFileSync(backendEnvPath, backendEnvContent);
  console.log(`✅ Updated backend .env to bind to all interfaces`);
  
  console.log('\n📋 Setup Complete!');
  console.log('🔧 Next steps:');
  console.log('1. Restart your backend server');
  console.log('2. Restart your frontend server');
  console.log(`3. Access your app from other devices using: http://${networkIP}:3000`);
  console.log(`4. Backend API will be available at: http://${networkIP}:5000`);
  console.log('\n⚠️  Make sure your firewall allows connections on ports 3000 and 5000');
  
} else {
  console.log('❌ No network IP found. Make sure you are connected to a network.');
  console.log('💡 You can manually set the IP in the .env files:');
  console.log('   Frontend: social_media/src/.env -> REACT_APP_SERVER_URL');
  console.log('   Backend: Backend/.env -> HOST=0.0.0.0');
}