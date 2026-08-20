import { Hono } from 'hono';
import { db } from '../db/index.js';
import { anime } from '../db/schema.js';
import { desc, sql } from 'drizzle-orm';
import { ScraperService } from '../services/scraper/index.js';
import { jsonOk } from '../lib/helpers.js';

export const searchRoute = new Hono();

// ── GET /search ──
searchRoute.get('/search', async (c) => {
  try {
    const q = c.req.query('q');
    const limitParam = parseInt(c.req.query('limit') || '50');
    if (!q) return c.json({ status: false, message: 'Query parameter "q" is required' }, 400);

    let data = await db
      .select()
      .from(anime)
      .where(sql`LOWER(${anime.title}) LIKE LOWER(${'%' + q + '%'})`)
      .orderBy(desc(anime.updated_at))
      .limit(limitParam);

    if (data.length === 0) {
      console.log(`[API /search] No anime found in DB for "${q}", attempting live search...`);
      await ScraperService.searchAnime(q);
      data = await db
        .select()
        .from(anime)
        .where(sql`LOWER(${anime.title}) LIKE LOWER(${'%' + q + '%'})`)
        .orderBy(desc(anime.updated_at))
        .limit(limitParam);
    }

    return jsonOk(c, data);
  } catch (err: any) {
    console.error('[API /search Error]', err);
    return c.json({ status: false, message: err.message || 'Search failed' }, 500);
  }
});
