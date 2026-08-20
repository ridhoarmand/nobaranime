import cron from 'node-cron';
import { ScraperService } from './scraper.js';

const SCHEDULES = {
  // Lightweight real-time check for new episodes every 3 minutes
  CHECK_NEW: '*/3 * * * *',
  // Ongoing scrape every hour at minute 0
  ONGOING_HOURLY: '0 * * * *',
  // Gentle backfill for legacy anime every 15 minutes
  GENTLE_BACKFILL: '*/15 * * * *',
  // Schedule (broadcast days) daily at 1 AM
  SCHEDULE: '0 1 * * *',
};

export const Scheduler = {
  init: () => {
    console.log('Initializing scheduler...');

    // Every 3 minutes: scan homepage releases & ongoing pages for real-time updates
    cron.schedule(SCHEDULES.CHECK_NEW, async () => {
      if (!(await ScraperService.checkDomainStatus())) return;
      console.log('[Scheduler] Checking homepage & ongoing for new episode releases...');
      await ScraperService.scrapeHomepageReleases();
      await ScraperService.checkNewEpisodes();
    });

    // Hourly: ongoing scrape (page 1, catches new anime + detail updates)
    cron.schedule(SCHEDULES.ONGOING_HOURLY, async () => {
      if (!(await ScraperService.checkDomainStatus())) return;
      console.log('[Scheduler] Hourly ongoing anime scrape...');
      await ScraperService.scrapeOngoingAnime(1);
      console.log('[Scheduler] Finished ongoing anime scrape.');
    });

    // Every 15 minutes: Gentle backfill for legacy anime records
    cron.schedule(SCHEDULES.GENTLE_BACKFILL, async () => {
      if (!(await ScraperService.checkDomainStatus())) return;
      await ScraperService.backfillLegacyAnime(3);
    });

    // Daily: broadcast schedule update
    cron.schedule(SCHEDULES.SCHEDULE, async () => {
      if (!(await ScraperService.checkDomainStatus())) return;
      console.log('[Scheduler] Updating broadcast schedule...');
      await ScraperService.scrapeSchedule();
      console.log('[Scheduler] Finished schedule update.');
    });

    console.log('Scheduler initialized.');
    console.log('  - Real-time episode check: every 3 minutes (homepage & ongoing)');
    console.log('  - Ongoing scrape: every hour');
    console.log('  - Gentle backfill: every 15 minutes (3 legacy anime)');
    console.log('  - Schedule update: daily 1 AM');

    // Auto-bootstrap & Initial Gentle Backfill
    setTimeout(async () => {
      try {
        const { db } = await import('../db/index.js');
        const { anime } = await import('../db/schema.js');
        const { sql } = await import('drizzle-orm');
        const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(anime);
        const count = Number(row?.count || 0);
        if (count === 0) {
          console.log('[Scheduler] Empty database detected on startup! Starting initial bootstrap (Ongoing, Completed & Schedule)...');
          await ScraperService.scrapeOngoingAnime(2);
          await ScraperService.scrapeCompletedAnime(1);
          await ScraperService.scrapeSchedule();
          console.log('[Scheduler] Initial bootstrap finished successfully!');
        } else {
          // Run one gentle backfill batch 10 seconds after server boot
          setTimeout(async () => {
            await ScraperService.backfillLegacyAnime(3);
          }, 10000);
        }
      } catch (err: any) {
        console.warn('[Scheduler Bootstrap Warning]', err.message);
      }
    }, 3000);
  },
};
