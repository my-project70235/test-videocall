const { io } = require('socket.io-client');
const os = require('os');

// Get network IP
const networkInterfaces = os.networkInterfaces();
let networkIP = null;

Object.keys(networkInterfaces).forEach(interfaceName => {
  networkInterfaces[interfaceName].forEach(interface => {
    if (interface.family === 'IPv4' && !interface.internal) {
      if (!networkIP) {
        networkIP = interface.address;
      }
    }
  });
});

const serverUrl = networkIP ? `http://${networkIP}:5000` : 'http://localhost:5000';

console.log(`🔍 Testing socket connection to: ${serverUrl}`);

// Test socket connection
const socket = io(serverUrl, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Socket connected successfully!');
  console.log(`📡 Socket ID: ${socket.id}`);
  
  // Test joining a room
  socket.emit('join', 'test-user-123');
  console.log('📤 Sent join event for test user');
  
  // Test call-user event
  setTimeout(() => {
    console.log('📞 Testing call-user event...');
    socket.emit('call-user', {
      calleeID: 'test-callee',
      roomID: 'test-room-123',
      callerID: 'test-caller',
      callerName: 'Test Caller',
      callerImage: null
    });
  }, 2000);
  
  // Disconnect after 5 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection failed:', error.message);
  console.log('\n💡 Troubleshooting tips:');
  console.log('1. Make sure backend server is running');
  console.log('2. Check if firewall is blocking the connection');
  console.log('3. Verify the server is bound to 0.0.0.0 (all interfaces)');
  console.log('4. Try accessing the server URL in browser first');
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

socket.on('updateOnlineUsers', (users) => {
  console.log('👥 Online users update received:', users);
});

socket.on('incoming-call', (data) => {
  console.log('📞 Incoming call received:', data);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout');
  process.exit(1);
}, 10000);