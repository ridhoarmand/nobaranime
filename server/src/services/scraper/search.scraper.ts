import * as cheerio from 'cheerio';
import { fetchService } from '../../lib/request.js';
import { db } from '../../db/index.js';
import { anime, genres, anime_genres } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { cleanEndpoint } from '../../lib/helpers.js';
import { getBaseUrl } from './domain.service.js';

export const searchAnime = async (query: string) => {
  const baseUrl = getBaseUrl();
  try {
    if (!query || !query.trim()) return [];
    const cleanQuery = query.trim();
    const url = `${baseUrl}/?s=${encodeURIComponent(cleanQuery)}&post_type=anime`;
    const response: any = await fetchService(url);

    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      const results: any[] = [];

      $('.chivsrc li, ul.chivsrc > li, .page .chivsrc li').each((_, el) => {
        const aTag = $(el).find('h2 a').length > 0 ? $(el).find('h2 a') : $(el).find('a').first();
        const title = aTag.text().trim();
        const href = aTag.attr('href');
        const endpoint = cleanEndpoint(href);
        const thumb = $(el).find('img').attr('src');

        let status: 'Ongoing' | 'Completed' = 'Completed';
        let score: number | null = null;
        const genreNames: string[] = [];

        $(el).find('.set').each((_, setEl) => {
          const text = $(setEl).text().trim();
          const [k, ...v] = text.split(':');
          if (k && v.length > 0) {
            const val = v.join(':').trim();
            if (k.toLowerCase().includes('status')) {
              status = val.toLowerCase().includes('ongoing') ? 'Ongoing' : 'Completed';
            } else if (k.toLowerCase().includes('rating') || k.toLowerCase().includes('skor')) {
              const s = parseFloat(val);
              if (!isNaN(s)) score = s;
            } else if (k.toLowerCase().includes('genre')) {
              $(setEl).find('a').each((_, gTag) => {
                const gName = $(gTag).text().trim();
                if (gName) genreNames.push(gName);
              });
            }
          }
        });

        if (title && endpoint) {
          results.push({
            title,
            endpoint,
            thumb,
            status,
            score,
            genreNames,
          });
        }
      });

      const savedAnime: any[] = [];
      for (const item of results) {
        const animeData: any = {
          title: item.title.slice(0, 255),
          endpoint: item.endpoint.slice(0, 255),
          thumb: item.thumb,
          status: item.status,
          score: item.score,
        };

        await db.insert(anime).values(animeData).onDuplicateKeyUpdate({ set: animeData });
        const [record] = await db.select().from(anime).where(eq(anime.endpoint, item.endpoint)).limit(1);
        if (record) {
          savedAnime.push(record);
          for (const gName of item.genreNames) {
            const safeName = gName.slice(0, 100);
            await db.insert(genres).values({ name: safeName }).onDuplicateKeyUpdate({ set: { name: safeName } });
            const [gRecord] = await db.select().from(genres).where(eq(genres.name, safeName)).limit(1);
            if (gRecord) {
              await db.insert(anime_genres).values({ anime_id: record.id, genre_id: gRecord.id }).onDuplicateKeyUpdate({ set: { anime_id: record.id } });
            }
          }
        }
      }

      return savedAnime;
    }
    return [];
  } catch (err: any) {
    console.error(`[ScraperService.searchAnime Error]`, err.message);
    return [];
  }
};
