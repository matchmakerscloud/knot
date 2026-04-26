import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../../config/index.js';
import * as schema from './schema/index.js';

const sql = postgres(config.databaseUrl, { max: 10 });

export const db = drizzle(sql, { schema });
export type Database = typeof db;
