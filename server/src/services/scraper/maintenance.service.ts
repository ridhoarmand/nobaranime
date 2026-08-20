import * as cheerio from 'cheerio';
import { fetchService } from '../../lib/request.js';
import { db } from '../../db/index.js';
import { anime, episodes, batches, streams, downloads, anime_genres } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { cleanEndpoint, sendTelegramAlert } from '../../lib/helpers.js';
import { getBaseUrl } from './domain.service.js';
import { scrapeAnimeDetail } from './anime.scraper.js';
import { scrapeEpisode } from './episode.scraper.js';

export const scrapeHomepageReleases = async () => {
  const baseUrl = getBaseUrl();
  try {
    console.log('[Homepage] Scanning Otakudesu homepage for real-time new releases...');
    const response: any = await fetchService(baseUrl);
    if (response.status !== 200) {
      console.error('[Homepage] Failed to fetch homepage.');
      return 0;
    }

    const $ = cheerio.load(response.data);
    let updatedCount = 0;
    const releaseElements = $('.venz, .venzt, .rapi, .rseries, .postlist').find('ul > li').toArray();
    const seenHomepageEp = new Set<string>();

    for (const el of releaseElements) {
      let episodeHref = $(el).find('a[href*="/episode/"]').first().attr('href') || '';
      if (!episodeHref) {
        const thumbHref = $(el).find('.thumb > a').attr('href') || '';
        if (thumbHref.includes('/episode/')) episodeHref = thumbHref;
      }

      const animeHref = $(el).find('h2 a, .jdlflm a, a[href*="/anime/"]').first().attr('href') || '';
      const episode_endpoint = cleanEndpoint(episodeHref);
      const anime_endpoint = cleanEndpoint(animeHref);

      if (!episode_endpoint || episode_endpoint === anime_endpoint || episode_endpoint.includes('batch') || episode_endpoint.includes('anime-list')) {
        continue;
      }

      if (seenHomepageEp.has(episode_endpoint)) continue;
      seenHomepageEp.add(episode_endpoint);

      const existingEp = await db.query.episodes.findFirst({
        where: eq(episodes.endpoint, episode_endpoint),
        columns: { id: true },
      });

      if (!existingEp) {
        console.log(`[Homepage] New episode release detected on homepage: ${episode_endpoint}`);
        const epTitle = $(el).find('h2, .postlink, .jamm').text().trim() || episode_endpoint;
        const epDate = $(el).find('.newep, .zeebr').text().trim();

        let animeId = 0;
        if (anime_endpoint) {
          let parentAnime = await db.query.anime.findFirst({ where: eq(anime.endpoint, anime_endpoint) });
          if (!parentAnime) {
            parentAnime = await scrapeAnimeDetail(anime_endpoint);
          }
          if (parentAnime?.id) animeId = parentAnime.id;
        }

        await scrapeEpisode(episode_endpoint, animeId, { episode_title: epTitle, episode_date: epDate });
        updatedCount++;
      }
    }

    console.log(`[Homepage] Finished scan. New episodes scraped: ${updatedCount}`);
    return updatedCount;
  } catch (err: any) {
    console.error('[Homepage] Error scraping homepage releases:', err.message);
    return 0;
  }
};

