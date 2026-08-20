import { mysqlTable, varchar, text, mysqlEnum, timestamp, datetime, date, int, float, primaryKey } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const anime = mysqlTable('anime', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  japanese_title: varchar('japanese_title', { length: 255 }),
  endpoint: varchar('endpoint', { length: 255 }).notNull().unique(),
  thumb: text('thumb'),
  status: mysqlEnum('status', ['Ongoing', 'Completed']).notNull(),
  score: float('score'),
  producer: varchar('producer', { length: 255 }),
  type: varchar('type', { length: 50 }),
  studio: varchar('studio', { length: 255 }),
  duration: varchar('duration', { length: 50 }),
  release_date: date('release_date', { mode: 'string' }),
  available_eps: int('available_eps').default(0),
  total_eps: int('total_eps'),
  broadcast_day: varchar('broadcast_day', { length: 20 }),
  synopsis: text('synopsis'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const episodes = mysqlTable('episodes', {
  id: int('id').primaryKey().autoincrement(),
  anime_id: int('anime_id')
    .references(() => anime.id)
    .notNull(),
  title: varchar('title', { length: 255 }),
  episode_number: float('episode_number'),
  endpoint: varchar('endpoint', { length: 255 }).unique().notNull(),
  date: datetime('date', { mode: 'string' }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const streams = mysqlTable('streams', {
  id: int('id').primaryKey().autoincrement(),
  episode_id: int('episode_id')
    .references(() => episodes.id)
    .notNull(),
  provider: varchar('provider', { length: 100 }),
  quality: varchar('quality', { length: 50 }).default('Unknown'),
  url: text('url'),
  is_default: int('is_default').default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const downloads = mysqlTable('downloads', {
  id: int('id').primaryKey().autoincrement(),
  episode_id: int('episode_id')
    .references(() => episodes.id)
    .notNull(),
  provider: varchar('provider', { length: 100 }),
  resolution: varchar('resolution', { length: 50 }),
  format: varchar('format', { length: 20 }),
  url: text('url').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const batches = mysqlTable('batches', {
  id: int('id').primaryKey().autoincrement(),
  anime_id: int('anime_id').references(() => anime.id),
  title: varchar('title', { length: 255 }),
  endpoint: varchar('endpoint', { length: 255 }).unique().notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const batch_downloads = mysqlTable('batch_downloads', {
  id: int('id').primaryKey().autoincrement(),
  batch_id: int('batch_id')
    .references(() => batches.id)
    .notNull(),
  provider: varchar('provider', { length: 100 }),
  resolution: varchar('resolution', { length: 50 }),
  format: varchar('format', { length: 20 }),
  url: text('url').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const genres = mysqlTable('genres', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const anime_genres = mysqlTable(
  'anime_genres',
  {
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
    anime_id: int('anime_id')
      .references(() => anime.id)
      .notNull(),
    genre_id: int('genre_id')
      .references(() => genres.id)
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.anime_id, t.genre_id] }),
  }),
);

// ── Relations ──

export const animeRelations = relations(anime, ({ many }) => ({
  episodes: many(episodes),
  batches: many(batches),
  anime_genres: many(anime_genres),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  anime: one(anime, { fields: [episodes.anime_id], references: [anime.id] }),
  streams: many(streams),
  downloads: many(downloads),
}));

export const streamsRelations = relations(streams, ({ one }) => ({
  episode: one(episodes, { fields: [streams.episode_id], references: [episodes.id] }),
}));

export const downloadsRelations = relations(downloads, ({ one }) => ({
  episode: one(episodes, { fields: [downloads.episode_id], references: [episodes.id] }),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  anime: one(anime, { fields: [batches.anime_id], references: [anime.id] }),
  downloads: many(batch_downloads),
}));

export const batchDownloadsRelations = relations(batch_downloads, ({ one }) => ({
  batch: one(batches, { fields: [batch_downloads.batch_id], references: [batches.id] }),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  anime_genres: many(anime_genres),
}));

export const animeGenresRelations = relations(anime_genres, ({ one }) => ({
  anime: one(anime, { fields: [anime_genres.anime_id], references: [anime.id] }),
  genre: one(genres, { fields: [anime_genres.genre_id], references: [genres.id] }),
}));
