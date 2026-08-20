import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

const MAX_RETRIES = 10;
const RETRY_DELAY = 3000; // 3 seconds

async function connectWithRetry(): Promise<mysql.Connection> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mysql.createConnection({
        uri: process.env.DATABASE_URL,
      });
      console.log(`[DB] Connected successfully (attempt ${attempt})`);
      return conn;
    } catch (error: any) {
      console.error(`[DB] Connection failed (attempt ${attempt}/${MAX_RETRIES}): ${error.code || error.message}`);
      if (attempt === MAX_RETRIES) {
        console.error('[DB] Max retries reached. Exiting.');
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('[DB] Unreachable');
}

export const connection = await connectWithRetry();

export const db = drizzle(connection, { schema, mode: 'default' });
