const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Bonjour = require('bonjour-service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 3000;

const bonjour = new Bonjour();
const ad = bonjour.publish({ 
  name: 'SecurityCameraSystem', 
  type: 'http', 
  port: PORT 
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);
  socket.on('join-room', (roomId) => socket.join(roomId));

  socket.on('offer', (data) => socket.to(data.room).emit('offer', data));
  socket.on('answer', (data) => socket.to(data.room).emit('answer', data));
  socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data));

  socket.on('motion-detected', (data) => {
    io.emit('alert', { cameraId: data.cameraId, timestamp: new Date().toLocaleTimeString() });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  ad.stop();
  process.exit(0);
});
