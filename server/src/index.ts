import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { existsSync } from 'fs';
import { ScraperService } from './services/scraper.js';
import { Scheduler } from './services/scheduler.js';
import { db, runAutoMigrations } from './db/index.js';
import { anime, episodes, batches, genres, anime_genres, streams, downloads, batch_downloads } from './db/schema.js';
import { eq, desc, asc, sql, and, inArray } from 'drizzle-orm';

const app = new Hono();
const api = new Hono();

app.use('*', logger());
app.use('*', cors());

// Global error handler
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

const PER_PAGE = 25;

// ── Helper ──

const paginate = (page: number) => ({
  limit: PER_PAGE,
  offset: (page - 1) * PER_PAGE,
});

const jsonOk = (c: any, data: any, meta?: any) => c.json({ status: true, ...(meta || {}), data });

const json404 = (c: any, message = 'Not found') => c.json({ status: false, message }, 404);

// ── Health Check ──
app.get('/health', (c) => c.json({ status: true, message: 'NobarAnime Server is healthy', uptime: process.uptime() }));

// ── API Info & Health ──
api.get('/health', (c) => c.json({ status: true, message: 'NobarAnime API is healthy', uptime: process.uptime() }));
api.get('/', (c) => {
  return c.json({
    message: 'NobarAnime API',
    version: '1.0.0',
    endpoints: {
      ongoing: '/api/ongoing?page=1',
      latest_episodes: '/api/latest-episodes?page=1',
      completed: '/api/completed?page=1',
      anime_list: '/api/anime-list?page=1&initial=A',
      search: '/api/search?q=naruto',
      anime: '/api/anime/:endpoint',
      episode: '/api/episode/:endpoint',
      batch: '/api/batch/:endpoint',
      genres: '/api/genres',
      genre_anime: '/api/genres/:genre?page=1',
      schedule: '/api/schedule',
    },
  });
});

// ── Anime Lists ──

