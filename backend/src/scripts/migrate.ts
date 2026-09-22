import '../config/env.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.resolve(currentDir, '../../../schema');

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if users table already existed before _migrations tracking
  const existingUsersTable = await pool.query(
    "SELECT to_regclass('public.users') AS table_name"
  );
  if (existingUsersTable.rows[0]?.table_name) {
    await pool.query(
      `INSERT INTO _migrations (name) VALUES ('001_initial_schema.sql') ON CONFLICT (name) DO NOTHING`
    );
  }

  const entries = await fs.readdir(schemaDir);
  const sqlFiles = entries
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const appliedResult = await pool.query<{ name: string }>(
    'SELECT name FROM _migrations'
  );
  const appliedSet = new Set(appliedResult.rows.map((row) => row.name));

  for (const file of sqlFiles) {
    if (appliedSet.has(file)) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const filePath = path.join(schemaDir, file);
    const sqlContent = await fs.readFile(filePath, 'utf8');

    console.log(`Applying migration: ${file}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sqlContent);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Successfully applied migration: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  console.log('All migrations applied successfully.');
}

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
