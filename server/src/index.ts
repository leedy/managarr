import 'dotenv/config';
import { resolve, join } from 'path';
import { config } from 'dotenv';
import { existsSync } from 'fs';

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
import { tmdbRoutes } from './routes/tmdb.js';

const PORT = process.env.PORT || 3005;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5179';
const isProduction = process.env.NODE_ENV === 'production';

// Build MongoDB URI from individual env vars or use MONGODB_URI directly
function buildMongoUri(): string {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const database = process.env.MONGODB_DATABASE || 'managarr';

  if (user && password) {
    return `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${database}`;
}

const MONGODB_URI = buildMongoUri();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: isProduction ? true : CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware - minimal helmet config for local network HTTP access
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
}));
app.use(cors({
  origin: isProduction ? true : CLIENT_URL,
}));
app.use(express.json());

// Routes
app.use('/api/instances', instanceRoutes);
app.use('/api/sonarr', sonarrRoutes);
app.use('/api/radarr', radarrRoutes);
app.use('/api/plex', plexRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tmdb', tmdbRoutes);

// Health check endpoint
app.get('/api/ping', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
const clientDistPath = join(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDistPath, 'index.html'));
  });
}

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