api.get('/ongoing', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

  // Get ongoing anime with last episode created_at & date
  const subquery = db
    .select({
      anime_id: episodes.anime_id,
      last_episode_date: sql`MAX(${episodes.date})`.as('last_episode_date'),
      last_episode_number: sql`MAX(${episodes.episode_number})`.as('last_episode_number'),
      last_episode_created_at: sql`MAX(${episodes.created_at})`.as('last_episode_created_at'),
    })
    .from(episodes)
    .groupBy(episodes.anime_id)
    .as('ep');

  // Join anime with subquery
  const data = await db
    .select({
      id: anime.id,
      title: anime.title,
      japanese_title: anime.japanese_title,
      endpoint: anime.endpoint,
      thumb: anime.thumb,
      status: anime.status,
      score: anime.score,
      producer: anime.producer,
      type: anime.type,
      studio: anime.studio,
      duration: anime.duration,
      release_date: anime.release_date,
      available_eps: anime.available_eps,
      total_eps: anime.total_eps,
      broadcast_day: anime.broadcast_day,
      synopsis: anime.synopsis,
      created_at: anime.created_at,
      updated_at: anime.updated_at,
      last_episode_date: sql`ep.last_episode_date`,
      last_episode_number: sql`ep.last_episode_number`,
      last_episode_slug: sql`(SELECT ${episodes.endpoint} FROM ${episodes} WHERE ${episodes.anime_id} = ${anime.id} ORDER BY ${episodes.episode_number} DESC LIMIT 1)`.as('last_episode_slug'),
    })
    .from(anime)
    .leftJoin(subquery, eq(anime.id, sql`ep.anime_id`))
    .where(eq(anime.status, 'Ongoing'))
    .orderBy(
      // 1. Last episode creation time (desc)
      desc(sql`ep.last_episode_created_at`),
      // 2. Anime created_at (desc)
      desc(anime.created_at),
      // 3. ID (desc)
      desc(anime.id)
    )
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(anime)
    .where(eq(anime.status, 'Ongoing'));

  const total = Number(countResult.count);

  const formatted = data.map((item) => ({
    id: item.id,
    title: item.title,
    japanese_title: item.japanese_title,
    endpoint: item.endpoint,
    thumb: item.thumb,
    status: item.status,
    score: item.score,
    producer: item.producer,
    type: item.type,
    studio: item.studio,
    duration: item.duration,
    release_date: item.release_date,
    available_eps: item.available_eps,
    total_eps: item.total_eps,
    last_episode_number: item.last_episode_number ? Number(item.last_episode_number) : null,
    last_episode_slug: item.last_episode_slug as string | null,
    last_episode_date: item.last_episode_date,
    broadcast_day: item.broadcast_day,
    synopsis: item.synopsis,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return jsonOk(c, formatted, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
  });
});

// Latest episodes (recent releases: mix of ongoing & recently completed)
api.get('/latest-episodes', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

  // Get latest episodes with last episode created_at
  const subquery = db
    .select({
      anime_id: episodes.anime_id,
      last_episode_date: sql`MAX(${episodes.date})`.as('last_episode_date'),
      last_episode_number: sql`MAX(${episodes.episode_number})`.as('last_episode_number'),
      last_episode_created_at: sql`MAX(${episodes.created_at})`.as('last_episode_created_at'),
    })
    .from(episodes)
    .groupBy(episodes.anime_id)
    .as('ep');

  // Join anime with subquery
  const data = await db
    .select({
      id: anime.id,
      title: anime.title,
      japanese_title: anime.japanese_title,
      endpoint: anime.endpoint,
      thumb: anime.thumb,
      status: anime.status,
      score: anime.score,
      producer: anime.producer,
      type: anime.type,
      studio: anime.studio,
      duration: anime.duration,
      release_date: anime.release_date,
      available_eps: anime.available_eps,
      total_eps: anime.total_eps,
      broadcast_day: anime.broadcast_day,
      synopsis: anime.synopsis,
      created_at: anime.created_at,
      updated_at: anime.updated_at,
      last_episode_date: sql`ep.last_episode_date`,
      last_episode_number: sql`ep.last_episode_number`,
      last_episode_slug: sql`(SELECT ${episodes.endpoint} FROM ${episodes} WHERE ${episodes.anime_id} = ${anime.id} ORDER BY ${episodes.episode_number} DESC LIMIT 1)`.as('last_episode_slug'),
    })
    .from(anime)
    .innerJoin(subquery, eq(anime.id, sql`ep.anime_id`))
    .orderBy(
      // 1. Last episode creation time (desc)
      desc(sql`ep.last_episode_created_at`),
      // 2. Anime created_at (desc)
      desc(anime.created_at),
      // 3. ID (desc)
      desc(anime.id)
    )
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(anime)
    .innerJoin(subquery, eq(anime.id, sql`ep.anime_id`));

  const total = Number(countResult.count);

  const formatted = data.map((item) => ({
    id: item.id,
    title: item.title,
    japanese_title: item.japanese_title,
    endpoint: item.endpoint,
    thumb: item.thumb,
    status: item.status,
    score: item.score,
    producer: item.producer,
    type: item.type,
    studio: item.studio,
    duration: item.duration,
    release_date: item.release_date,
    available_eps: item.available_eps,
    total_eps: item.total_eps,
    last_episode_number: item.last_episode_number ? Number(item.last_episode_number) : null,
    last_episode_slug: item.last_episode_slug as string | null,
    last_episode_date: item.last_episode_date,
    broadcast_day: item.broadcast_day,
    synopsis: item.synopsis,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return jsonOk(c, formatted, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
  });
});

// Completed anime
api.get('/completed', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

  // Get completed anime with last episode created_at
  const subquery = db
    .select({
      anime_id: episodes.anime_id,
      last_episode_date: sql`MAX(${episodes.date})`.as('last_episode_date'),
      last_episode_number: sql`MAX(${episodes.episode_number})`.as('last_episode_number'),
      last_episode_created_at: sql`MAX(${episodes.created_at})`.as('last_episode_created_at'),
    })
    .from(episodes)
    .groupBy(episodes.anime_id)
    .as('ep');

  const data = await db
    .select({
      id: anime.id,
      title: anime.title,
      japanese_title: anime.japanese_title,
      endpoint: anime.endpoint,
      thumb: anime.thumb,
      status: anime.status,
      score: anime.score,
      producer: anime.producer,
      type: anime.type,
      studio: anime.studio,
      duration: anime.duration,
      release_date: anime.release_date,
      available_eps: anime.available_eps,
      total_eps: anime.total_eps,
      last_episode_date: sql`ep.last_episode_date`,
      last_episode_number: sql`ep.last_episode_number`,
      last_episode_slug: sql`(SELECT ${episodes.endpoint} FROM ${episodes} WHERE ${episodes.anime_id} = ${anime.id} ORDER BY ${episodes.episode_number} DESC LIMIT 1)`.as('last_episode_slug'),
      broadcast_day: anime.broadcast_day,
      synopsis: anime.synopsis,
      created_at: anime.created_at,
      updated_at: anime.updated_at,
    })
    .from(anime)
    .leftJoin(subquery, eq(anime.id, sql`ep.anime_id`))
    .where(eq(anime.status, 'Completed'))
    .orderBy(
      // 1. Last episode creation time (desc)
      desc(sql`ep.last_episode_created_at`),
      // 2. Anime created_at (desc)
      desc(anime.created_at),
      // 3. ID (desc)
      desc(anime.id)
    )
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(anime)
    .where(eq(anime.status, 'Completed'));

  const total = Number(countResult.count);

  // Format fields in logical order
  const formatted = data.map((item) => ({
    id: item.id,
    title: item.title,
    japanese_title: item.japanese_title,
    endpoint: item.endpoint,
    thumb: item.thumb,
    status: item.status,
    score: item.score,
    producer: item.producer,
    type: item.type,
    studio: item.studio,
    duration: item.duration,
    release_date: item.release_date,
    available_eps: item.available_eps,
    total_eps: item.total_eps,
    last_episode_number: item.last_episode_number ? Number(item.last_episode_number) : null,
    last_episode_slug: item.last_episode_slug as string | null,
    last_episode_date: item.last_episode_date,
    broadcast_day: item.broadcast_day,
    synopsis: item.synopsis,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return jsonOk(c, formatted, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
  });
});

// ── Search ──

api.get('/search', async (c) => {
  const q = c.req.query('q');
  const limitParam = parseInt(c.req.query('limit') || '50');
  if (!q) return c.json({ status: false, message: 'Query parameter "q" is required' }, 400);

  const data = await db
    .select()
    .from(anime)
    .where(sql`LOWER(${anime.title}) LIKE LOWER(${`%${q}%`})`)
    .orderBy(desc(anime.updated_at))
    .limit(limitParam);

  return jsonOk(c, data);
});

// ── Anime Detail ──

api.get('/anime/:endpoint', async (c) => {
  const endpoint = c.req.param('endpoint');

  // 1. Get anime from DB
  let [animeData] = await db.select().from(anime).where(eq(anime.endpoint, endpoint)).limit(1);

  // On-Demand Auto Scrape if not in DB
  if (!animeData) {
    console.log(`[On-Demand] Anime "${endpoint}" not found in DB. Scraping live...`);
    const scraped = await ScraperService.scrapeAnimeDetail(endpoint);
    if (scraped) {
      [animeData] = await db.select().from(anime).where(eq(anime.endpoint, endpoint)).limit(1);
    }
  }

  if (!animeData) return json404(c, 'Anime not found');

  // 2. Get episodes
  const episodeList = await db
    .select({
      id: episodes.id,
      title: episodes.title,
      episode_number: episodes.episode_number,
      endpoint: episodes.endpoint,
      date: episodes.date,
    })
    .from(episodes)
    .where(eq(episodes.anime_id, animeData.id))
    .orderBy(asc(episodes.episode_number));

  // 3. Get genres
  const genreList = await db
    .select({
      id: genres.id,
      name: genres.name,
    })
    .from(genres)
    .innerJoin(anime_genres, eq(genres.id, anime_genres.genre_id))
    .where(eq(anime_genres.anime_id, animeData.id));

  // 4. Get batch downloads
  const batchList = await db
    .select({
      id: batches.id,
      title: batches.title,
      endpoint: batches.endpoint,
      upload_date: batches.upload_date,
    })
    .from(batches)
    .where(eq(batches.anime_id, animeData.id));

  return jsonOk(c, {
    ...animeData,
    genres: genreList,
    episodes: episodeList,
    batches: batchList,
  });
});

// ── Episode Detail ──

api.get('/episode/:endpoint', async (c) => {
  const endpoint = c.req.param('endpoint');

  // Get episode from DB
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

  // On-Demand Auto Scrape if episode is missing or streams are empty
  if (!episodeData || streamList.length === 0) {
    console.log(`[On-Demand] Episode "${endpoint}" missing or streams empty. Scraping live...`);
    let animeId = episodeData?.anime_id;

    if (!animeId) {
      // Try to extract anime slug from episode endpoint (e.g. "one-piece-episode-1100-sub-indo" -> "one-piece")
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

  // Get anime info
  const [animeData] = await db.select({ id: anime.id, title: anime.title, endpoint: anime.endpoint, thumb: anime.thumb }).from(anime).where(eq(anime.id, episodeData.anime_id)).limit(1);

  // Get downloads
  const downloadList = await db
    .select({
      id: downloads.id,
      provider: downloads.provider,
      resolution: downloads.resolution,
      format: downloads.format,
      url: downloads.url,
    })
    .from(downloads)
    .where(eq(downloads.episode_id, episodeData.id));

  // Group downloads by resolution
  const grouped_downloads: Record<string, any[]> = {};
  for (const dl of downloadList) {
    const key = dl.resolution || 'unknown';
    if (!grouped_downloads[key]) grouped_downloads[key] = [];
    grouped_downloads[key].push({
      provider: dl.provider,
      format: dl.format,
      url: dl.url,
    });
  }

  // Get prev/next episode
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

// ── Batch Detail ──

api.get('/batch/:endpoint', async (c) => {
  const endpoint = c.req.param('endpoint');

  const [batchData] = await db.select().from(batches).where(eq(batches.endpoint, endpoint)).limit(1);
  if (!batchData) return json404(c, 'Batch not found');

  // Get anime info
  const [animeData] = batchData.anime_id
    ? await db.select({ id: anime.id, title: anime.title, endpoint: anime.endpoint, thumb: anime.thumb }).from(anime).where(eq(anime.id, batchData.anime_id)).limit(1)
    : [null];

  // Get batch downloads
  const downloadList = await db
    .select({
      id: batch_downloads.id,
      provider: batch_downloads.provider,
      resolution: batch_downloads.resolution,
      format: batch_downloads.format,
      url: batch_downloads.url,
    })
    .from(batch_downloads)
    .where(eq(batch_downloads.batch_id, batchData.id));

  // Group downloads by resolution
  const grouped_downloads: Record<string, any[]> = {};
  for (const dl of downloadList) {
    const key = dl.resolution || 'unknown';
    if (!grouped_downloads[key]) grouped_downloads[key] = [];
    grouped_downloads[key].push({
      provider: dl.provider,
      format: dl.format,
      url: dl.url,
    });
  }

  return jsonOk(c, {
    ...batchData,
    download_links: grouped_downloads, // Override legacy field with new structure
    anime: animeData || null,
  });
});

// ── Genres ──

api.get('/genres', async (c) => {
  const data = await db.select({ id: genres.id, name: genres.name }).from(genres).orderBy(asc(genres.name));
  return jsonOk(c, data);
});

// Anime by genre
api.get('/genres/:genre', async (c) => {
  const genreName = decodeURIComponent(c.req.param('genre'));
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

  // Find genre
  const [genre] = await db.select().from(genres).where(eq(genres.name, genreName)).limit(1);
  if (!genre) return json404(c, 'Genre not found');

  // Get anime IDs for this genre
  const animeIds = await db.select({ anime_id: anime_genres.anime_id }).from(anime_genres).where(eq(anime_genres.genre_id, genre.id));

  if (animeIds.length === 0) return jsonOk(c, [], { page, per_page: PER_PAGE, total: 0, total_pages: 0, genre: genre.name });

  const ids = animeIds.map((a) => a.anime_id);

  const data = await db.select().from(anime).where(inArray(anime.id, ids)).orderBy(desc(anime.updated_at)).limit(limit).offset(offset);

  return jsonOk(c, data, {
    page,
    per_page: PER_PAGE,
    total: ids.length,
    total_pages: Math.ceil(ids.length / PER_PAGE),
    genre: genre.name,
  });
});

// ── Schedule ──

api.get('/schedule', async (c) => {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const schedule: Record<string, any[]> = {};

  for (const day of days) {
    const list = await db
      .select({
        id: anime.id,
        title: anime.title,
        endpoint: anime.endpoint,
        thumb: anime.thumb,
        total_eps: anime.total_eps,
      })
      .from(anime)
      .where(and(eq(anime.broadcast_day, day), eq(anime.status, 'Ongoing')))
      .orderBy(asc(anime.title));

    schedule[day] = list;
  }

  return jsonOk(c, schedule);
});

// ── Anime List by Initial ──
// Example: /anime-list?page=1&initial=A (A-Z or # for non-alphabetic)
api.get('/anime-list', async (c) => {
  const initial = (c.req.query('initial') || '').toUpperCase();
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

  let whereCond;
  if (!initial) {
    // No filter, show all
    whereCond = undefined;
  } else if (initial === '#') {
    // Non-alphabetic (0-9 or simbol)
    whereCond = sql`LEFT(${anime.title}, 1) REGEXP '^[^A-Za-z]'`;
  } else if (/^[A-Z]$/.test(initial)) {
    // Specific letter
    whereCond = sql`LEFT(${anime.title}, 1) = ${initial}`;
  } else {
    // Invalid filter
    return c.json({ status: false, message: 'Invalid initial filter' }, 400);
  }

  const baseQuery = db.select().from(anime);
  const data = whereCond ? baseQuery.where(whereCond) : baseQuery;
  // Always order by title ASC for alphabetic order
  const result = await data.orderBy(asc(anime.title)).limit(limit).offset(offset);

  // Count total
  const countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(anime);
  const countResult = whereCond ? countQuery.where(whereCond) : countQuery;
  const [countRow] = await countResult;
  const total = Number(countRow.count);

  return jsonOk(c, result, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
    initial: initial || null,
    filter_info: 'Gunakan parameter initial=A-Z atau # untuk filter judul depan. Contoh: /anime-list?initial=A',
  });
});

// ── Internal scrape endpoints (protected by API Key middleware above) ──

// Scrape/update detail untuk 1 anime (episode + stream + download + genre)
api.post('/internal/scrape/:endpoint', async (c) => {

  const endpoint = c.req.param('endpoint');
  console.log(`[API] Manual scrape triggered: ${endpoint}`);

  try {
    await ScraperService.scrapeAnimeDetail(endpoint);

    // Return fresh data
    const [animeData] = await db.select().from(anime).where(eq(anime.endpoint, endpoint)).limit(1);
    const episodeList = await db
      .select({ id: episodes.id, title: episodes.title, episode_number: episodes.episode_number, endpoint: episodes.endpoint })
      .from(episodes)
      .where(eq(episodes.anime_id, animeData?.id ?? 0))
      .orderBy(asc(episodes.episode_number));

    return jsonOk(c, { ...animeData, episodes: episodeList }, { message: 'Scrape completed' });
  } catch (error: any) {
    return c.json({ status: false, message: error.message || 'Scrape failed' }, 500);
  }
});

const lastSyncMap = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown

// Sync / forced live rescrape 1 anime dari Otakudesu (publik untuk frontend sync button)
api.post('/anime/:endpoint/sync', async (c) => {
  const endpoint = c.req.param('endpoint');
  const now = Date.now();
  const lastSync = lastSyncMap.get(`anime:${endpoint}`) || 0;

  if (now - lastSync < SYNC_COOLDOWN_MS) {
    const remaining = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSync)) / 1000);
    c.header('X-RateLimit-Limit', '1');
    c.header('X-RateLimit-Remaining', '0');
    c.header('Retry-After', String(remaining));

    const [animeData] = await db.select().from(anime).where(eq(anime.endpoint, endpoint)).limit(1);
    if (animeData) {
      const episodeList = await db
        .select({ id: episodes.id, title: episodes.title, episode_number: episodes.episode_number, endpoint: episodes.endpoint, date: episodes.date })
        .from(episodes)
        .where(eq(episodes.anime_id, animeData.id))
        .orderBy(asc(episodes.episode_number));
      return jsonOk(c, { ...animeData, episodes: episodeList }, { message: `Data sudah terbaru (Tunggu ${remaining}d untuk sync ulang).` });
    }
  }

  console.log(`[API Sync] Forced sync requested for anime: ${endpoint}`);

  try {
    const scraped = await ScraperService.scrapeAnimeDetail(endpoint, true);
    if (!scraped) return json404(c, 'Gagal menyinkronkan anime dari Otakudesu');

const [animeData] = await db.select().from(anime).where(eq(anime.endpoint, endpoint)).limit(1);
    const episodeList = await db
      .select({ id: episodes.id, title: episodes.title, episode_number: episodes.episode_number, endpoint: episodes.endpoint, date: episodes.date })
      .from(episodes)
      .where(eq(episodes.anime_id, animeData?.id ?? 0))
      .orderBy(asc(episodes.episode_number));

    return jsonOk(c, { ...animeData, episodes: episodeList }, { message: 'Data anime berhasil disinkronkan dari Otakudesu!' });
  } catch (error: any) {
    return c.json({ status: false, message: error.message || 'Sync failed' }, 500);
  }
});

// Sync / forced live rescrape 1 episode (streams + downloads) dari Otakudesu
api.post('/episode/:endpoint/sync', async (c) => {
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

// ── Mount API Router ──
app.route('/api', api);

// ── Static Files & SPA Fallback ──
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

// Serve static assets from /assets/
app.use('/assets/*', serveStatic({ root: clientDist }));
app.use('/favicon.ico', serveStatic({ path: `${clientDist}/favicon.ico` }));
app.use('/manifest.json', serveStatic({ path: `${clientDist}/manifest.json` }));
app.use('/sw.js', serveStatic({ path: `${clientDist}/sw.js` }));
app.use('/registerSW.js', serveStatic({ path: `${clientDist}/registerSW.js` }));
app.use('/*.png', serveStatic({ root: clientDist }));
app.use('/*.svg', serveStatic({ root: clientDist }));
app.use('/*.ico', serveStatic({ root: clientDist }));

// Legacy API rewrite for direct API callers without /api prefix
app.use('*', async (c, next) => {
  const isHtml = c.req.header('accept')?.includes('text/html');
  const isStatic = c.req.path.startsWith('/assets') || c.req.path.includes('.');
  if (!isHtml && !isStatic && !c.req.path.startsWith('/api')) {
    const url = new URL(c.req.url);
    url.pathname = `/api${url.pathname}`;
    const res = await app.fetch(new Request(url.toString(), c.req.raw));
    if (res.status !== 404) return res;
  }
  await next();
});

// SPA fallback for all browser navigations
app.get('*', (c, next) => {
  const indexPath = `${clientDist}/index.html`;
  if (existsSync(indexPath)) {
    return serveStatic({ path: indexPath })(c, next);
  }
  return c.json({ status: false, message: 'Endpoint not found' }, 404);
});

// ── Server ──

const port = parseInt(process.env.PORT || '8000');

// Initialize database schema & scheduler
runAutoMigrations().catch((err) => console.error('[DB Migration Init Error]', err));
Scheduler.init();

console.log(`[NobarAnime] Server is running on port ${port}`);
console.log(`[NobarAnime] Client dist path: ${clientDist}`);

export default {
  port,
  fetch: app.fetch,
};
