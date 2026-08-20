import * as cheerio from 'cheerio';
import { fetchService } from '../../lib/request.js';
import { db } from '../../db/index.js';
import { anime, episodes, batches, streams, downloads, batch_downloads, anime_genres } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { cleanEndpoint, cleanResolution, extractSize } from '../../lib/helpers.js';
import { getBaseUrl } from './domain.service.js';
import { scrapeAnimeDetail } from './anime.scraper.js';
import { ScrapedEpisodeData } from './types.js';

export const scrapeEpisode = async (endpointStr: string, animeId: number, additionalData: ScrapedEpisodeData = {}) => {
  const baseUrl = getBaseUrl();
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

      const streamsList: any[] = [];
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
        } catch {
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
                    } catch {}
                  }
                  if (responseData && responseData.includes('<iframe')) {
                    const srcMatch = responseData.match(/src="([^"]+)"/);
                    if (srcMatch) finalUrl = srcMatch[1];
                  }
                }
              } catch {}
            } else if (decoded.includes('<iframe')) {
              const srcMatch = decoded.match(/src="([^"]+)"/);
              if (srcMatch) finalUrl = srcMatch[1];
            } else {
              finalUrl = decoded;
            }
          } catch {}
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

      let epCredit: string | null = null;
      let epEncoder: string | null = null;
      $('.infoepisode p, .info-eps p, .infozingle p, .kategoz p, .info p').each((_, p) => {
        const text = $(p).text();
        const [k, ...v] = text.split(':');
        if (k && v.length > 0) {
          const val = v.join(':').trim();
          if (k.toLowerCase().includes('credit') || k.toLowerCase().includes('fansub')) {
            epCredit = val;
          } else if (k.toLowerCase().includes('encoder')) {
            epEncoder = val;
          }
        }
      });

      const downloadsList: any[] = [];
      $('.download ul li, .download-eps ul li, .moredl ul li').each((i, li) => {
        const lineText = $(li).text();
        const size = extractSize(lineText);
        const rawResolution = $(li).find('strong').text().trim();
        if (rawResolution) {
          const parts = rawResolution.split(/\s+/);
          let format = '';
          let resolution = rawResolution;
          if (parts.length >= 2) {
            format = parts[0];
            resolution = parts.slice(1).join(' ');
          }

          $(li)
            .find('a')
            .each((j, link) => {
              const provider = $(link).text().trim();
              const dlUrl = $(link).attr('href');
              if (provider && dlUrl) {
                downloadsList.push({
                  provider,
                  resolution,
                  format,
                  size,
                  url: dlUrl,
                });
              }
            });
        }
      });

      let episode_date: string | null = null;
      if (additionalData.episode_date) {
        let dateStr = additionalData.episode_date.trim().replace(/,/g, '');
        dateStr = dateStr.replace(/([A-Za-z]+)(\d{4})/, '$1 $2');
        let parsedDate: string | null = null;
        const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const regex = new RegExp(bulan.join('|'), 'i');
        if (regex.test(dateStr)) {
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
          const parsed = Date.parse(dateStr);
          if (!isNaN(parsed)) {
            parsedDate = new Date(parsed).toISOString().slice(0, 10);
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
          console.log(`[Parent Sync] Parent anime "${parentAnimeEndpoint}" not found in DB. Scraping parent anime metadata only...`);
          parentAnime = await scrapeAnimeDetail(parentAnimeEndpoint, false, false);
        }
        if (parentAnime?.id) {
          finalAnimeId = parentAnime.id;
        }
      }

      if (finalAnimeId <= 0) {
        const slugCandidate = endpointStr.replace(/-episode-\d+.*$/i, '-sub-indo').replace(/-sub-indo-sub-indo$/i, '-sub-indo');
        let parentAnime = await db.query.anime.findFirst({ where: eq(anime.endpoint, slugCandidate) });
        if (!parentAnime) {
          console.log(`[Parent Sync Fallback] Scraping candidate parent anime "${slugCandidate}" metadata only...`);
          parentAnime = await scrapeAnimeDetail(slugCandidate, false, false);
        }
        if (parentAnime?.id) {
          finalAnimeId = parentAnime.id;
        }
      }

      if (finalAnimeId <= 0) {
        console.error(`[Episode Scrape] Skipping episode "${endpointStr}" because no parent anime found in DB.`);
        return null;
      }

      if (streamsList.length === 0 && downloadsList.length === 0) {
        console.warn(`[Episode Scrape] Skipping invalid episode "${endpointStr}" because 0 streams and 0 downloads found.`);
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
        credit: epCredit ? epCredit.slice(0, 100) : null,
        encoder: epEncoder ? epEncoder.slice(0, 100) : null,
        date: episode_date,
      };

      console.log(`Saving episode: ${episodeData.title} | Anime ID: ${finalAnimeId} | Streams: ${streamsList.length} | Downloads: ${downloadsList.length}`);
      await db.transaction(async (tx) => {
        await tx.insert(episodes).values(episodeData).onDuplicateKeyUpdate({ set: episodeData });
        const epRecord = await tx.query.episodes.findFirst({
          where: eq(episodes.endpoint, endpointStr),
          columns: { id: true },
        });

        if (epRecord) {
          const epId = epRecord.id;
          await tx.delete(streams).where(eq(streams.episode_id, epId));
          if (streamsList.length > 0) {
            await tx.insert(streams).values(streamsList.map((s) => ({ ...s, episode_id: epId })));
          }

          await tx.delete(downloads).where(eq(downloads.episode_id, epId));
          if (downloadsList.length > 0) {
            await tx.insert(downloads).values(downloadsList.map((d) => ({ ...d, episode_id: epId })));
          }

          if (finalAnimeId) {
            const epList = await tx.query.episodes.findMany({ where: eq(episodes.anime_id, finalAnimeId) });
            await tx.update(anime).set({ available_eps: epList.length, updated_at: new Date() }).where(eq(anime.id, finalAnimeId));
          }

          if (animeId > 0 && animeId !== finalAnimeId) {
            const oldEps = await tx.query.episodes.findMany({ where: eq(episodes.anime_id, animeId) });
            if (oldEps.length === 0) {
              console.log(`[Orphan Cleanup] Deleting orphan anime ID ${animeId}`);
              await tx.delete(anime_genres).where(eq(anime_genres.anime_id, animeId));
              await tx.delete(anime).where(eq(anime.id, animeId));
            }
          }
        }
      });

      return { ...episodeData, streams_count: streamsList.length, downloads_count: downloadsList.length };
    }
  } catch (error: any) {
    console.error(`Error scraping episode (${endpointStr}):`, error.message);
    return null;
  }
};

