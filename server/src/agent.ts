import { Scheduler } from './services/scheduler.js';
import { ScraperService } from './services/scraper.js';
import { db } from './db/index.js';

console.log('[Agent] Starting OtakuDesu Scraper Agent...');

const args = process.argv.slice(2);

// Parse --pages=N flag (default 1, max 6)
const pagesArg = args.find((a) => a.startsWith('--pages='));
const pages = pagesArg ? Math.min(Math.max(parseInt(pagesArg.split('=')[1]) || 1, 1), 6) : 1;

// Parse --anime <endpoint> flag
const animeArgIndex = args.indexOf('--anime');
const animeEndpoint = animeArgIndex !== -1 && args[animeArgIndex + 1] && !args[animeArgIndex + 1].startsWith('--')
  ? args[animeArgIndex + 1]
  : null;

// Parse --eps <N> flag (specific episode number)
const epsArgIndex = args.indexOf('--eps');
const epsNumber = epsArgIndex !== -1 && args[epsArgIndex + 1]
  ? parseFloat(args[epsArgIndex + 1])
  : null;

(async () => {
  try {
    // Check if domain is accessible and handle redirects
    const isDomainOk = await ScraperService.checkDomainStatus();
    if (!isDomainOk) {
      console.log('[Agent] 🚫 Domain check failed or changed. Exiting to prevent wrong scrapes.');
      process.exit(1);
    }

    // --anime <endpoint> [--eps N]
    if (args.includes('--anime') && animeEndpoint) {
      if (epsNumber !== null && !isNaN(epsNumber)) {
        // Update specific episode only (streams & downloads)
        console.log(`[Agent] Manual trigger: Update episode ${epsNumber} of "${animeEndpoint}"`);
        await ScraperService.scrapeAnimeEpisode(animeEndpoint, epsNumber);
      } else {
        // Full rescrape of anime detail + all episodes
        console.log(`[Agent] Manual trigger: Full rescrape of "${animeEndpoint}" (force re-scrape all episodes)`);
        await ScraperService.scrapeAnimeDetail(animeEndpoint, true);
      }
      process.exit(0);
    }

    // --all: Scrape everything from /anime-list/
    if (args.includes('--all')) {
      console.log('[Agent] Manual trigger: Scrape ALL anime from /anime-list/');
      console.log('[Agent] This will take a very long time. Press Ctrl+C to stop.');
      await ScraperService.scrapeAllAnime();
      process.exit(0);
    }

    // --ongoing: Scrape ongoing anime pages
    if (args.includes('--ongoing')) {
      console.log(`[Agent] Manual trigger: Scrape Ongoing Anime (${pages} page(s), max 6)`);
      await ScraperService.scrapeOngoingAnime(pages);
      process.exit(0);
    }

    // --schedule: Scrape broadcast schedule
    if (args.includes('--schedule')) {
      console.log('[Agent] Manual trigger: Scrape Schedule');
      await ScraperService.scrapeSchedule();
      process.exit(0);
    }

    // --purge-orphans: Clean up orphan anime records with 0 episodes
    if (args.includes('--purge-orphans')) {
      console.log('[Agent] Manual trigger: Purge Orphan Anime Records (0 episodes)');
      const purged = await ScraperService.purgeOrphanAnime();
      console.log(`[Agent] Done! Purged ${purged} orphan anime records.`);
      process.exit(0);
    }

    // --check: Smart check for new episodes (multi-page, stops when up-to-date)
    if (args.includes('--check')) {
      console.log('[Agent] Manual trigger: Check for New Episodes (smart multi-page scan)');
      await ScraperService.checkNewEpisodes();
      process.exit(0);
    }

    // No flags: start scheduler (continuous mode)
    console.log('[Agent] Mode: Scheduler (Continuous)');
    Scheduler.init();

    process.stdin.resume();

    const cleanup = () => {
      console.log('[Agent] Stopping...');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error) {
    console.error('[Agent] Fatal error:', error);
    process.exit(1);
  }
})();
