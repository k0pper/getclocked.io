// Minimal migration runner — no drizzle-kit, no build step. Reads each .sql file
// in ../drizzle in order and applies its statements over Neon's HTTP driver.
//
// Usage:  DATABASE_URL=postgres://... node scripts/migrate.mjs
// (DIRECT_URL is used if set, since DDL is better over a non-pooled connection.)

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('✖ Set DATABASE_URL (or DIRECT_URL) to your Postgres connection string.');
  process.exit(1);
}

const sql = neon(url);
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.error('✖ No .sql migrations found in', dir);
  process.exit(1);
}

for (const file of files) {
  const raw = readFileSync(join(dir, file), 'utf8');
  // Strip line comments, then split on ';' — the schema uses only simple,
  // single statements (no semicolons inside string literals).
  const statements = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`✓ applied ${file} (${statements.length} statements)`);
}

console.log('✓ migrations complete');
