import '../config/env.js';
import fs from 'fs/promises';
import { pool } from '../config/database.js';

async function run() {
  const schemaUrl = new URL('../../../schema/002_edge_features.sql', import.meta.url);
  const schemaSql = await fs.readFile(schemaUrl, 'utf8');

  await pool.query(schemaSql);
  console.log('Edge features migration applied successfully');
}

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