export const scrapeBatchEpisode = async (endpointStr: string, animeId: number) => {
  const baseUrl = getBaseUrl();
  try {
    const existingBatch = await db.query.batches.findFirst({
      where: eq(batches.endpoint, endpointStr),
    });

    if (existingBatch) {
      const existingDownloads = await db.select({ id: batch_downloads.id }).from(batch_downloads).where(eq(batch_downloads.batch_id, existingBatch.id)).limit(1);
      if (existingDownloads.length > 0) {
        return existingBatch;
      }
      console.log(`[Batch] Existing batch found but no downloads, re-scraping: ${endpointStr}`);
    }

    let url = endpointStr.includes('lengkap') ? `${baseUrl}/lengkap/${endpointStr}` : `${baseUrl}/batch/${endpointStr}`;
    let response: any = await fetchService(url);

    if (response.status !== 200) {
      const fallbackUrl = endpointStr.includes('lengkap') ? `${baseUrl}/batch/${endpointStr}` : `${baseUrl}/lengkap/${endpointStr}`;
      response = await fetchService(fallbackUrl);
    }

    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      let batch_title = $('.batchlink > h4').first().text().trim();
      if (batch_title.length > 255) {
        batch_title = batch_title.substring(0, 252) + '...';
      }

      const downloadsList: any[] = [];
      $('.batchlink > ul > li').each((i, li) => {
        const lineText = $(li).text();
        const size = extractSize(lineText);
        const rawResolution = $(li).find('strong').text().trim();
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
              const dlUrl = $(link).attr('href');
              if (provider && dlUrl) {
                downloadsList.push({
                  provider,
                  resolution,
                  format,
                  size,
                  url: dlUrl,
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
        await tx.insert(batches).values(batchData).onDuplicateKeyUpdate({ set: batchData });
        const batchRecord = await tx.query.batches.findFirst({
          where: eq(batches.endpoint, endpointStr),
        });

        if (batchRecord) {
          const batchId = batchRecord.id;
          await tx.delete(batch_downloads).where(eq(batch_downloads.batch_id, batchId));
          if (downloadsList.length > 0) {
            await tx.insert(batch_downloads).values(downloadsList.map((d) => ({ ...d, batch_id: batchId })));
          }
        }
        return batchRecord;
      });
    }
  } catch (error: any) {
    console.error(`Error scraping batch episode (${endpointStr}):`, error.message);
    return null;
  }
};
