import * as cheerio from 'cheerio';
import { fetchService } from '../../lib/request.js';
import { db } from '../../db/index.js';
import { anime, episodes, batches, genres, anime_genres, streams, downloads, recommendations } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { cleanEndpoint, delay, processBatch, getInsertStatus } from '../../lib/helpers.js';
import { getBaseUrl } from './domain.service.js';
import { scrapeEpisode, scrapeBatchEpisode } from './episode.scraper.js';
import { ScrapedAnimeItem } from './types.js';

const MAX_ONGOING_PAGES = 6;
const ALL_ANIME_DELAY_MS = 3000;

export const scrapeOngoingAnime = async (pages = 1): Promise<ScrapedAnimeItem[]> => {
  const baseUrl = getBaseUrl();
  try {
    pages = Math.min(Math.max(pages, 1), MAX_ONGOING_PAGES);
    const animeList: ScrapedAnimeItem[] = [];

    for (let page = 1; page <= pages; page++) {
      const url = page === 1 ? `${baseUrl}/ongoing-anime/` : `${baseUrl}/ongoing-anime/page/${page}/`;
      console.log(`[Ongoing] Fetching page ${page}/${pages}...`);
      const response: any = await fetchService(url);

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const elements = $('.rapi').find('ul > li').toArray();

        if (elements.length === 0) {
          console.log(`[Ongoing] Page ${page} is empty, stopping.`);
          break;
        }

        for (const el of elements) {
          const title = $(el).find('h2').text().trim();
          const thumb = $(el).find('img').attr('src');
          const epsRawText = $(el).find('.epz, .epztipe').text().trim();
          const epsMatch = epsRawText.match(/(\d+(\.\d+)?)/);
          const available_eps = epsMatch ? parseFloat(epsMatch[1]) : 0;
          const animeHref = $(el).find('.thumb > a').attr('href') || '';
          const animeEndpointMatch = animeHref.match(/\/anime\/([^\/]+)\/?/);
          const endpoint = animeEndpointMatch ? animeEndpointMatch[1] : '';

          if (endpoint) {
            animeList.push({
              title,
              thumb,
              available_eps,
              total_eps: null,
              endpoint,
              status: 'Ongoing',
            });
          }
        }
      } else {
        console.log(`[Ongoing] Failed to fetch page ${page}, stopping.`);
        break;
      }
    }

    console.log(`[Ongoing] Found ${animeList.length} anime to process.`);

    for (let i = 0; i < animeList.length; i++) {
      const item = animeList[i];
      try {
        process.stdout.write(`[Ongoing] (${i + 1}/${animeList.length}) ${item.title}... `);

        const existingAnimeByTitle = await db.query.anime.findFirst({
          where: eq(anime.title, item.title),
          columns: { endpoint: true },
        });

        if (existingAnimeByTitle && existingAnimeByTitle.endpoint !== item.endpoint) {
          console.log(`\n[UPDATE] Endpoint berubah untuk anime: ${item.title}. Updating: ${existingAnimeByTitle.endpoint} -> ${item.endpoint}`);
          await db.update(anime).set({ endpoint: item.endpoint }).where(eq(anime.title, item.title));
        }

        const existingAnime = await db.query.anime.findFirst({
          where: eq(anime.endpoint, item.endpoint),
          columns: { id: true, status: true },
        });

        const animeInsert = {
          title: item.title,
          thumb: item.thumb,
          available_eps: item.available_eps,
          total_eps: null as number | null,
          endpoint: item.endpoint,
          status: 'Ongoing' as const,
        };

        const result: any = await db.insert(anime).values(animeInsert).onDuplicateKeyUpdate({ set: animeInsert });
        const status = getInsertStatus(result);

        if (existingAnime?.status === 'Completed') {
          const dbEps = await db.select({ count: sql<number>`COUNT(*)` }).from(episodes).where(eq(episodes.anime_id, existingAnime.id));
          const existingEpCount = Number(dbEps[0]?.count || 0);
          if (item.available_eps > 0 && item.available_eps <= existingEpCount) {
            console.log(`[${status}] ⏭️ Completed & episode count unchanged (${existingEpCount} eps), skipping detail.`);
            continue;
          }
          console.log(`[${status}] 🔄 Anime Completed "${item.title}" mendapat update episode baru di Otakudesu! (${existingEpCount} DB -> ${item.available_eps} Otakudesu)`);
        }

        const detail = await scrapeAnimeDetail(item.endpoint);
        if (detail) {
          const epsCount = detail.total_eps || '?';
          console.log(`[${status}] ✅ ${epsCount} eps`);
        } else {
          console.log(`[${status}] ⚠️ Detail scrape failed`);
        }
      } catch (err: any) {
        console.log(`❌ Error: ${err.message}`);
      }
    }

    return animeList;
  } catch (error) {
    console.error('Error scraping ongoing anime:', error);
    return [];
  }
};

