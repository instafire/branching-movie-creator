import '../config/env.js';
import fs from 'fs/promises';
import { pool } from '../config/database.js';

async function run() {
  const existingUsersTable = await pool.query(
    "SELECT to_regclass('public.users') AS table_name"
  );

  if (existingUsersTable.rows[0]?.table_name) {
    console.log('Initial schema already exists, skipping migration');
    return;
  }

  const schemaUrl = new URL('../../../schema/001_initial_schema.sql', import.meta.url);
  const schemaSql = await fs.readFile(schemaUrl, 'utf8');

  await pool.query(schemaSql);
  console.log('Database schema applied successfully');
}

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
