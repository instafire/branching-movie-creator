import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
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

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
].filter(Boolean));

const app = express();
const httpServer = createServer(app);

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/nodes', authMiddleware, nodesRouter);
app.use('/api/edges', authMiddleware, edgesRouter);
app.use('/api/media', authMiddleware, mediaRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);

app.use(errorHandler);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
setupWebSocket(wss);

const PORT = Number(process.env.PORT || 3001);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  pool.query('SELECT NOW()')
    .then(() => console.log('Database connected'))
    .catch((error) => console.error('Database connection failed:', error));
});

export { app, httpServer };
