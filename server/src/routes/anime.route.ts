import { Hono } from 'hono';
import { db } from '../db/index.js';
import { anime, episodes, batches, genres, anime_genres, recommendations } from '../db/schema.js';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { ScraperService } from '../services/scraper/index.js';
import { paginate, jsonOk, json404, PER_PAGE } from '../lib/helpers.js';

export const animeRoute = new Hono();

const lastSyncMap = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60 * 1000;

// ── GET /ongoing ──
animeRoute.get('/ongoing', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

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
      desc(sql`ep.last_episode_created_at`),
      desc(anime.created_at),
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
    ...item,
    last_episode_number: item.last_episode_number ? Number(item.last_episode_number) : null,
    last_episode_slug: item.last_episode_slug as string | null,
  }));

  return jsonOk(c, formatted, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
  });
});

// ── GET /latest-episodes ──
animeRoute.get('/latest-episodes', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

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
      desc(sql`ep.last_episode_created_at`),
      desc(anime.created_at),
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
    ...item,
    last_episode_number: item.last_episode_number ? Number(item.last_episode_number) : null,
    last_episode_slug: item.last_episode_slug as string | null,
  }));

  return jsonOk(c, formatted, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
  });
});

// ── GET /completed ──
animeRoute.get('/completed', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

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
      desc(sql`ep.last_episode_created_at`),
      desc(anime.created_at),
      desc(anime.id)
    )
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(anime)
    .where(eq(anime.status, 'Completed'));

  const total = Number(countResult.count);

  const formatted = data.map((item) => ({
    ...item,
    last_episode_number: item.last_episode_number ? Number(item.last_episode_number) : null,
    last_episode_slug: item.last_episode_slug as string | null,
  }));

  return jsonOk(c, formatted, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
  });
});

// ── GET /anime-list ──
animeRoute.get('/anime-list', async (c) => {
  const initial = (c.req.query('initial') || '').toUpperCase();
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

  let whereCond;
  if (!initial) {
    whereCond = undefined;
  } else if (initial === '#') {
    whereCond = sql`LEFT(${anime.title}, 1) REGEXP '^[^A-Za-z]'`;
  } else if (/^[A-Z]$/.test(initial)) {
    whereCond = sql`LEFT(${anime.title}, 1) = ${initial}`;
  } else {
    return c.json({ status: false, message: 'Invalid initial filter' }, 400);
  }

  const baseQuery = db.select().from(anime);
  const data = whereCond ? baseQuery.where(whereCond) : baseQuery;
  const result = await data.orderBy(asc(anime.title)).limit(limit).offset(offset);

  const countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(anime);
  const countResult = whereCond ? countQuery.where(whereCond) : countQuery;
  const [countRow] = await countResult;
  const total = Number(countRow?.count || 0);

  return jsonOk(c, result, {
    page,
    per_page: PER_PAGE,
    total,
    total_pages: Math.ceil(total / PER_PAGE),
    initial: initial || null,
  });
});

// ── GET /anime/:endpoint ──
animeRoute.get('/anime/:endpoint', async (c) => {
  try {
    const endpoint = c.req.param('endpoint');

    let [animeData] = await db.select().from(anime).where(eq(anime.endpoint, endpoint)).limit(1);

    if (!animeData) {
      console.log(`[On-Demand] Anime "${endpoint}" not found in DB. Scraping live...`);
      const scraped = await ScraperService.scrapeAnimeDetail(endpoint);
      if (scraped) {
        [animeData] = await db.select().from(anime).where(eq(anime.endpoint, endpoint)).limit(1);
      }
    }

    if (!animeData) return json404(c, 'Anime not found');

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

    const genreList = await db
      .select({
        id: genres.id,
        name: genres.name,
      })
      .from(genres)
      .innerJoin(anime_genres, eq(genres.id, anime_genres.genre_id))
      .where(eq(anime_genres.anime_id, animeData.id));

    const batchList = await db
      .select({
        id: batches.id,
        title: batches.title,
        endpoint: batches.endpoint,
        created_at: batches.created_at,
      })
      .from(batches)
      .where(eq(batches.anime_id, animeData.id));

    const recommendationList = await db
      .select({
        id: recommendations.id,
        title: recommendations.title,
        endpoint: recommendations.endpoint,
        thumb: recommendations.thumb,
      })
      .from(recommendations)
      .where(eq(recommendations.anime_id, animeData.id));

    if (animeData.season === null || recommendationList.length === 0) {
      setTimeout(() => {
        ScraperService.scrapeAnimeDetail(endpoint, true).catch(() => {});
      }, 500);
    }

    return jsonOk(c, {
      ...animeData,
      total_episodes: animeData.total_eps,
      genres: genreList,
      episodes: episodeList,
      batches: batchList,
      recommendations: recommendationList,
    });
  } catch (err: any) {
    console.error('[API /anime/:endpoint Error]', err);
    return c.json({ status: false, message: err.message || 'Failed to load anime details' }, 500);
  }
});

// ── POST /anime/:endpoint/sync ──
animeRoute.post('/anime/:endpoint/sync', async (c) => {
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

    lastSyncMap.set(`anime:${endpoint}`, Date.now());
    c.header('X-RateLimit-Limit', '1');
    c.header('X-RateLimit-Remaining', '1');

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

// ── POST /internal/scrape/:endpoint ──
animeRoute.post('/internal/scrape/:endpoint', async (c) => {
  const endpoint = c.req.param('endpoint');
  try {
    await ScraperService.scrapeAnimeDetail(endpoint);
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
