import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  projectId?: string;
  isAlive?: boolean;
}

interface WSMessage {
  type: string;
  payload: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    ws.isAlive = true;

    const url = new URL(req.url || '', 'ws://localhost');
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        ws.userId = decoded.userId;
      } catch {
        ws.close(4001, 'Invalid token');
        return;
      }
    }

    ws.on('message', (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        void handleMessage(wss, ws, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'WebSocket connection established' },
    }));
  });

  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const socket = client as AuthenticatedWebSocket;

      if (!socket.isAlive) {
        socket.terminate();
        return;
      }

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

async function handleMessage(
  wss: WebSocketServer,
  ws: AuthenticatedWebSocket,
  message: WSMessage
): Promise<void> {
  switch (message.type) {
    case 'join_project':
      await handleJoinProject(ws, message.payload);
      break;
    case 'node_moved':
      broadcastToProject(wss, ws, {
        type: 'node_moved',
        payload: {
          nodeId: message.payload.nodeId,
          x: message.payload.x,
          y: message.payload.y,
          userId: ws.userId,
        },
      });
      break;
    case 'edge_created':
      broadcastToProject(wss, ws, {
        type: 'edge_created',
        payload: {
          edgeId: message.payload.edgeId,
          userId: ws.userId,
        },
      });
      break;
    case 'cursor_move':
      broadcastToProject(wss, ws, {
        type: 'cursor_move',
        payload: {
          x: message.payload.x,
          y: message.payload.y,
          userId: ws.userId,
        },
      });
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
}

async function handleJoinProject(
  ws: AuthenticatedWebSocket,
  payload: { projectId: string }
): Promise<void> {
  ws.projectId = payload.projectId;

  const users = await query<{ username: string }>(
    `SELECT DISTINCT u.username
     FROM users u
     JOIN projects p ON p.user_id = u.id
     WHERE p.id = $1`,
    [payload.projectId]
  );

  ws.send(JSON.stringify({
    type: 'users_in_project',
    payload: { users: users.map((user) => user.username) },
  }));
}

function broadcastToProject(
  wss: WebSocketServer,
  sourceSocket: AuthenticatedWebSocket,
  message: WSMessage
): void {
  if (!sourceSocket.projectId) {
    return;
  }

  wss.clients.forEach((client) => {
    const socket = client as AuthenticatedWebSocket;

    if (
      socket !== sourceSocket &&
      socket.projectId === sourceSocket.projectId &&
      socket.readyState === WebSocket.OPEN
    ) {
      socket.send(JSON.stringify(message));
    }
  });
}