export const scrapeCompletedAnime = async (pages = 1): Promise<ScrapedAnimeItem[]> => {
  const baseUrl = getBaseUrl();
  try {
    pages = Math.min(Math.max(pages, 1), 6);
    const animeList: ScrapedAnimeItem[] = [];

    for (let page = 1; page <= pages; page++) {
      const url = page === 1 ? `${baseUrl}/complete-anime/` : `${baseUrl}/complete-anime/page/${page}/`;
      console.log(`[Completed] Fetching page ${page}/${pages}...`);
      const response: any = await fetchService(url);

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const elements = $('.rapi, .venz, .venzt').find('ul > li').toArray();

        if (elements.length === 0) break;

        for (const el of elements) {
          const title = $(el).find('h2, .jdlflm').text().trim();
          const thumb = $(el).find('img').attr('src');
          const epsText = $(el).find('.epz').text().replace(/[^0-9]/g, '').trim();
          const available_eps = parseInt(epsText) || 0;
          const animeHref = $(el).find('.thumb > a, a').attr('href') || '';
          const endpoint = cleanEndpoint(animeHref);

          if (endpoint && !endpoint.includes('complete-anime')) {
            animeList.push({
              title,
              thumb,
              available_eps,
              total_eps: available_eps || null,
              endpoint,
              status: 'Completed' as const,
            });
          }
        }
      }
    }

    console.log(`[Completed] Found ${animeList.length} completed anime.`);
    for (const item of animeList) {
      try {
        const animeInsert = {
          title: item.title,
          thumb: item.thumb,
          available_eps: item.available_eps,
          total_eps: item.total_eps,
          endpoint: item.endpoint,
          status: 'Completed' as const,
        };
        await db.insert(anime).values(animeInsert).onDuplicateKeyUpdate({ set: { status: 'Completed' } });
        await scrapeAnimeDetail(item.endpoint);
      } catch (e) {}
    }
    return animeList;
  } catch (err: any) {
    console.error('Error scraping completed anime:', err);
    return [];
  }
};

