import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { existsSync } from 'fs';
import path from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/otakudesu';

export const pool = mysql.createPool({
  uri: databaseUrl,
  waitForConnections: true,
  connectionLimit: 1, // Single active persistent connection (strictly 1 active connection, sequential FIFO queue)
  maxIdle: 1,         // Keep that single connection warm and persistent
  idleTimeout: 300000, // 5 minutes keepalive (no frequent open/close churn)
  queueLimit: 0,      // Unlimited queue so operations wait their turn politely
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

export const db = drizzle(pool, { schema, mode: 'default' });

export async function closeDbPool() {
  try {
    await pool.end();
    console.log('[DB] Connection pool closed cleanly.');
  } catch (err: any) {
    console.warn('[DB Pool Close Warning]:', err.message);
  }
}

export async function runAutoMigrations() {
  const folders = [
    path.resolve(process.cwd(), 'drizzle'),
    path.resolve(process.cwd(), 'server/drizzle'),
    path.resolve(import.meta.dir, '../../drizzle'),
    path.resolve(import.meta.dir, '../drizzle'),
  ];

  for (const folder of folders) {
    if (existsSync(folder)) {
      try {
        console.log(`[DB] Checking auto migrations from: ${folder}`);
        await migrate(db, { migrationsFolder: folder });
        console.log(`[DB] Database schema verified & up to date.`);
        break;
      } catch (err: any) {
        console.warn(`[DB] Auto migration warning:`, err.message);
      }
    }
  }
}
