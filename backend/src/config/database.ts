import './env.js';
import { Pool, type PoolConfig } from 'pg';

const USE_MOCK = process.env.USE_MOCK_DB === 'true';

let pool: Pool;

// Mock in-memory database for testing
const mockDb = {
  users: new Map<string, any>(),
  projects: new Map<string, any>(),
  nodes: new Map<string, any>(),
  edges: new Map<string, any>(),
  media_clips: new Map<string, any>(),
  viewer_sessions: new Map<string, any>(),
  analytics_events: new Map<string, any>(),
};

let idCounter = 1;
function generateId(): string {
  return `mock-${idCounter++}-${Date.now()}`;
}

async function mockQuery(text: string, params: any[] = []): Promise<any> {
  const rows: any[] = [];
  console.log('MOCK DB:', text.substring(0, 80), params?.[0]);

  try {
    if (text.includes('FROM users WHERE email') && params?.[0]) {
      const email = params[0];
      const user = Array.from(mockDb.users.values()).find((u: any) => u.email === email);
      if (user) rows.push(user);
    } else if (text.includes('FROM users WHERE id') && params?.[0]) {
      const id = params[0];
      const user = mockDb.users.get(id);
      if (user) rows.push(user);
    } else if (text.includes('INSERT INTO users') && params) {
      const user = {
        id: generateId(),
        email: params[0],
        password_hash: params[1],
        username: params[2],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.users.set(user.id, user);
      rows.push(user);
    } else if (text.includes('FROM projects WHERE user_id') && params?.[0]) {
      const userId = params[0];
      Array.from(mockDb.projects.values()).forEach((project: any) => {
        if (project.user_id === userId) rows.push(project);
      });
    } else if (text.includes('FROM projects WHERE id = $1') && params?.[0]) {
      const id = params[0];
      const project = mockDb.projects.get(id);
      if (project) rows.push(project);
    } else if (text.includes('INSERT INTO projects') && params) {
      const project = {
        id: generateId(),
        user_id: params[0],
        title: params[1],
        description: params[2],
        is_published: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.projects.set(project.id, project);
      rows.push(project);
    } else if (text.includes('SELECT NOW()')) {
      rows.push({ now: new Date() });
    }
  } catch (error) {
    console.error('Mock query error:', error);
  }

  return { rows };
}

if (USE_MOCK) {
  console.log('Running in MOCK mode (no database)');
  pool = {
    query: mockQuery,
    on: () => {},
    end: async () => {},
  } as unknown as Pool;
} else {
  const baseConfig: PoolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || 'branching_movie_creator',
      };

  pool = new Pool({
    ...baseConfig,
    max: Number(process.env.DB_MAX_CONNECTIONS || 20),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 2000),
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export { pool };
