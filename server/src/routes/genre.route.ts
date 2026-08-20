import { Hono } from 'hono';
import { db } from '../db/index.js';
import { anime, genres, anime_genres } from '../db/schema.js';
import { eq, desc, asc, sql, inArray } from 'drizzle-orm';
import { paginate, jsonOk, json404, PER_PAGE } from '../lib/helpers.js';

export const genreRoute = new Hono();

// ── GET /genres ──
genreRoute.get('/genres', async (c) => {
  const data = await db.select({ id: genres.id, name: genres.name }).from(genres).orderBy(asc(genres.name));
  return jsonOk(c, data);
});

// ── GET /genres/:genre ──
genreRoute.get('/genres/:genre', async (c) => {
  const genreName = decodeURIComponent(c.req.param('genre'));
  const page = parseInt(c.req.query('page') || '1');
  const { limit, offset } = paginate(page);

  const [genre] = await db
    .select()
    .from(genres)
    .where(sql`LOWER(${genres.name}) = LOWER(${genreName})`)
    .limit(1);
  if (!genre) return json404(c, 'Genre not found');

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
