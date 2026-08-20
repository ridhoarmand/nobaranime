import * as cheerio from 'cheerio';
import { fetchService } from '../../lib/request.js';
import { db } from '../../db/index.js';
import { anime } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getBaseUrl } from './domain.service.js';
import { scrapeAnimeDetail } from './anime.scraper.js';

export const scrapeSchedule = async () => {
  const baseUrl = getBaseUrl();
  try {
    const url = `${baseUrl}/jadwal-rilis/`;
    const response: any = await fetchService(url);

    if (response.status === 200) {
      const $ = cheerio.load(response.data);

      let totalUpdated = 0;
      let totalNew = 0;

      const headers = $('h2').toArray();
      for (const el of headers) {
        let day = $(el).text().trim();
        if (/random/i.test(day)) day = 'Random';

        const nextUl = $(el).nextAll('ul').first();
        if (nextUl.length > 0) {
          const links = nextUl.find('li a').toArray();
          for (const link of links) {
            const title = $(link).text().trim();
            const href = $(link).attr('href') || '';
            const endpointMatch = href.match(/\/anime\/([^\/]+)\/?/);
            const endpoint = endpointMatch ? endpointMatch[1] : '';
            if (!endpoint) continue;

            const existing = await db.query.anime.findFirst({
              where: eq(anime.endpoint, endpoint),
              columns: { id: true },
            });

            if (existing) {
              await db.update(anime).set({ broadcast_day: day }).where(eq(anime.id, existing.id));
              totalUpdated++;
            } else {
              await db
                .insert(anime)
                .values({
                  title,
                  endpoint,
                  status: 'Ongoing',
                  broadcast_day: day,
                  available_eps: 0,
                  total_eps: null,
                })
                .onDuplicateKeyUpdate({ set: { broadcast_day: day } });

              console.log(`[Schedule] New anime: ${title} (${day}) → scraping detail...`);
              await scrapeAnimeDetail(endpoint);
              totalNew++;
            }
          }
        }
      }
      console.log(`Schedule updated: ${totalUpdated} updated, ${totalNew} new anime scraped.`);
    }
  } catch (error) {
    console.error('Error scraping schedule:', error);
  }
};
