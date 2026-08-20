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
  connectionLimit: 6,
  maxIdle: 2,
  idleTimeout: 10000, // Close idle connections in 10s to prevent SLEEP zombie buildup
  connectTimeout: 10000,
  queueLimit: 50,
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

export async function ensureNewColumns() {
  try {
    const rawConnection = await pool.getConnection();
    try {
      const alterQueries = [
        `ALTER TABLE anime ADD COLUMN season VARCHAR(50);`,
        `ALTER TABLE episodes ADD COLUMN credit VARCHAR(100);`,
        `ALTER TABLE episodes ADD COLUMN encoder VARCHAR(100);`,
        `ALTER TABLE downloads ADD COLUMN size VARCHAR(50);`,
        `ALTER TABLE batch_downloads ADD COLUMN size VARCHAR(50);`,
        `CREATE TABLE IF NOT EXISTS recommendations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          anime_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          endpoint VARCHAR(255) NOT NULL,
          thumb TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
        );`,
      ];

      for (const q of alterQueries) {
        try {
          await rawConnection.query(q);
        } catch (e: any) {
          if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') {
            // ignore benign duplicate column errors
          }
        }
      }
      console.log('[DB Auto-Migration] Verified all rich metadata columns & tables.');
    } finally {
      rawConnection.release();
    }
  } catch (err: any) {
    console.warn('[DB Auto-Migration Warning]:', err.message);
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

  await ensureNewColumns();
}
