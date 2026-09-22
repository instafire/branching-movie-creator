import './config/env.js';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { publicRouter } from './routes/public.js';
import { nodesRouter } from './routes/nodes.js';
import { edgesRouter } from './routes/edges.js';
import { mediaRouter } from './routes/media.js';
import { analyticsRouter } from './routes/analytics.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { setupWebSocket } from './websocket/index.js';
import { pool } from './config/database.js';
import { isLocalStorage, localStorageRoot } from './config/storage.js';
import { AppError } from './middleware/errorHandler.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function resolveFrontendDistPath(): string | null {
  const configuredPath = process.env.FRONTEND_DIST_PATH?.trim();
  const candidates = [
    configuredPath,
    path.resolve(process.cwd(), 'frontend-dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(currentDir, '../frontend-dist'),
    path.resolve(currentDir, '../../frontend/dist'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const indexHtmlPath = path.join(candidate, 'index.html');

    if (fs.existsSync(indexHtmlPath)) {
      return candidate;
    }
  }

  return null;
}

function parseAllowedOrigins(...values: Array<string | undefined>): Set<string> {
  return new Set(
    values
      .flatMap((value) => (value || '').split(','))
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

const allowedOrigins = parseAllowedOrigins(
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
);

const app = express();
const httpServer = createServer(app);
const frontendDistPath = resolveFrontendDistPath();
const databaseStatus = {
  ready: false,
  lastError: null as string | null,
};
const requireDatabaseOnBoot = process.env.REQUIRE_DB_ON_BOOT === 'true'
  || process.env.NODE_ENV === 'production';

async function verifyDatabaseConnection(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    databaseStatus.ready = true;
    databaseStatus.lastError = null;
    console.log('Database connected');
  } catch (error) {
    databaseStatus.ready = false;
    databaseStatus.lastError = error instanceof Error ? error.message : String(error);
    console.error('Database connection failed:', error);

    if (requireDatabaseOnBoot) {
      httpServer.close(() => {
        process.exit(1);
      });

      setTimeout(() => {
        process.exit(1);
      }, 500).unref();
    }
  }
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(403, `Origin ${origin} is not allowed by CORS`));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

if (isLocalStorage) {
  app.use('/uploads', express.static(localStorageRoot));
}

app.get('/health', (_req, res) => {
  const statusCode = databaseStatus.ready ? 200 : 503;

  res.status(statusCode).json({
    status: databaseStatus.ready ? 'ok' : 'degraded',
    database: databaseStatus.ready ? 'connected' : 'disconnected',
    error: databaseStatus.lastError,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/nodes', authMiddleware, nodesRouter);
app.use('/api/edges', authMiddleware, edgesRouter);
app.use('/api/media', authMiddleware, mediaRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));

  app.get(/^(?!\/(?:api|uploads|ws)(?:\/|$)|\/health$).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use(errorHandler);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
setupWebSocket(wss);

const PORT = Number(process.env.PORT || 3002);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (frontendDistPath) {
    console.log(`Serving frontend from ${frontendDistPath}`);
  }

  void verifyDatabaseConnection();
});

export { app, httpServer };
