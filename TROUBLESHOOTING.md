# Video Call Troubleshooting Guide

## ✅ Issue Fixed!

Your video call notification system is now configured to work across different PCs on the same network.

## 🔧 What Was Fixed:

1. **Socket.io Connection**: Changed from hardcoded `localhost` to dynamic IP address
2. **Backend Server Binding**: Server now binds to `0.0.0.0` (all interfaces) instead of just localhost
3. **CORS Configuration**: Updated to allow connections from any IP on port 3000
4. **Environment Variables**: Added `REACT_APP_SERVER_URL` for dynamic server configuration

## 🌐 Current Configuration:

- **Network IP**: `192.168.101.176`
- **Backend Server**: `http://192.168.101.176:5000`
- **Frontend Access**: `http://192.168.101.176:3000`

## 🚀 How to Use:

### For Same PC (Different Tabs):
- Access: `http://localhost:3000`
- Works as before

### For Different PCs on Same Network:
- Access: `http://192.168.101.176:3000`
- Video calls will work between different devices

## 🔍 Testing Steps:

1. **Start Backend Server**:
   ```bash
   cd Backend
   npm start
   ```

2. **Start Frontend Server**:
   ```bash
   cd social_media
   npm start
   ```

3. **Test on Different Devices**:
   - Device 1: Open `http://192.168.101.176:3000`
   - Device 2: Open `http://192.168.101.176:3000`
   - Login with different accounts
   - Try video call between them

## 🛠️ If Still Not Working:

### Check Network Connection:
```bash
# Test if server is accessible
curl http://192.168.101.176:5000/test
```

### Check Firewall:
- Windows: Allow ports 3000 and 5000 in Windows Firewall
- Router: Ensure ports are not blocked

### Debug Socket Connection:
```bash
# Run the test script
node test-video-call.js
```

### Check Browser Console:
- Open Developer Tools (F12)
- Look for socket connection errors
- Check if "Socket connected successfully" appears

## 📱 Mobile/Other Device Access:

To access from mobile or other devices on the same network:
1. Find your PC's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `.env` files with the correct IP
3. Access `http://YOUR_IP:3000` from other devices

## 🔄 If IP Address Changes:

If your network IP changes, run:
```bash
node setup-network.js
```

This will automatically update the configuration files.

## 📞 Video Call Flow:

1. User A clicks video call button
2. Socket event `call-user` sent to server
3. Server finds User B's socket connection
4. Server sends `incoming-call` event to User B
5. User B sees notification popup
6. User B accepts/declines call
7. Both users navigate to video call page

## 🐛 Common Issues:

### "Socket not connected":
- Check if backend server is running
- Verify IP address in `.env` files
- Check firewall settings

### "Call notification not appearing":
- Check if both users are online
- Verify socket connection in browser console
- Check backend logs for call events

### "Different PC not working":
- Ensure both devices are on same network
- Check if server is bound to 0.0.0.0
- Verify CORS configuration allows the IP

## 📊 Debug Commands:

```bash
# Test socket connection
node debug-socket.js

# Test video call functionality
node test-video-call.js

# Setup network configuration
node setup-network.js
```

## ✨ Success Indicators:

- Backend shows: "Server accessible from other devices on network"
- Frontend console: "Socket connected successfully"
- Test script: "Video call test successful!"
- Different PCs can access the app and make video calls

Your video call system should now work perfectly across different PCs! 🎉