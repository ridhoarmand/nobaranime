import * as cheerio from 'cheerio';
import { fetchService } from '../lib/request.js';
import { db } from '../db/index.js';
import { anime, episodes, batches, genres, anime_genres, streams, downloads, batch_downloads } from '../db/schema.js';
import { eq, like, sql, and } from 'drizzle-orm';

const baseUrl = process.env.BASE_URL || 'https://otakudesu.blog';
const BATCH_SIZE = 3; // Max concurrent episode scrapes
const DELAY_MS = 500; // Delay between batches (ms)
const MAX_ONGOING_PAGES = 6; // Maximum pages for ongoing anime
const ALL_ANIME_DELAY_MS = 3000; // Delay between each anime in --all mode (rate limit protection)

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanEndpoint = (href: string | undefined): string => {
  if (!href) return '';
  // If it's a social share URL, extract the nested anime slug or return empty
  if (href.includes('sharer') || href.includes('facebook.com') || href.includes('twitter.com') || href.includes('whatsapp.com')) {
    const match = href.match(/\/anime\/([^\/\?#]+)/i);
    if (match) return match[1].replace(/\/$/, '').trim();
    return '';
  }

  const match = href.match(/\/(episode|anime|batch|lengkap)\/([^\/\?#]+)/i);
  if (match) return match[2].replace(/\/$/, '').trim();

  return href
    .replace(/^https?:\/\/[^\/]+\/(episode|anime|batch|lengkap)\//i, '')
    .replace(/\/$/, '')
    .trim();
};

const processBatch = async (tasks: (() => Promise<any>)[], batchSize = BATCH_SIZE, delayMs = DELAY_MS) => {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    await Promise.all(batch.map((fn) => fn()));
    if (i + batchSize < tasks.length) await delay(delayMs);
  }
};

// Helper: get DB insert status from result
const getInsertStatus = (result: any): string => {
  if (Array.isArray(result) && result[0]) {
    const affected = result[0].affectedRows;
    if (affected === 1) return 'NEW';
    if (affected === 2) return 'UPDATED';
    return 'UNCHANGED';
  }
  return 'Unknown';
};

const sendTelegramAlert = async (message: string) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Failed to send telegram alert:', error);
  }
};

export const ScraperService = {
  // ─── Check Domain Status ───
  checkDomainStatus: async () => {
    try {
      // Kita gunakan fetch native agar bisa cek redirect (manual) jika dibutuhkan
      const response = await fetch(baseUrl, { redirect: 'manual' });
      if (response.status >= 300 && response.status < 400) {
        const newLocation = response.headers.get('location');
        if (newLocation && !newLocation.includes(baseUrl)) {
          const alertMsg = `🚨 <b>Domain Berubah!</b>\nOtakudesu dialihkan ke domain baru.\nSaat ini: <code>${baseUrl}</code>\nBaru: <code>${newLocation}</code>\nHarap perbarui BASE_URL di file .env!`;
          console.log(`\n[CRITICAL] Domain telah berubah! Diarahkan ke: ${newLocation}`);
          await sendTelegramAlert(alertMsg);
          return false;
        }
      }
      return true;
    } catch (e: any) {
      console.error(`[CRITICAL] Tidak dapat menjangkau ${baseUrl}. Mungkin domain diblokir atau sedang down?`, e.message);
      const alertMsg = `🚨 <b>Domain Tidak Bisa Diakses!</b>\nTidak dapat menjangkau <code>${baseUrl}</code>.\nError: ${e.message}\nPeriksa apakah domain telah berubah atau sedang down.`;
      await sendTelegramAlert(alertMsg);
      return false; // Domain tak bisa diakses
    }
  },

  // ─── Scrape ongoing anime (max 6 pages) ───
  scrapeOngoingAnime: async (pages = 1) => {
    try {
      // Clamp pages to max
      pages = Math.min(Math.max(pages, 1), MAX_ONGOING_PAGES);
      const animeList: any[] = [];

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
            const epsText = $(el).find('.epz').text().replace('Eps', '').trim();
            const available_eps = parseInt(epsText) || 0;
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

          // Deteksi perubahan endpoint untuk anime dengan judul yang PERSIS SAMA
          const existingAnimeByTitle = await db.query.anime.findFirst({
            where: eq(anime.title, item.title),
            columns: { endpoint: true },
          });

          if (existingAnimeByTitle && existingAnimeByTitle.endpoint !== item.endpoint) {
            console.log(`\n[UPDATE] Endpoint berubah untuk anime: ${item.title}. Updating: ${existingAnimeByTitle.endpoint} -> ${item.endpoint}`);
            await db.update(anime).set({ endpoint: item.endpoint }).where(eq(anime.title, item.title));
          }

          // Check if already marked Completed in DB — skip detail scrape
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

          // Only skip completed anime if episode count has not increased
          if (existingAnime?.status === 'Completed') {
            const dbEps = await db.select({ count: sql<number>`COUNT(*)` }).from(episodes).where(eq(episodes.anime_id, existingAnime.id));
            const existingEpCount = Number(dbEps[0]?.count || 0);
            if (item.available_eps > 0 && item.available_eps <= existingEpCount) {
              console.log(`[${status}] ⏭️ Completed & episode count unchanged (${existingEpCount} eps), skipping detail.`);
              continue;
            }
            console.log(`[${status}] 🔄 Anime Completed "${item.title}" mendapat update episode baru di Otakudesu! (${existingEpCount} DB -> ${item.available_eps} Otakudesu)`);
          }

          const detail = await ScraperService.scrapeAnimeDetail(item.endpoint);
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
  },

  // ─── Scrape ALL anime from /anime-list/ (A-Z) ───
  scrapeAllAnime: async () => {
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

      // Parse A-Z listing: grab every link that points to /anime/<endpoint>/
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

      if (allAnime.length === 0) {
        console.log('[All] No anime found. Page structure may have changed.');
        return [];
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < allAnime.length; i++) {
        const item = allAnime[i];
        try {
          process.stdout.write(`[All] (${i + 1}/${allAnime.length}) ${item.title}... `);

          // Deteksi perubahan endpoint untuk anime dengan judul yang PERSIS SAMA
          const existingAnimeByTitle = await db.query.anime.findFirst({
            where: eq(anime.title, item.title),
            columns: { endpoint: true },
          });

          if (existingAnimeByTitle && existingAnimeByTitle.endpoint !== item.endpoint) {
            console.log(`\n[UPDATE] Endpoint berubah untuk anime: ${item.title}. Updating: ${existingAnimeByTitle.endpoint} -> ${item.endpoint}`);
            await db.update(anime).set({ endpoint: item.endpoint }).where(eq(anime.title, item.title));
          }

          // Upsert basic data first
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

          // Scrape full detail
          const detail = await ScraperService.scrapeAnimeDetail(item.endpoint);
          if (detail) {
            const epsCount = detail.total_eps || '?';
            console.log(`✅ ${epsCount} eps`);
            successCount++;
          } else {
            console.log(`⚠️ Detail scrape failed`);
            errorCount++;
          }

          // Rate limit delay between each anime (skip on last)
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
  },

  // ─── Scrape anime details and episodes ───
  // forceRescrape: if true, re-scrape ALL episodes even if they exist (useful for --anime command)
  scrapeAnimeDetail: async (endpointStr: string, forceRescrape = false) => {
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
          console.error(`[Scraper Guard] Response for "${endpointStr}" is not a valid anime detail page. Aborting scrape to protect DB.`);
          return null;
        }

        let thumb: string | undefined = '';
        let sinopsisArray: string[] = [];
        let details: Record<string, string> = {};
        let broadcast_day: string | null = null;

        // Parse Info
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

              // Specific parsing for Broadcast Day
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

        // Parse release_date to string 'YYYY-MM-DD' agar aman untuk kolom DATE/TIMESTAMP
        let release_date = null;
        if (details['tanggal rilis']) {
          let dateStr = details['tanggal rilis'].trim().replace(/,/g, '').replace(/\s+/g, ' ');
          // Support both 'Okt 12 2025' and '12 Okt 2025' and short/long months (ID/EN)
          const bulanMap: Record<string, string> = {
            Januari: '01',
            Jan: '01',
            February: '02',
            Februari: '02',
            Feb: '02',
            Maret: '03',
            Mar: '03',
            April: '04',
            Apr: '04',
            Mei: '05',
            May: '05',
            Juni: '06',
            Jun: '06',
            Juli: '07',
            Jul: '07',
            Agustus: '08',
            Agu: '08',
            Aug: '08',
            September: '09',
            Sep: '09',
            Oktober: '10',
            Okt: '10',
            Oct: '10',
            November: '11',
            Nov: '11',
            Desember: '12',
            Des: '12',
            December: '12',
            Dec: '12',
          };
          // Try: 'Okt 12 2025' or 'Oct 12 2025'
          let match = dateStr.match(/^(\w+) (\d{1,2}) (\d{4})$/);
          if (match && bulanMap[match[1]]) {
            const month = bulanMap[match[1]];
            const day = match[2].padStart(2, '0');
            const year = match[3];
            release_date = `${year}-${month}-${day}`;
          } else {
            // Try: '12 Okt 2025' or '12 Oct 2025'
            match = dateStr.match(/^(\d{1,2}) (\w+) (\d{4})$/);
            if (match && bulanMap[match[2]]) {
              const day = match[1].padStart(2, '0');
              const month = bulanMap[match[2]];
              const year = match[3];
              release_date = `${year}-${month}-${day}`;
            } else if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) {
              release_date = dateStr.slice(0, 10);
            } else {
              // Fallback: try Date.parse for ISO/US formats
              const parsed = Date.parse(dateStr);
              if (!isNaN(parsed)) {
                const d = new Date(parsed);
                release_date = d.toISOString().slice(0, 10);
              }
            }
          }
        }

        // total_eps dari detail['total episode']
        let total_eps = null;
        if (details['total episode']) {
          const te = parseInt(details['total episode']);
          if (!isNaN(te) && te > 0) total_eps = te;
        }

        const animeData: any = {
          title,
          endpoint: endpointStr,
          thumb,
          synopsis,
          status: status as 'Ongoing' | 'Completed',
          japanese_title,
          score: isNaN(score) ? null : score,
          producer,
          type,
          studio,
          duration,
          release_date,
          total_eps,
          broadcast_day,
        };

        const updateData = { ...animeData };
        // Mencegah penimpaan jadwal jika record sudah ada
        delete updateData.broadcast_day;

        const [animeInsertResult] = await db.insert(anime).values(animeData).onDuplicateKeyUpdate({ set: updateData });
        const animeRecord = await db.query.anime.findFirst({ where: eq(anime.endpoint, endpointStr) });
        const animeId = animeRecord?.id;
        if (!animeId) return null;

        // Upsert Genres from detail page
        if (details['genre'] && details['genre'] !== 'Unknown') {
          const names = details['genre']
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s);
          for (const name of names) {
            await db.insert(genres).values({ name }).onDuplicateKeyUpdate({ set: { name } });
            const gRecord = await db.query.genres.findFirst({ where: eq(genres.name, name) });
            if (gRecord) {
              await db
                .insert(anime_genres)
                .values({ anime_id: animeId, genre_id: gRecord.id })
                .onDuplicateKeyUpdate({ set: { anime_id: animeId } });
            }
          }
        }

        const episodeTasks: (() => Promise<any>)[] = [];
        const episodeElements = episodeElement.find('li').toArray();
        const validScrapedEndpoints = new Set<string>();

        for (const el of episodeElements) {
          const aTag = $(el).find('span > a').length > 0 ? $(el).find('span > a') : $(el).find('a').first();
          const episode_title = aTag.text().trim();
          const episode_endpoint = cleanEndpoint(aTag.attr('href'));
          const episode_date = $(el).find('.zeebr, .newep').text().trim();

          const episodeNumberMatch = episode_title.match(/Episode\s+(\d+(\.\d+)?)/i);
          const episode_number = episodeNumberMatch ? parseFloat(episodeNumberMatch[1]) : null;

          if (episode_endpoint.includes('batch')) {
            episodeTasks.push(() => ScraperService.scrapeBatchEpisode(episode_endpoint, animeId));
          } else if (episode_endpoint) {
            validScrapedEndpoints.add(episode_endpoint);
            // Skip if episode already exists in DB with valid streams & downloads (unless forceRescrape)
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
            episodeTasks.push(() => ScraperService.scrapeEpisode(episode_endpoint, animeId, { episode_title, episode_date, episode_number }));
          }
        }

        await processBatch(episodeTasks);

        // PURGE OBSOLETE EPISODES: Hapus episode di DB yang sudah tidak ada lagi di web sumber
        const existingDbEpisodes = await db.select({ id: episodes.id, endpoint: episodes.endpoint }).from(episodes).where(eq(episodes.anime_id, animeId));
        for (const dbEp of existingDbEpisodes) {
          if (!validScrapedEndpoints.has(dbEp.endpoint)) {
            console.log(`[Purge] Removing obsolete episode "${dbEp.endpoint}" from DB...`);
            await db.delete(streams).where(eq(streams.episode_id, dbEp.id));
            await db.delete(downloads).where(eq(downloads.episode_id, dbEp.id));
            await db.delete(episodes).where(eq(episodes.id, dbEp.id));
          }
        }

        // Hitung available_eps setelah batch & purge (jumlah episode riil di DB)
        const available_eps = (await db.query.episodes.findMany({ where: eq(episodes.anime_id, animeId) })).length;
        // Always sync total_eps dengan hasil parsing detail
        const finalUpdateData: any = { total_eps, available_eps };
        // Detect if anime is completed: check if last episode title contains "(End)"
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
  },

  // ─── Scrape a specific episode by number for a given anime ───
  scrapeAnimeEpisode: async (animeEndpoint: string, episodeNumber: number) => {
    try {
      console.log(`[Episode] Fetching anime detail for ${animeEndpoint} to find episode ${episodeNumber}...`);
      const url = `${baseUrl}/anime/${animeEndpoint}/`;
      const response: any = await fetchService(url);

      if (response.status !== 200) {
        console.error(`[Episode] Failed to fetch anime page: ${animeEndpoint}`);
        return null;
      }

      const $ = cheerio.load(response.data);
      const episodeElement = $('.episodelist');
      const episodeElements = episodeElement.find('li').toArray();

      // Get anime ID from DB
      const animeRecord = await db.query.anime.findFirst({
        where: eq(anime.endpoint, animeEndpoint),
        columns: { id: true },
      });

      if (!animeRecord) {
        console.error(`[Episode] Anime not found in DB: ${animeEndpoint}. Run --anime ${animeEndpoint} first.`);
        return null;
      }

      const animeId = animeRecord.id;

      // Find the episode with matching number
      for (const el of episodeElements) {
        const episode_title = $(el).find('span > a').text();
        const episode_endpoint = cleanEndpoint($(el).find('span > a').attr('href'));
        const episode_date = $(el).find('.zeebr').text();

        const episodeNumberMatch = episode_title.match(/Episode\s+(\d+(\.\d+)?)/i);
        const epNum = episodeNumberMatch ? parseFloat(episodeNumberMatch[1]) : null;

        if (epNum === episodeNumber && !episode_endpoint.includes('batch')) {
          console.log(`[Episode] Found: ${episode_title} → scraping streams & downloads...`);
          const result = await ScraperService.scrapeEpisode(episode_endpoint, animeId, {
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

      console.error(`[Episode] Episode ${episodeNumber} not found for ${animeEndpoint}. Available episodes:`);
      for (const el of episodeElements) {
        const title = $(el).find('span > a').text();
        if (!title.toLowerCase().includes('batch')) {
          console.log(`  - ${title}`);
        }
      }
      return null;
    } catch (error) {
      console.error(`Error scraping specific episode:`, error);
      return null;
    }
  },

  // ─── Scrape episode (streams + downloads) ───
  scrapeEpisode: async (endpointStr: string, animeId: number, additionalData: any = {}) => {
    try {
      const url = `${baseUrl}/episode/${endpointStr}`;
      let cookies = '';
      const response: any = await fetchService(url);

      if (response.headers && typeof response.headers.get === 'function') {
        cookies = response.headers.get('set-cookie') || '';
      }

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const streamElement = $('#lightsVideo').find('#embed_holder');
        const streamLink = streamElement.find('.responsive-embed-stream iframe, iframe').attr('src') ||
                           $('#stream1 iframe, .responsive-embed-stream iframe, .stream-frame iframe, iframe').first().attr('src') || '';

        // Scrape Mirror/Multi-Stream Sources
        const streamsList: any[] = [];

        // Add default stream if exists
        if (streamLink) {
          streamsList.push({
            provider: 'Default',
            quality: 'Unknown',
            url: streamLink,
            is_default: 1,
          });
        }

        const mirrorElements = $('.mirrorstream').find('ul');

        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

        // Get nonce using native fetch (ky library causes issues with AJAX)
        const getNonce = async (): Promise<string> => {
          try {
            const nonceParams = new URLSearchParams();
            nonceParams.append('action', 'aa1208d27f29ca340c92c66d1926f13f');

            const res = await fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
              method: 'POST',
              headers: {
                'User-Agent': userAgent,
                Referer: url,
                Origin: baseUrl,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                Cookie: cookies,
              },
              body: nonceParams,
            });

            if (res.ok) {
              const text = await res.text();
              try {
                const json = JSON.parse(text);
                return json.data || '';
              } catch {
                return '';
              }
            }
            return '';
          } catch (e) {
            return '';
          }
        };

        const nonce = await getNonce();
        const actionHash = '2a3505c93b0035d3f455df82bf976b84';

        const processMirrorLink = async (a: any, quality: string) => {
          const provider = $(a).text().trim();
          const dataContent = $(a).attr('data-content') || null;
          let finalUrl = '';

          if (dataContent) {
            try {
              const decoded = Buffer.from(dataContent, 'base64').toString('utf-8');
              if (decoded.trim().startsWith('{')) {
                const payload = JSON.parse(decoded);
                try {
                  const mirrorParams = new URLSearchParams();
                  mirrorParams.append('id', payload.id);
                  mirrorParams.append('i', payload.i);
                  mirrorParams.append('q', payload.q);
                  mirrorParams.append('nonce', nonce);
                  mirrorParams.append('action', actionHash);

                  const res = await fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
                    method: 'POST',
                    headers: {
                      'User-Agent': userAgent,
                      Referer: url,
                      Origin: baseUrl,
                      'X-Requested-With': 'XMLHttpRequest',
                      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                      Cookie: cookies,
                      Accept: '*/*',
                      'Sec-Fetch-Dest': 'empty',
                      'Sec-Fetch-Mode': 'cors',
                      'Sec-Fetch-Site': 'same-origin',
                    },
                    body: mirrorParams,
                  });

                  if (res.ok) {
                    let responseData = await res.text();
                    if (responseData && !responseData.includes('<iframe')) {
                      try {
                        responseData = Buffer.from(responseData, 'base64').toString('utf-8');
                      } catch (e) {}
                    }
                    if (responseData && responseData.includes('<iframe')) {
                      const srcMatch = responseData.match(/src="([^"]+)"/);
                      if (srcMatch) finalUrl = srcMatch[1];
                    }
                  }
                } catch (err) {}
              } else if (decoded.includes('<iframe')) {
                const srcMatch = decoded.match(/src="([^"]+)"/);
                if (srcMatch) finalUrl = srcMatch[1];
              } else {
                finalUrl = decoded;
              }
            } catch (e) {}
          }

          if (provider) {
            streamsList.push({
              provider,
              quality,
              url: finalUrl && finalUrl !== '#' && !finalUrl.startsWith('javascript') ? finalUrl : null,
              is_default: 0,
            });
          }
        };

        if (mirrorElements.length > 0) {
          for (let i = 0; i < mirrorElements.length; i++) {
            const ul = mirrorElements[i];
            const className = $(ul).attr('class') || '';
            let quality = 'Unknown';
            if (className.includes('m360p')) quality = '360p';
            else if (className.includes('m480p')) quality = '480p';
            else if (className.includes('m720p')) quality = '720p';
            else if (className.includes('m1080p')) quality = '1080p';

            const links = $(ul).find('li a').toArray();
            for (const a of links) {
              await processMirrorLink(a, quality);
            }
          }
        } else {
          const backupMirrors = $('.mirrorstream').find('a').toArray();
          for (const a of backupMirrors) {
            await processMirrorLink(a, 'Unknown');
          }
        }

        // Parse Download Links (Flattened)
        const downloadsList: any[] = [];
        $('.download ul li, .download-eps ul li, .moredl ul li').each((i, li) => {
          const rawResolution = $(li).find('strong').text().trim();
          if (rawResolution) {
            // Split "MP4 360p" into format="MP4", resolution="360p"
            const parts = rawResolution.split(/\s+/);
            let format = '';
            let resolution = rawResolution;
            if (parts.length >= 2) {
              format = parts[0]; // e.g. "MP4", "MKV"
              resolution = parts.slice(1).join(' '); // e.g. "360p", "720p (x265)"
            }

            $(li)
              .find('a')
              .each((j, link) => {
                const provider = $(link).text().trim();
                const url = $(link).attr('href');
                if (provider && url) {
                  downloadsList.push({
                    provider,
                    resolution,
                    format,
                    url,
                  });
                }
              });
          }
        });

        // Parse episode date to string 'YYYY-MM-DD HH:mm:ss'
        let episode_date: string | null = null;
        if (additionalData.episode_date) {
          let dateStr = additionalData.episode_date.trim().replace(/,/g, '');
          // Normalize: ensure space between month and year (e.g. '26 Maret2019' -> '26 Maret 2019')
          dateStr = dateStr.replace(/([A-Za-z]+)(\d{4})/, '$1 $2');
          let parsedDate: string | null = null;
          const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          const regex = new RegExp(bulan.join('|'), 'i');
          if (regex.test(dateStr)) {
            // Format: 12 Maret 2019
            const parts = dateStr.split(' ');
            if (parts.length >= 3) {
              const day = parts[0].padStart(2, '0');
              const month = (bulan.findIndex((b) => b.toLowerCase() === parts[1].toLowerCase()) + 1).toString().padStart(2, '0');
              let year = parts[2];
              if (year.length === 2) year = '20' + year;
              parsedDate = `${year}-${month}-${day}`;
            }
          } else if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            parsedDate = dateStr.slice(0, 10);
          } else {
            // Fallback: try Date.parse for ISO/US formats
            const parsed = Date.parse(dateStr);
            if (!isNaN(parsed)) {
              const d = new Date(parsed);
              parsedDate = d.toISOString().slice(0, 10);
            }
          }

          if (parsedDate) {
            const now = new Date();
            const hh = now.getHours().toString().padStart(2, '0');
            const mm = now.getMinutes().toString().padStart(2, '0');
            const ss = now.getSeconds().toString().padStart(2, '0');
            episode_date = `${parsedDate} ${hh}:${mm}:${ss}`;
          }
        }
        // Resolve parent anime link from breadcrumbs / series link on episode page (.theseries a)
        let parentHref = $('.theseries a, .cukder a[href*="/anime/"]').attr('href');
        if (!parentHref) {
          $('a[href*="/anime/"]').each((_, a) => {
            const h = $(a).attr('href') || '';
            if (!h.includes('facebook') && !h.includes('twitter') && !h.includes('sharer') && !parentHref) {
              parentHref = h;
            }
          });
        }
        const parentAnimeEndpoint = cleanEndpoint(parentHref);

        let finalAnimeId = animeId;

        if (parentAnimeEndpoint) {
          let parentAnime = await db.query.anime.findFirst({ where: eq(anime.endpoint, parentAnimeEndpoint) });
          if (!parentAnime) {
            console.log(`[Parent Sync] Parent anime "${parentAnimeEndpoint}" not found in DB. Scraping parent anime...`);
            parentAnime = await ScraperService.scrapeAnimeDetail(parentAnimeEndpoint);
          }
          if (parentAnime?.id) {
            finalAnimeId = parentAnime.id;
          }
        }

        if (finalAnimeId <= 0) {
          const slugCandidate = endpointStr.replace(/-episode-\d+.*$/i, '-sub-indo').replace(/-sub-indo-sub-indo$/i, '-sub-indo');
          let parentAnime = await db.query.anime.findFirst({ where: eq(anime.endpoint, slugCandidate) });
          if (!parentAnime) {
            console.log(`[Parent Sync Fallback] Scraping candidate parent anime "${slugCandidate}"...`);
            parentAnime = await ScraperService.scrapeAnimeDetail(slugCandidate);
          }
          if (parentAnime?.id) {
            finalAnimeId = parentAnime.id;
          }
        }

        if (finalAnimeId <= 0) {
          console.error(`[Episode Scrape] Skipping episode "${endpointStr}" because no parent anime found in DB (prevent FK error).`);
          return null;
        }

        const epTitle = $('.venutama > h1').text() || additionalData.episode_title || '';
        let epNum = additionalData.episode_number;
        if (epNum === null || epNum === undefined || isNaN(epNum) || epNum === 0) {
          const epMatch = epTitle.match(/Episode\s+(\d+(\.\d+)?)/i) || endpointStr.match(/episode-(\d+(\.\d+)?)/i);
          if (epMatch) epNum = parseFloat(epMatch[1]);
        }

        const episodeData = {
          anime_id: finalAnimeId,
          title: epTitle,
          episode_number: epNum || null,
          endpoint: endpointStr,
          date: episode_date,
        };

        // Transactional update
        console.log(`Saving episode: ${episodeData.title} | Anime ID: ${finalAnimeId} | Streams: ${streamsList.length} | Downloads: ${downloadsList.length}`);
        await db.transaction(async (tx) => {
          // Upsert Episode
          await tx.insert(episodes).values(episodeData).onDuplicateKeyUpdate({ set: episodeData });

          // Get Episode ID
          const epRecord = await tx.query.episodes.findFirst({
            where: eq(episodes.endpoint, endpointStr),
            columns: { id: true },
          });

          if (epRecord) {
            const epId = epRecord.id;

            // Replace Streams
            await tx.delete(streams).where(eq(streams.episode_id, epId));
            if (streamsList.length > 0) {
              await tx.insert(streams).values(streamsList.map((s) => ({ ...s, episode_id: epId })));
            }

            // Replace Downloads
            await tx.delete(downloads).where(eq(downloads.episode_id, epId));
            if (downloadsList.length > 0) {
              await tx.insert(downloads).values(downloadsList.map((d) => ({ ...d, episode_id: epId })));
            }

            // Sync available_eps count on parent anime record
            if (finalAnimeId) {
              const epList = await tx.query.episodes.findMany({ where: eq(episodes.anime_id, finalAnimeId) });
              await tx.update(anime).set({ available_eps: epList.length, updated_at: new Date() }).where(eq(anime.id, finalAnimeId));
            }

            // Cleanup orphan anime entry in DB if animeId changed and previous animeId has 0 episodes left
            if (animeId > 0 && animeId !== finalAnimeId) {
              const oldEps = await tx.query.episodes.findMany({ where: eq(episodes.anime_id, animeId) });
              if (oldEps.length === 0) {
                console.log(`[Orphan Cleanup] Deleting orphan anime ID ${animeId} because episode was re-linked to true parent anime ID ${finalAnimeId}`);
                await tx.delete(anime_genres).where(eq(anime_genres.anime_id, animeId));
                await tx.delete(anime).where(eq(anime.id, animeId));
              }
            }
          }
        });

        // Return simpler object for logging/debug if needed
        return { ...episodeData, streams_count: streamsList.length, downloads_count: downloadsList.length };
      }
    } catch (error: any) {
      console.error(`Error scraping episode (${endpointStr}):`, error.message);
      return null;
    }
  },

  scrapeBatchEpisode: async (endpointStr: string, animeId: number) => {
    try {
      const existingBatch = await db.query.batches.findFirst({
        where: eq(batches.endpoint, endpointStr),
      });

      if (existingBatch) {
        // Manual check to avoid modern SQL syntax issues with Drizzle's 'with'
        const existingDownloads = await db.select({ id: batch_downloads.id }).from(batch_downloads).where(eq(batch_downloads.batch_id, existingBatch.id)).limit(1);

        if (existingDownloads.length > 0) {
          return existingBatch;
        }
        console.log(`[Batch] Existing batch found but no downloads, re-scraping: ${endpointStr}`);
      }

      const url = `${baseUrl}/batch/${endpointStr}`;
      const response: any = await fetchService(url);

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        let batch_title = $('.batchlink > h4').first().text().trim();
        if (batch_title.length > 255) {
          batch_title = batch_title.substring(0, 252) + '...';
        }

        const downloadsList: any[] = [];
        $('.batchlink > ul > li').each((i, li) => {
          const rawResolution = $(li).find('strong').text().trim(); // e.g., "MP4 360p"
          if (rawResolution) {
            let format = '';
            let resolution = rawResolution;
            const parts = rawResolution.split(/\s+/);
            if (parts.length >= 2) {
              format = parts[0];
              resolution = parts.slice(1).join(' ');
            }

            $(li)
              .find('a')
              .each((j, link) => {
                const provider = $(link).text().trim();
                const url = $(link).attr('href');
                if (provider && url) {
                  downloadsList.push({
                    provider,
                    resolution,
                    format,
                    url,
                  });
                }
              });
          }
        });

        const batchData = {
          anime_id: animeId,
          title: batch_title,
          endpoint: endpointStr,
        };

        return await db.transaction(async (tx) => {
          // Insert Batch
          await tx.insert(batches).values(batchData).onDuplicateKeyUpdate({ set: batchData });

          const batchRecord = await tx.query.batches.findFirst({
            where: eq(batches.endpoint, endpointStr),
            columns: { id: true },
          });

          if (batchRecord && downloadsList.length > 0) {
            // Replace Batch Downloads
            await tx.delete(batch_downloads).where(eq(batch_downloads.batch_id, batchRecord.id));
            await tx.insert(batch_downloads).values(downloadsList.map((d) => ({ ...d, batch_id: batchRecord.id })));
          }

          return batchData;
        });
      }
    } catch (error) {
      console.error(`Error scraping batch (${endpointStr}):`, error);
      return null;
    }
  },

  scrapeSchedule: async () => {
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

          let nextUl = $(el).nextAll('ul').first();
          if (nextUl.length > 0) {
            const links = nextUl.find('li a').toArray();
            for (const link of links) {
              const title = $(link).text().trim();
              const href = $(link).attr('href') || '';
              // Extract slug using regex — safe even if domain changes
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
                await ScraperService.scrapeAnimeDetail(endpoint);
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
  },

  // ─── Real-time check: Scrape Homepage "Rilisan Terbaru" feed ───
  scrapeHomepageReleases: async () => {
    try {
      console.log('[Homepage] Scanning Otakudesu homepage for real-time new releases...');
      const response: any = await fetchService(baseUrl);
      if (response.status !== 200) {
        console.error('[Homepage] Failed to fetch homepage.');
        return 0;
      }

      const $ = cheerio.load(response.data);
      let updatedCount = 0;

      // Select items in latest releases section on homepage
      const releaseElements = $('.venz, .venzt, .rapi, .rseries, .postlist').find('ul > li').toArray();

      for (const el of releaseElements) {
        const episodeHref = $(el).find('a[href*="/episode/"]').first().attr('href') || $(el).find('.thumb > a').attr('href') || '';
        const animeHref = $(el).find('a[href*="/anime/"], h2 a').first().attr('href') || '';
        const episode_endpoint = cleanEndpoint(episodeHref);
        const anime_endpoint = cleanEndpoint(animeHref);
        if (!episode_endpoint || episode_endpoint.includes('batch') || episode_endpoint.includes('anime-list')) continue;

        // Check if episode endpoint exists in DB
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
              parentAnime = await ScraperService.scrapeAnimeDetail(anime_endpoint);
            }
            if (parentAnime?.id) animeId = parentAnime.id;
          }

          await ScraperService.scrapeEpisode(episode_endpoint, animeId, { episode_title: epTitle, episode_date: epDate });
          updatedCount++;
        }
      }

      console.log(`[Homepage] Finished scan. New episodes scraped: ${updatedCount}`);
      return updatedCount;
    } catch (err: any) {
      console.error('[Homepage] Error scraping homepage releases:', err.message);
      return 0;
    }
  },

  // ─── Smart check: multi-page ongoing scan, stop when all anime on a page are up-to-date ───
  checkNewEpisodes: async () => {
    try {
      console.log('[Check] Scanning ongoing pages for new episodes...');
      let newCount = 0;

      for (let page = 1; page <= MAX_ONGOING_PAGES; page++) {
        const url = page === 1 ? `${baseUrl}/ongoing-anime/` : `${baseUrl}/ongoing-anime/page/${page}/`;
        console.log(`[Check] Page ${page}...`);
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
          const epsText = $(el).find('.epz').text().replace('Eps', '').trim();
          const available_eps = parseInt(epsText) || 0;
          const checkHref = $(el).find('.thumb > a').attr('href') || '';
          const checkEndpointMatch = checkHref.match(/\/anime\/([^\/]+)\/?/);
          const endpoint = checkEndpointMatch ? checkEndpointMatch[1] : '';
          if (!endpoint) continue;

          // Check if endpoint changed for same title
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

          // Check DB
          const animeRecord = await db.query.anime.findFirst({
            where: eq(anime.endpoint, endpoint),
            columns: { id: true, available_eps: true, total_eps: true, updated_at: true },
          });

          if (!animeRecord) {
            // New anime not in DB yet
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
            await ScraperService.scrapeAnimeDetail(endpoint);
            newCount++;
            pageHasNew = true;
            continue;
          }

          const dbEpsCount = animeRecord.available_eps || 0;
          if (available_eps > dbEpsCount || available_eps === 0) {
            // New episodes detected
            console.log(`[Check] ${title}: ${dbEpsCount} → ${available_eps} eps (new episodes!)`);
            await db.update(anime).set({ available_eps, total_eps: available_eps }).where(eq(anime.endpoint, endpoint));
            await ScraperService.scrapeAnimeDetail(endpoint);
            newCount++;
            pageHasNew = true;
          }
        }

        // On page 1, always continue to page 2 to ensure we don't miss updates due to dirty count
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
      // Run orphan cleanup after checking new episodes
      await ScraperService.purgeOrphanAnime();
      return newCount;
    } catch (error) {
      console.error('Error checking for new episodes:', error);
      return 0;
    }
  },

  purgeOrphanAnime: async () => {
    try {
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
  },
};
