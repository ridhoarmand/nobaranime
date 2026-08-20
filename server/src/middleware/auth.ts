import type { Context, Next } from 'hono';

const API_KEY = process.env.API_KEY || '';

export const apiKeyAuth = async (c: Context, next: Next) => {
  // Jika API_KEY tidak di-set, skip auth (development mode)
  if (!API_KEY) {
    return next();
  }

  const requestKey = c.req.header('X-API-Key');

  if (!requestKey || requestKey !== API_KEY) {
    return c.json({ status: false, message: 'Unauthorized: Invalid API Key' }, 401);
  }

  return next();
};
