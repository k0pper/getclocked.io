import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { requireEnv } from '../env';
import * as schema from './schema';

let cached: ReturnType<typeof create> | null = null;

function create(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

/** The Drizzle client over Neon's HTTP driver (stateless — ideal for
 *  serverless: no connection pool to exhaust). Built once per warm instance. */
export function getDb(): ReturnType<typeof create> {
  if (cached) return cached;
  cached = create(requireEnv().DATABASE_URL);
  return cached;
}

export type Database = ReturnType<typeof getDb>;
export { schema };
