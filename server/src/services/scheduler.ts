import cron from 'node-cron';
import { ScraperService } from './scraper.js';

const SCHEDULES = {
  // Lightweight real-time check for new episodes every 3 minutes
  CHECK_NEW: '*/3 * * * *',
  // Ongoing scrape every hour at minute 0
  ONGOING_HOURLY: '0 * * * *',
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
    console.log('  - Schedule update: daily 1 AM');
  },
};
