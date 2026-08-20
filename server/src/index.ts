import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { existsSync } from 'fs';
import { Scheduler } from './services/scheduler.js';
import { runAutoMigrations, closeDbPool } from './db/index.js';
import { apiRouter } from './routes/index.js';

const app = new Hono();

// Global Middleware
app.use('*', logger());
app.use('*', cors());

// Global Error Handler
app.onError((err, c) => {
  console.error('[NobarAnime Global Error]:', err);
  return c.json(
    {
      status: false,
      message: err.message || 'Internal Server Error',
    },
    500
  );
});

// Health check
app.get('/health', (c) => c.json({ status: true, message: 'NobarAnime Server is healthy', uptime: process.uptime() }));

// Mount API Router
app.route('/api', apiRouter);

// ── Static Files & SPA Fallback ──
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
};

function getMimeType(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return 'application/octet-stream';
  const ext = filePath.slice(dotIndex).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

const getClientDist = () => {
  const possiblePaths = [
    process.env.CLIENT_DIST_PATH,
    './client/dist',
    '../client/dist',
    '/app/client/dist',
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }
  return './client/dist';
};

const clientDist = getClientDist();

// Native Bun static file serving and SPA fallback
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api') || c.req.path === '/health') {
    return next();
  }

  const reqPath = c.req.path === '/' ? '/index.html' : c.req.path;
  const directPath = `${clientDist}${reqPath}`;

  if (existsSync(directPath)) {
    const file = Bun.file(directPath);
    const contentType = getMimeType(directPath) || file.type || 'application/octet-stream';
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': directPath.endsWith('index.html') || directPath.endsWith('sw.js')
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=31536000, immutable',
      },
    });
  }

  // Fallback to index.html for SPA client-side routes
  const indexPath = `${clientDist}/index.html`;
  if (existsSync(indexPath)) {
    return new Response(Bun.file(indexPath), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  return c.json({ status: false, message: 'Endpoint not found' }, 404);
});

// ── Server Bootstrap & Lifecycle ──
const port = parseInt(process.env.PORT || '8000');

runAutoMigrations().catch((err) => console.error('[DB Migration Init Error]', err));
Scheduler.init();

console.log(`[NobarAnime] Server is running on port ${port}`);
console.log(`[NobarAnime] Client dist path: ${clientDist}`);

// Graceful shutdown hooks
const shutdown = async () => {
  console.log('[NobarAnime] Shutting down server gracefully...');
  await closeDbPool();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default {
  port,
  fetch: app.fetch,
};
