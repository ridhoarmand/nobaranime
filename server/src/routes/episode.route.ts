import { Hono } from 'hono';
import { db } from '../db/index.js';
import { anime, episodes, streams, downloads } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { ScraperService } from '../services/scraper/index.js';
import { jsonOk, json404 } from '../lib/helpers.js';

export const episodeRoute = new Hono();

const lastSyncMap = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60 * 1000;

// ── GET /episode/:endpoint ──
episodeRoute.get('/episode/:endpoint', async (c) => {
  const endpoint = c.req.param('endpoint');

  let [episodeData] = await db.select().from(episodes).where(eq(episodes.endpoint, endpoint)).limit(1);
  let streamList = episodeData
    ? await db
        .select({
          id: streams.id,
          provider: streams.provider,
          quality: streams.quality,
          url: streams.url,
          is_default: streams.is_default,
        })
        .from(streams)
        .where(eq(streams.episode_id, episodeData.id))
    : [];

  if (!episodeData || streamList.length === 0) {
    console.log(`[On-Demand] Episode "${endpoint}" missing or streams empty. Scraping live...`);
    let animeId = episodeData?.anime_id;

    if (!animeId) {
      const slugMatch = endpoint.match(/^(.+)-episode-\d+/i);
      const possibleAnimeSlug = slugMatch ? slugMatch[1] : null;

      if (possibleAnimeSlug) {
        let [foundAnime] = await db.select({ id: anime.id }).from(anime).where(eq(anime.endpoint, possibleAnimeSlug)).limit(1);
        if (!foundAnime) {
          const scrapedAnime = await ScraperService.scrapeAnimeDetail(possibleAnimeSlug);
          if (scrapedAnime) foundAnime = scrapedAnime;
        }
        if (foundAnime) animeId = foundAnime.id;
      }
    }

    if (animeId) {
      const episodeNumberMatch = endpoint.match(/episode-(\d+(\.\d+)?)/i);
      const epNum = episodeNumberMatch ? parseFloat(episodeNumberMatch[1]) : 0;
      await ScraperService.scrapeEpisode(endpoint, animeId, { episode_number: epNum });

      [episodeData] = await db.select().from(episodes).where(eq(episodes.endpoint, endpoint)).limit(1);
      if (episodeData) {
        streamList = await db
          .select({
            id: streams.id,
            provider: streams.provider,
            quality: streams.quality,
            url: streams.url,
            is_default: streams.is_default,
          })
          .from(streams)
          .where(eq(streams.episode_id, episodeData.id));
      }
    }
  }

  if (!episodeData) return json404(c, 'Episode not found');

  const [animeData] = await db
    .select({ id: anime.id, title: anime.title, endpoint: anime.endpoint, thumb: anime.thumb })
    .from(anime)
    .where(eq(anime.id, episodeData.anime_id))
    .limit(1);

  const downloadList = await db
    .select({
      id: downloads.id,
      provider: downloads.provider,
      resolution: downloads.resolution,
      format: downloads.format,
      size: downloads.size,
      url: downloads.url,
    })
    .from(downloads)
    .where(eq(downloads.episode_id, episodeData.id));

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

  if (!episodeData.credit) {
    setTimeout(() => {
      ScraperService.scrapeAnimeEpisode(endpoint, episodeData.episode_number || 0).catch(() => {});
    }, 500);
  }

  let prev_episode = null;
  let next_episode = null;

  const allEps = await db
    .select({ id: episodes.id, endpoint: episodes.endpoint, episode_number: episodes.episode_number })
    .from(episodes)
    .where(eq(episodes.anime_id, episodeData.anime_id))
    .orderBy(asc(episodes.episode_number), asc(episodes.id));

  const idx = allEps.findIndex((e) => e.endpoint === episodeData.endpoint || (episodeData.episode_number != null && e.episode_number === episodeData.episode_number));
  if (idx > 0) prev_episode = allEps[idx - 1].endpoint;
  if (idx !== -1 && idx < allEps.length - 1) next_episode = allEps[idx + 1].endpoint;

  return jsonOk(c, {
    ...episodeData,
    anime: animeData || null,
    streams: streamList,
    downloads: grouped_downloads,
    prev_episode,
    next_episode,
  });
});

// ── POST /episode/:endpoint/sync ──
episodeRoute.post('/episode/:endpoint/sync', async (c) => {
  const endpoint = c.req.param('endpoint');
  const now = Date.now();
  const lastSync = lastSyncMap.get(`ep:${endpoint}`) || 0;

  if (now - lastSync < SYNC_COOLDOWN_MS) {
    const remaining = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSync)) / 1000);
    c.header('X-RateLimit-Limit', '1');
    c.header('X-RateLimit-Remaining', '0');
    c.header('Retry-After', String(remaining));

    const [freshEp] = await db.select().from(episodes).where(eq(episodes.endpoint, endpoint)).limit(1);
    if (freshEp) {
      const streamList = await db.select().from(streams).where(eq(streams.episode_id, freshEp.id));
      const downloadList = await db.select().from(downloads).where(eq(downloads.episode_id, freshEp.id));
      return jsonOk(c, { ...freshEp, streams: streamList, downloads: downloadList }, { message: `Link sudah terbaru (Tunggu ${remaining}d untuk sync ulang).` });
    }
  }

  console.log(`[API Sync] Forced sync requested for episode: ${endpoint}`);

  try {
    const [existing] = await db.select().from(episodes).where(eq(episodes.endpoint, endpoint)).limit(1);
    const animeId = existing?.anime_id || 0;

    const result = await ScraperService.scrapeEpisode(endpoint, animeId);
    if (!result) return json404(c, 'Gagal menyinkronkan episode dari Otakudesu');

    lastSyncMap.set(`ep:${endpoint}`, Date.now());
    c.header('X-RateLimit-Limit', '1');
    c.header('X-RateLimit-Remaining', '1');

    const [freshEp] = await db.select().from(episodes).where(eq(episodes.endpoint, endpoint)).limit(1);
    const streamList = await db.select().from(streams).where(eq(streams.episode_id, freshEp.id));
    const downloadList = await db.select().from(downloads).where(eq(downloads.episode_id, freshEp.id));

    return jsonOk(c, { ...freshEp, streams: streamList, downloads: downloadList }, { message: 'Episode berhasil disinkronkan dari Otakudesu!' });
  } catch (error: any) {
    return c.json({ status: false, message: error.message || 'Sync episode failed' }, 500);
  }
});
