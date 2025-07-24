const { io } = require('socket.io-client');

const SERVER_URL = 'http://192.168.101.176:5000';

console.log('🧪 Testing Video Call Functionality');
console.log(`🔗 Server URL: ${SERVER_URL}`);

// Create two socket connections to simulate two users
const user1Socket = io(SERVER_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  query: { userId: 'user1' }
});

const user2Socket = io(SERVER_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  query: { userId: 'user2' }
});

let connectionsReady = 0;

function checkReady() {
  connectionsReady++;
  if (connectionsReady === 2) {
    console.log('✅ Both users connected, starting test...');
    startVideoCallTest();
  }
}

// User 1 connection
user1Socket.on('connect', () => {
  console.log('👤 User 1 connected:', user1Socket.id);
  user1Socket.emit('join', 'user1');
  checkReady();
});

// User 2 connection
user2Socket.on('connect', () => {
  console.log('👤 User 2 connected:', user2Socket.id);
  user2Socket.emit('join', 'user2');
  checkReady();
});

// User 2 listens for incoming calls
user2Socket.on('incoming-call', (data) => {
  console.log('📞 User 2 received incoming call:', data);
  
  // Simulate accepting the call after 2 seconds
  setTimeout(() => {
    console.log('✅ User 2 accepting call...');
    user2Socket.emit('call-accepted', {
      callerID: data.callerID,
      roomID: data.roomID,
      calleeID: 'user2'
    });
  }, 2000);
});

// User 1 listens for call accepted
user1Socket.on('call-accepted', (data) => {
  console.log('🎉 User 1 received call accepted:', data);
  console.log('✅ Video call test successful!');
  
  // Clean up
  setTimeout(() => {
    user1Socket.disconnect();
    user2Socket.disconnect();
    process.exit(0);
  }, 1000);
});

// Error handlers
user1Socket.on('connect_error', (error) => {
  console.error('❌ User 1 connection failed:', error.message);
});

user2Socket.on('connect_error', (error) => {
  console.error('❌ User 2 connection failed:', error.message);
});

function startVideoCallTest() {
  console.log('📞 User 1 initiating video call to User 2...');
  
  user1Socket.emit('call-user', {
    calleeID: 'user2',
    roomID: 'test-room-123',
    callerID: 'user1',
    callerName: 'Test User 1',
    callerImage: null
  });
}

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - something went wrong');
  console.log('💡 Check if:');
  console.log('  - Backend server is running on 192.168.101.176:5000');
  console.log('  - Firewall allows connections on port 5000');
  console.log('  - Both devices are on the same network');
  process.exit(1);
}, 15000);