export const scrapeAllAnime = async () => {
  const baseUrl = getBaseUrl();
  try {
    console.log('[All] Fetching anime list from /anime-list/...');
    const url = `${baseUrl}/anime-list/`;
    const response: any = await fetchService(url);

    if (response.status !== 200) {
      console.error('[All] Failed to fetch anime list page.');
      return [];
    }

    const $ = cheerio.load(response.data);
    const allAnime: { title: string; endpoint: string }[] = [];
    const animeLinks = $('a').toArray();
    const seen = new Set<string>();

    for (const link of animeLinks) {
      const href = $(link).attr('href') || '';
      if (href.includes('/anime/') && !href.includes('/anime-list/')) {
        const endpointMatch = href.match(/\/anime\/([^\/]+)\/?/);
        const endpoint = endpointMatch ? endpointMatch[1] : '';
        if (endpoint && !seen.has(endpoint)) {
          seen.add(endpoint);
          const title = $(link).text().trim();
          if (title) {
            allAnime.push({ title, endpoint });
          }
        }
      }
    }

    console.log(`[All] Found ${allAnime.length} anime to process.`);
    if (allAnime.length === 0) return [];

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allAnime.length; i++) {
      const item = allAnime[i];
      try {
        process.stdout.write(`[All] (${i + 1}/${allAnime.length}) ${item.title}... `);

        const existingAnimeByTitle = await db.query.anime.findFirst({
          where: eq(anime.title, item.title),
          columns: { endpoint: true },
        });

        if (existingAnimeByTitle && existingAnimeByTitle.endpoint !== item.endpoint) {
          console.log(`\n[UPDATE] Endpoint berubah untuk anime: ${item.title}. Updating: ${existingAnimeByTitle.endpoint} -> ${item.endpoint}`);
          await db.update(anime).set({ endpoint: item.endpoint }).where(eq(anime.title, item.title));
        }

        await db
          .insert(anime)
          .values({
            title: item.title,
            endpoint: item.endpoint,
            status: 'Ongoing',
            available_eps: 0,
            total_eps: null,
          })
          .onDuplicateKeyUpdate({ set: { title: item.title } });

        const detail = await scrapeAnimeDetail(item.endpoint);
        if (detail) {
          console.log(`✅ ${detail.total_eps || '?'} eps`);
          successCount++;
        } else {
          console.log(`⚠️ Detail scrape failed`);
          errorCount++;
        }

        if (i < allAnime.length - 1) {
          await delay(ALL_ANIME_DELAY_MS);
        }
      } catch (err: any) {
        console.log(`❌ Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n[All] Done! Success: ${successCount}, Errors: ${errorCount}, Total: ${allAnime.length}`);
    return allAnime;
  } catch (error) {
    console.error('Error scraping all anime:', error);
    return [];
  }
};

export const scrapeAnimeDetail = async (endpointStr: string, forceRescrape = false, scrapeEpisodes = true) => {
  const baseUrl = getBaseUrl();
  try {
    const url = `${baseUrl}/anime/${endpointStr}/`;
    const response: any = await fetchService(url);

    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      const pageTitle = $('title').text() || '';
      const isCloudflare = pageTitle.includes('One moment, please') || pageTitle.includes('Just a moment...') || pageTitle.includes('Attention Required!');
      const infoElement = $('.fotoanime');
      const episodeElement = $('.episodelist');

      const hasAnimeInfo = infoElement.length > 0 || $('.infozin, .infozings').length > 0;
      const hasEpisodeList = episodeElement.length > 0;

      if (isCloudflare || (!hasAnimeInfo && !hasEpisodeList)) {
        console.error(`[Scraper Guard] Response for "${endpointStr}" is not a valid anime detail page. Aborting scrape.`);
        return null;
      }

      let thumb: string | undefined = '';
      let sinopsisArray: string[] = [];
      let details: Record<string, string> = {};
      let broadcast_day: string | null = null;

      const infoHtml = infoElement.html();
      if (infoHtml) {
        thumb = infoElement.find('img').attr('src');

        infoElement.find('.sinopc > p, .sinopc, .sinop p, .sinopsis p').each((_, p) => {
          const text = $(p).text().trim();
          if (text && !sinopsisArray.includes(text)) sinopsisArray.push(text);
        });

        const pElements = infoElement.find('.infozingle > p, .infozin > p, .infozings > p, .infozingle p, .infozin p, .infozings p').toArray();
        for (const p of pElements) {
          const text = $(p).text();
          const [key, ...valueParts] = text.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            details[key.trim().toLowerCase()] = value;

            if (key.toLowerCase().includes('jadwal') || key.toLowerCase().includes('tayang')) {
              const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];
              for (const d of days) {
                if (value.toLowerCase().includes(d.toLowerCase())) {
                  broadcast_day = d;
                  break;
                }
              }
            }
          }
        }
      }

      const title = $('.jdlrx > h1').text().trim() ||
                    $('.jdlnd').text().trim() ||
                    details['judul'] ||
                    endpointStr.replace(/-/g, ' ');
      const synopsis = sinopsisArray.join('\n');
      const status = details['status']?.includes('Ongoing') ? 'Ongoing' : 'Completed';

      const japanese_title = details['japanese'];
      const score = parseFloat(details['skor']);
      const producer = details['produser'];
      const type = details['tipe'];
      const studio = details['studio'];
      const duration = details['durasi'];
      const season = details['musim'] || details['season'] || details['musim tayang'] || null;

      let release_date = null;
      if (details['tanggal rilis']) {
        let dateStr = details['tanggal rilis'].trim().replace(/,/g, '').replace(/\s+/g, ' ');
        const bulanMap: Record<string, string> = {
          Januari: '01', Jan: '01', February: '02', Februari: '02', Feb: '02',
          Maret: '03', Mar: '03', April: '04', Apr: '04', Mei: '05', May: '05',
          Juni: '06', Jun: '06', Juli: '07', Jul: '07', Agustus: '08', Aug: '08',
          September: '09', Sep: '09', Oktober: '10', Oct: '10',
          November: '11', Nov: '11', Desember: '12', Dec: '12',
        };
        const dateParts = dateStr.split(' ');
        if (dateParts.length === 3) {
          const monthIdx = bulanMap[dateParts[0]];
          const monthIdxAlt = bulanMap[dateParts[1]];
          if (monthIdx) {
            const day = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            release_date = `${year}-${monthIdx}-${day}`;
          } else if (monthIdxAlt) {
            const day = dateParts[0].padStart(2, '0');
            const year = dateParts[2];
            release_date = `${year}-${monthIdxAlt}-${day}`;
          }
        }
      }

      let total_eps: number | null = null;
      if (details['total episode']) {
        const parsed = parseInt(details['total episode']);
        if (!isNaN(parsed) && parsed > 0) total_eps = parsed;
      }

      const animeData: any = {
        title,
        japanese_title: japanese_title || null,
        score: !isNaN(score) ? score : null,
        producer: producer || null,
        type: type || null,
        status,
        total_eps,
        duration: duration || null,
        release_date,
        studio: studio || null,
        synopsis: synopsis || null,
        thumb: thumb || null,
        endpoint: endpointStr,
        broadcast_day,
        season,
      };

      const existingAnimeByTitle = await db.query.anime.findFirst({
        where: eq(anime.title, title),
        columns: { endpoint: true },
      });
      if (existingAnimeByTitle && existingAnimeByTitle.endpoint !== endpointStr) {
        console.log(`[UPDATE] Endpoint sync untuk anime: ${title}. Updating: ${existingAnimeByTitle.endpoint} -> ${endpointStr}`);
        await db.update(anime).set({ endpoint: endpointStr }).where(eq(anime.title, title));
      }

      const existingAnime = await db.query.anime.findFirst({
        where: eq(anime.endpoint, endpointStr),
        columns: { id: true, status: true },
      });

      if (existingAnime?.status === 'Completed' && animeData.status === 'Ongoing') {
        delete animeData.status;
      }

      await db.insert(anime).values(animeData).onDuplicateKeyUpdate({ set: animeData });

      const animeRecord = await db.query.anime.findFirst({
        where: eq(anime.endpoint, endpointStr),
      });

      if (!animeRecord) {
        console.error('Failed to retrieve inserted/updated anime record');
        return null;
      }

      const animeId = animeRecord.id;

      // Parse recommendations
      const scrapedRecommendations: { title: string; endpoint: string; thumb?: string }[] = [];
      $('.relat, .isi-anime-terkait, .recommendation, .isi-konten-terkait').find('a, .isi-anime-box').each((_, recEl) => {
        const aTag = $(recEl).is('a') ? $(recEl) : $(recEl).find('a').first();
        const recHref = aTag.attr('href') || '';
        const recEndpoint = cleanEndpoint(recHref);
        const recTitle = aTag.find('h2, .judul-anime, .title').text().trim() || aTag.attr('title') || $(recEl).find('.judul-anime').text().trim();
        const recThumb = aTag.find('img').attr('src') || $(recEl).find('img').attr('src') || '';

        if (recEndpoint && recTitle && recEndpoint !== endpointStr && !scrapedRecommendations.some((r) => r.endpoint === recEndpoint)) {
          scrapedRecommendations.push({
            title: recTitle,
            endpoint: recEndpoint,
            thumb: recThumb || undefined,
          });
        }
      });

      if (scrapedRecommendations.length > 0) {
        await db.delete(recommendations).where(eq(recommendations.anime_id, animeId));
        await db.insert(recommendations).values(
          scrapedRecommendations.map((r) => ({
            anime_id: animeId,
            title: r.title,
            endpoint: r.endpoint,
            thumb: r.thumb || null,
          }))
        );
      }

      // Upsert Genres
      if (details['genre'] && details['genre'] !== 'Unknown') {
        const names = details['genre'].split(',').map((s) => s.trim()).filter(Boolean);
        for (const name of names) {
          const safeName = name.slice(0, 100);
          await db.insert(genres).values({ name: safeName }).onDuplicateKeyUpdate({ set: { name: safeName } });
          const gRecord = await db.query.genres.findFirst({ where: eq(genres.name, safeName) });
          if (gRecord) {
            await db
              .insert(anime_genres)
              .values({ anime_id: animeId, genre_id: gRecord.id })
              .onDuplicateKeyUpdate({ set: { anime_id: animeId } });
          }
        }
      }

      if (!scrapeEpisodes) {
        return animeRecord;
      }

      const episodeTasks: (() => Promise<any>)[] = [];
      const episodeElements = episodeElement.find('li').toArray();
      const validScrapedEndpoints = new Set<string>();

      for (const el of episodeElements) {
        const aTag = $(el).find('span > a').length > 0 ? $(el).find('span > a') : $(el).find('a').first();
        const episode_title = aTag.text().trim();
        const episode_endpoint = cleanEndpoint(aTag.attr('href'));
        const episode_date = $(el).find('.zeebr, .newep').text().trim();

        if (!episode_endpoint || validScrapedEndpoints.has(episode_endpoint)) continue;
        validScrapedEndpoints.add(episode_endpoint);

        const episodeNumberMatch = episode_title.match(/Episode\s+(\d+(\.\d+)?)/i);
        const episode_number = episodeNumberMatch ? parseFloat(episodeNumberMatch[1]) : null;

        if (episode_endpoint.includes('batch') || episode_endpoint.includes('lengkap')) {
          episodeTasks.push(() => scrapeBatchEpisode(episode_endpoint, animeId));
        } else {
          if (!forceRescrape) {
            const existingEp = await db.query.episodes.findFirst({
              where: eq(episodes.endpoint, episode_endpoint),
              columns: { id: true },
            });
            if (existingEp) {
              const [streamRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(streams).where(eq(streams.episode_id, existingEp.id));
              const [downloadRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(downloads).where(eq(downloads.episode_id, existingEp.id));
              if (Number(streamRow?.count || 0) > 0 && Number(downloadRow?.count || 0) > 0) continue;
            }
          }
          episodeTasks.push(() => scrapeEpisode(episode_endpoint, animeId, { episode_title, episode_date, episode_number }));
        }
      }

      await processBatch(episodeTasks);

      // Purge obsolete episodes
      const existingDbEpisodes = await db.select({ id: episodes.id, endpoint: episodes.endpoint }).from(episodes).where(eq(episodes.anime_id, animeId));
      for (const dbEp of existingDbEpisodes) {
        if (!validScrapedEndpoints.has(dbEp.endpoint)) {
          console.log(`[Purge] Removing obsolete episode "${dbEp.endpoint}" from DB...`);
          await db.delete(streams).where(eq(streams.episode_id, dbEp.id));
          await db.delete(downloads).where(eq(downloads.episode_id, dbEp.id));
          await db.delete(episodes).where(eq(episodes.id, dbEp.id));
        }
      }

      const available_eps = (await db.query.episodes.findMany({ where: eq(episodes.anime_id, animeId) })).length;
      const finalUpdateData: any = { total_eps, available_eps };
      const lastEpisode = episodeElements.length > 0 ? $(episodeElements[0]).find('span > a').text() : '';
      if (lastEpisode && lastEpisode.includes('(End)')) {
        finalUpdateData.status = 'Completed';
        console.log(`  → Marked as Completed (${available_eps} eps)`);
      }
      await db.update(anime).set(finalUpdateData).where(eq(anime.id, animeId));
      return animeRecord;
    }
  } catch (error) {
    console.error(`Error scraping anime detail (${endpointStr}):`, error);
    return null;
  }
};

