import { Hono } from 'hono';
import { db } from '../db/index.js';
import { anime } from '../db/schema.js';
import { eq, asc, and } from 'drizzle-orm';
import { ScraperService } from '../services/scraper/index.js';
import { jsonOk } from '../lib/helpers.js';

export const scheduleRoute = new Hono();

// ── GET /schedule ──
scheduleRoute.get('/schedule', async (c) => {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];
  const schedule: Record<string, any[]> = {};
  let totalItems = 0;

  for (const day of days) {
    const list = await db
      .select({
        id: anime.id,
        title: anime.title,
        endpoint: anime.endpoint,
        thumb: anime.thumb,
        total_eps: anime.total_eps,
        total_episodes: anime.total_eps,
        available_eps: anime.available_eps,
      })
      .from(anime)
      .where(and(eq(anime.broadcast_day, day), eq(anime.status, 'Ongoing')))
      .orderBy(asc(anime.title));

    schedule[day] = list;
    totalItems += list.length;
  }

  if (totalItems === 0) {
    console.log('[API /schedule] No schedule items in DB, fetching live schedule...');
    await ScraperService.scrapeSchedule();
    for (const day of days) {
      schedule[day] = await db
        .select({
          id: anime.id,
          title: anime.title,
          endpoint: anime.endpoint,
          thumb: anime.thumb,
          total_eps: anime.total_eps,
          total_episodes: anime.total_eps,
          available_eps: anime.available_eps,
        })
        .from(anime)
        .where(and(eq(anime.broadcast_day, day), eq(anime.status, 'Ongoing')))
        .orderBy(asc(anime.title));
    }
  }

  return jsonOk(c, schedule);
});
