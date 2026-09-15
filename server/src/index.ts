import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo } from './lib/mongo.js';
import { documentsRouter } from './routes/documents.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Railway, Render, Fly.io, etc.)
app.set('trust proxy', 1);

// Connect to MongoDB Atlas
connectMongo().catch(err => {
  console.error('Fatal: Unable to connect to MongoDB Atlas at startup:', err);
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Session Cookie Middleware: assigns anonymous session_id if missing
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.cookies.session_id) {
    const newSessionId = uuidv4();
    res.cookie('session_id', newSessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    req.cookies.session_id = newSessionId;
  }
  next();
});

// Simple session-based rate limiter for uploads
const uploadWindow = new Map<string, number[]>();
app.use('/api/documents', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST') {
    const sessionId = req.cookies.session_id || req.ip || 'anonymous';
    const now = Date.now();
    const timestamps = (uploadWindow.get(sessionId) || []).filter(t => now - t < 60000); // 1-minute window
    if (timestamps.length >= 15) {
      return res.status(429).json({
        error: 'Too many uploads or questions in a short period. Please wait a minute before trying again.'
      });
    }
    timestamps.push(now);
    uploadWindow.set(sessionId, timestamps);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  res.status(isMongoReady ? 200 : 503).json({
    status: isMongoReady ? 'ok' : 'degraded',
    database: isMongoReady ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Mount Document routes
app.use('/api/documents', documentsRouter);

// Serve Client static build in production or when dist exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static client files from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.log('Client dist folder not found yet; run `npm run build:client` to compile frontend.');
  app.get('/', (req: Request, res: Response) => {
    res.send('Doc-to-Action API Server is Running. Compile the frontend to view the web app.');
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`  Doc-to-Action Server running on port ${PORT}`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`===========================================`);
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Gracefully closing server and database...`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('Database connection closed.');
    } catch (e) {
      console.error('Error closing database:', e);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
