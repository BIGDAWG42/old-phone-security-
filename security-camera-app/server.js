const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Bonjour = require('bonjour-service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" }
});

const PORT = 3000;

// mDNS Advertisement (for local network discovery)
const bonjour = new Bonjour();
const ad = bonjour.publish({ 
    name: 'SecurityCameraSystem', 
    type: 'http', 
    port: PORT 
});

console.log('✅ mDNS service advertised');

app.use(express.static('public'));

// Serve viewer dashboard
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('Device connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
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
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    ad.stop();
    process.exit(0);
});