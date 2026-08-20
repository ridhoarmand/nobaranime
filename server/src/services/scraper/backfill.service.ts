import { db } from '../../db/index.js';
import { anime } from '../../db/schema.js';
import { sql } from 'drizzle-orm';
import { delay } from '../../lib/helpers.js';
import { scrapeAnimeDetail } from './anime.scraper.js';

export const backfillLegacyAnime = async (batchLimit = 3) => {
  try {
    const pendingAnime = await db
      .select({ id: anime.id, endpoint: anime.endpoint, title: anime.title, status: anime.status })
      .from(anime)
      .where(sql`${anime.season} IS NULL`)
      .orderBy(sql`CASE WHEN ${anime.status} = 'Ongoing' THEN 0 ELSE 1 END`, sql`${anime.updated_at} DESC`)
      .limit(batchLimit);

    if (pendingAnime.length === 0) return 0;

    console.log(`[Gentle Backfill] Found ${pendingAnime.length} anime needing metadata sync...`);
    for (const item of pendingAnime) {
      console.log(`[Gentle Backfill] Syncing: "${item.title}" (${item.endpoint})`);
      await scrapeAnimeDetail(item.endpoint, true);
      await delay(12000); // 12 seconds gentle throttle
    }
    return pendingAnime.length;
  } catch (err: any) {
    console.error('[Gentle Backfill Error]:', err.message);
    return 0;
  }
};
