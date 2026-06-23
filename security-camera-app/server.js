const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Bonjour = require('bonjour-service');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  path: '/socket.io/',           // Explicit path
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3000;   // Important for Render

// mDNS (only works locally)
const bonjourInstance = new Bonjour();
const ad = bonjourInstance.publish({ 
  name: 'SecurityCameraServer', 
  type: 'http', 
  port: PORT 
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Health check for Render
app.get('/health', (req, res) => res.send('OK'));

io.on('connection', (socket) => {
  console.log('✅ Device connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('offer', (data) => socket.to(data.room).emit('offer', data));
  socket.on('answer', (data) => socket.to(data.room).emit('answer', data));
  socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data));

  socket.on('motion-detected', (data) => {
    console.log('🚨 Motion detected from', data.cameraId);
    io.emit('alert', { 
      cameraId: data.cameraId, 
      timestamp: new Date().toLocaleTimeString() 
    });
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  ad.stop();
  process.exit(0);
});
