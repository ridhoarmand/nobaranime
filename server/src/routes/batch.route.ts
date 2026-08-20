import { Hono } from 'hono';
import { db } from '../db/index.js';
import { anime, batches, batch_downloads } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ScraperService } from '../services/scraper/index.js';
import { jsonOk, json404 } from '../lib/helpers.js';

export const batchRoute = new Hono();

// ── GET /batch/:endpoint ──
batchRoute.get('/batch/:endpoint', async (c) => {
  const endpoint = c.req.param('endpoint');

  let [batchData] = await db.select().from(batches).where(eq(batches.endpoint, endpoint)).limit(1);
  if (!batchData) {
    console.log(`[API /batch] Batch not in DB, live scraping: ${endpoint}`);
    const scraped = await ScraperService.scrapeBatchEpisode(endpoint, 0);
    if (scraped) {
      [batchData] = await db.select().from(batches).where(eq(batches.endpoint, endpoint)).limit(1);
    }
  }
  if (!batchData) return json404(c, 'Batch not found');

  const [animeData] = batchData.anime_id
    ? await db.select({ id: anime.id, title: anime.title, endpoint: anime.endpoint, thumb: anime.thumb }).from(anime).where(eq(anime.id, batchData.anime_id)).limit(1)
    : [null];

  const downloadList = await db
    .select({
      id: batch_downloads.id,
      provider: batch_downloads.provider,
      resolution: batch_downloads.resolution,
      format: batch_downloads.format,
      size: batch_downloads.size,
      url: batch_downloads.url,
    })
    .from(batch_downloads)
    .where(eq(batch_downloads.batch_id, batchData.id));

  const grouped_downloads: Record<string, any[]> = {};
  for (const dl of downloadList) {
    const key = dl.resolution || 'unknown';
    if (!grouped_downloads[key]) grouped_downloads[key] = [];
    grouped_downloads[key].push({
      provider: dl.provider,
      format: dl.format,
      size: dl.size,
      url: dl.url,
    });
  }

  return jsonOk(c, {
    ...batchData,
    download_links: grouped_downloads,
    anime: animeData || null,
  });
});
