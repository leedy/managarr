import 'dotenv/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env from project root
config({ path: resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDatabase } from './config/database.js';
import { instanceRoutes } from './routes/instances.js';
import { sonarrRoutes } from './routes/sonarr.js';
import { radarrRoutes } from './routes/radarr.js';
import { plexRoutes } from './routes/plex.js';
import { healthRoutes } from './routes/health.js';
import { settingsRoutes } from './routes/settings.js';

const PORT = process.env.PORT || 3005;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/managarr';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5179';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: CLIENT_URL,
}));
app.use(express.json());

// Routes
app.use('/api/instances', instanceRoutes);
app.use('/api/sonarr', sonarrRoutes);
app.use('/api/radarr', radarrRoutes);
app.use('/api/plex', plexRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/ping', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Start server
async function start() {
  try {
    await connectDatabase(MONGODB_URI);
    console.log('Connected to MongoDB');

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Managarr server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