export const checkNewEpisodes = async () => {
  const baseUrl = getBaseUrl();
  try {
    console.log('[Check] Scanning ongoing pages for new episodes...');
    let newCount = 0;

    for (let page = 1; page <= 6; page++) {
      const url = page === 1 ? `${baseUrl}/ongoing-anime/` : `${baseUrl}/ongoing-anime/page/${page}/`;
      const response: any = await fetchService(url);

      if (response.status !== 200) {
        console.log(`[Check] Failed to fetch page ${page}, stopping.`);
        break;
      }

      const $ = cheerio.load(response.data);
      const elements = $('.rapi').find('ul > li').toArray();

      if (elements.length === 0) {
        console.log(`[Check] Page ${page} is empty, stopping.`);
        break;
      }

      let pageHasNew = false;

      for (const el of elements) {
        const title = $(el).find('h2').text().trim();
        const epsRawText = $(el).find('.epz, .epztipe').text().trim();
        const epsMatch = epsRawText.match(/(\d+(\.\d+)?)/);
        const available_eps = epsMatch ? parseFloat(epsMatch[1]) : 0;
        const checkHref = $(el).find('.thumb > a').attr('href') || '';
        const checkEndpointMatch = checkHref.match(/\/anime\/([^\/]+)\/?/);
        const endpoint = checkEndpointMatch ? checkEndpointMatch[1] : '';
        if (!endpoint) continue;

        const existingAnimeByTitle = await db.query.anime.findFirst({
          where: eq(anime.title, title),
          columns: { endpoint: true },
        });

        if (existingAnimeByTitle && existingAnimeByTitle.endpoint !== endpoint) {
          const alertMsg = `🚨 <b>Endpoint Berubah!</b>\nAnime: <b>${title}</b>\nEndpoint Lama: <code>${existingAnimeByTitle.endpoint}</code>\nEndpoint Baru: <code>${endpoint}</code>\n<i>Smart Check skip duplikasi.</i>`;
          console.log(`\n[WARNING] Endpoint berubah untuk anime: ${title}. Skip insert duplikat.`);
          await sendTelegramAlert(alertMsg);
          continue;
        }

        const animeRecord = await db.query.anime.findFirst({
          where: eq(anime.endpoint, endpoint),
          columns: { id: true, available_eps: true, total_eps: true, updated_at: true },
        });

        if (!animeRecord) {
          console.log(`[Check] New anime found: ${title}`);
          await db
            .insert(anime)
            .values({
              title,
              endpoint,
              status: 'Ongoing',
              thumb: $(el).find('img').attr('src'),
              available_eps,
              total_eps: null,
            })
            .onDuplicateKeyUpdate({ set: { available_eps } });
          await scrapeAnimeDetail(endpoint);
          newCount++;
          pageHasNew = true;
          continue;
        }

        const dbEpsCount = animeRecord.available_eps || 0;
        if (available_eps > 0 && available_eps > dbEpsCount) {
          console.log(`[Check] ${title}: ${dbEpsCount} → ${available_eps} eps (new episode detected)`);
          await db.update(anime).set({ available_eps, total_eps: available_eps }).where(eq(anime.endpoint, endpoint));
          await scrapeAnimeDetail(endpoint);
          newCount++;
          pageHasNew = true;
        }
      }

      if (!pageHasNew && page > 1) {
        console.log(`[Check] Page ${page} fully up-to-date, stopping scan.`);
        break;
      }
    }

    if (newCount === 0) {
      console.log('[Check] No new episodes found.');
    } else {
      console.log(`[Check] Done. Updated ${newCount} anime.`);
    }

    await purgeOrphanAnime();
    return newCount;
  } catch (error) {
    console.error('Error checking for new episodes:', error);
    return 0;
  }
};

export const purgeOrphanAnime = async () => {
  try {
    const allEps = await db.query.episodes.findMany({ columns: { id: true, endpoint: true, title: true } });
    for (const ep of allEps) {
      const streamCount = (await db.select({ count: sql<number>`COUNT(*)` }).from(streams).where(eq(streams.episode_id, ep.id)))[0]?.count || 0;
      const dlCount = (await db.select({ count: sql<number>`COUNT(*)` }).from(downloads).where(eq(downloads.episode_id, ep.id)))[0]?.count || 0;
      if (Number(streamCount) === 0 && Number(dlCount) === 0) {
        console.log(`[Episode Cleanup] Removing corrupt episode "${ep.title}" (${ep.endpoint}) with 0 streams/downloads.`);
        await db.delete(episodes).where(eq(episodes.id, ep.id));
      }
    }

    const allAnime = await db.query.anime.findMany({ columns: { id: true, title: true, endpoint: true } });
    let purgedCount = 0;
    for (const item of allAnime) {
      const epList = await db.query.episodes.findMany({ where: eq(episodes.anime_id, item.id), columns: { id: true } });
      const batchList = await db.query.batches.findMany({ where: eq(batches.anime_id, item.id), columns: { id: true } });
      if (epList.length === 0 && batchList.length === 0) {
        console.log(`[Orphan Cleanup] Removing orphan anime "${item.title}" (${item.endpoint}, ID: ${item.id}) with 0 episodes.`);
        await db.delete(anime_genres).where(eq(anime_genres.anime_id, item.id));
        await db.delete(anime).where(eq(anime.id, item.id));
        purgedCount++;
      }
    }
    return purgedCount;
  } catch (err: any) {
    console.error('[Orphan Cleanup Error]:', err.message);
    return 0;
  }
};
