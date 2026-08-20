import { Hono } from 'hono';
import { animeRoute } from './anime.route.js';
import { episodeRoute } from './episode.route.js';
import { batchRoute } from './batch.route.js';
import { genreRoute } from './genre.route.js';
import { scheduleRoute } from './schedule.route.js';
import { searchRoute } from './search.route.js';

export const apiRouter = new Hono();

// Health & root info
apiRouter.get('/health', (c) => c.json({ status: true, message: 'NobarAnime API is healthy', uptime: process.uptime() }));

apiRouter.get('/', (c) => {
  return c.json({
    message: 'NobarAnime API',
    version: '2.0.0',
    endpoints: {
      ongoing: '/api/ongoing?page=1',
      latest_episodes: '/api/latest-episodes?page=1',
      completed: '/api/completed?page=1',
      anime_list: '/api/anime-list?page=1&initial=A',
      search: '/api/search?q=naruto',
      anime: '/api/anime/:endpoint',
      episode: '/api/episode/:endpoint',
      batch: '/api/batch/:endpoint',
      genres: '/api/genres',
      genre_anime: '/api/genres/:genre?page=1',
      schedule: '/api/schedule',
    },
  });
});

// Mount domain sub-routes
apiRouter.route('/', animeRoute);
apiRouter.route('/', episodeRoute);
apiRouter.route('/', batchRoute);
apiRouter.route('/', genreRoute);
apiRouter.route('/', scheduleRoute);
apiRouter.route('/', searchRoute);