export const scrapeAnimeEpisode = async (animeEndpoint: string, episodeNumber: number) => {
  const baseUrl = getBaseUrl();
  try {
    console.log(`[Episode] Fetching anime detail for ${animeEndpoint} to find episode ${episodeNumber}...`);
    const url = `${baseUrl}/anime/${animeEndpoint}/`;
    const response: any = await fetchService(url);

    if (response.status !== 200) {
      console.error(`[Episode] Failed to fetch anime page: ${animeEndpoint}`);
      return null;
    }

    const $ = cheerio.load(response.data);
    const episodeElements = $('.episodelist').find('li').toArray();

    const animeRecord = await db.query.anime.findFirst({
      where: eq(anime.endpoint, animeEndpoint),
      columns: { id: true },
    });

    if (!animeRecord) {
      console.error(`[Episode] Anime not found in DB: ${animeEndpoint}. Run --anime ${animeEndpoint} first.`);
      return null;
    }

    const animeId = animeRecord.id;

    for (const el of episodeElements) {
      const episode_title = $(el).find('span > a').text();
      const episode_endpoint = cleanEndpoint($(el).find('span > a').attr('href'));
      const episode_date = $(el).find('.zeebr').text();

      const episodeNumberMatch = episode_title.match(/Episode\s+(\d+(\.\d+)?)/i);
      const epNum = episodeNumberMatch ? parseFloat(episodeNumberMatch[1]) : null;

      if (epNum === episodeNumber && !episode_endpoint.includes('batch')) {
        console.log(`[Episode] Found: ${episode_title} → scraping streams & downloads...`);
        const result = await scrapeEpisode(episode_endpoint, animeId, {
          episode_title,
          episode_date,
          episode_number: epNum,
        });

        if (result) {
          console.log(`[Episode] ✅ Done! Streams: ${result.streams_count}, Downloads: ${result.downloads_count}`);
        } else {
          console.log(`[Episode] ⚠️ Scrape failed for episode ${episodeNumber}`);
        }
        return result;
      }
    }

    console.error(`[Episode] Episode ${episodeNumber} not found for ${animeEndpoint}.`);
    return null;
  } catch (error: any) {
    console.error(`[Episode] Error scraping anime episode:`, error.message);
    return null;
  }
};
