require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });
const JWT_SECRET = process.env.JWT_SECRET || 'eventsnap_secret_2024';

app.use(cors({ 
  origin: 'https://your-frontend-app.vercel.app' 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media files
app.use('/media', express.static(path.join(__dirname, 'uploads/media')));

const { initDb } = require('./models/db');

initDb().then(() => {
  // API Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/media', require('./routes/media'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/face', require('./routes/face'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

  // Serve React frontend (production build)
  const frontendBuild = path.join(__dirname, '../frontend/build');
  const fs = require('fs');
  if (fs.existsSync(frontendBuild)) {
    app.use(express.static(frontendBuild));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/media')) {
        res.sendFile(path.join(frontendBuild, 'index.html'));
      }
    });
  }

  // Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) { try { socket.user = jwt.verify(token, JWT_SECRET); } catch {} }
    next();
  });
  io.on('connection', (socket) => {
    if (socket.user) socket.join(`user_${socket.user.id}`);
  });
  app.set('io', io);

  // Real-time notification broadcaster
  const db = require('./models/db');
  setInterval(() => {
    try {
      const pending = db.prepare('SELECT * FROM notifications WHERE is_read=0').all();
      const byUser = {};
      for (const n of pending) {
        if (!byUser[n.user_id]) byUser[n.user_id] = [];
        byUser[n.user_id].push(n);
      }
      for (const [uid, notifs] of Object.entries(byUser)) {
        io.to(`user_${uid}`).emit('notifications', notifs);
      }
    } catch {}
  }, 5000);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 EventSnap running on http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/health`);
    console.log(`   App: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
