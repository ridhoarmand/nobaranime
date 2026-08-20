import { checkDomainStatus, getBaseUrl, setBaseUrl, normalizeThumbUrl } from './domain.service.js';
import {
  scrapeOngoingAnime,
  scrapeCompletedAnime,
  scrapeAllAnime,
  scrapeAnimeDetail,
  scrapeAnimeEpisode,
} from './anime.scraper.js';
import { scrapeEpisode, scrapeBatchEpisode } from './episode.scraper.js';
import { scrapeSchedule } from './schedule.scraper.js';
import { searchAnime } from './search.scraper.js';
import { backfillLegacyAnime } from './backfill.service.js';
import { scrapeHomepageReleases, checkNewEpisodes, purgeOrphanAnime } from './maintenance.service.js';

export const ScraperService = {
  checkDomainStatus,
  getBaseUrl,
  setBaseUrl,
  normalizeThumbUrl,
  scrapeOngoingAnime,
  scrapeCompletedAnime,
  scrapeAllAnime,
  scrapeAnimeDetail,
  scrapeAnimeEpisode,
  scrapeEpisode,
  scrapeBatchEpisode,
  scrapeSchedule,
  scrapeHomepageReleases,
  checkNewEpisodes,
  purgeOrphanAnime,
  searchAnime,
  backfillLegacyAnime,
};

export {
  checkDomainStatus,
  getBaseUrl,
  setBaseUrl,
  normalizeThumbUrl,
  scrapeOngoingAnime,
  scrapeCompletedAnime,
  scrapeAllAnime,
  scrapeAnimeDetail,
  scrapeAnimeEpisode,
  scrapeEpisode,
  scrapeBatchEpisode,
  scrapeSchedule,
  scrapeHomepageReleases,
  checkNewEpisodes,
  purgeOrphanAnime,
  searchAnime,
  backfillLegacyAnime,
};
