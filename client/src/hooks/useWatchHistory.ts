import { useEffect, useState, useCallback } from 'react';

export interface WatchHistoryItem {
  animeSlug: string;
  animeTitle: string;
  animeThumb: string;
  episodeNumber: number;
  episodeSlug: string;
  watchedAt: number;
  lastSeenAt: number;
  progressPercent: number;
  watchedDurationSec: number;
  estimatedDurationSec: number;
  completed: boolean;
}

export type UpdateWatchPayload = {
  animeSlug: string;
  animeTitle: string;
  animeThumb?: string;
  episodeNumber?: number;
  episodeSlug?: string;
  progressPercent: number;
  watchedDurationSec?: number;
  estimatedDurationSec?: number;
  completed?: boolean;
};

const STORAGE_KEY = 'nobaranime_watch_history';
const MAX_HISTORY = 100;
const WATCH_COMPLETE_THRESHOLD = 80;

type WatchHistoryLegacyItem = {
  animeSlug: string;
  animeTitle: string;
  animeThumb: string;
  episodeNumber?: number;
  episodeSlug?: string;
  watchedAt?: number;
  lastSeenAt?: number;
  progressPercent?: number;
  watchedDurationSec?: number;
  estimatedDurationSec?: number;
  completed?: boolean;
};

function normalizeHistoryItem(item: WatchHistoryLegacyItem): WatchHistoryItem {
  const watchedAt = item.watchedAt ?? Date.now();
  const progressPercent = Math.max(0, Math.min(100, item.progressPercent ?? (item.completed ? 100 : 0)));
  const completed = item.completed ?? progressPercent >= WATCH_COMPLETE_THRESHOLD;

  return {
    animeSlug: item.animeSlug,
    animeTitle: item.animeTitle,
    animeThumb: item.animeThumb || '',
    episodeNumber: item.episodeNumber ?? 0,
    episodeSlug: item.episodeSlug ?? item.animeSlug,
    watchedAt,
    lastSeenAt: item.lastSeenAt ?? watchedAt,
    progressPercent,
    watchedDurationSec: item.watchedDurationSec ?? 0,
    estimatedDurationSec: item.estimatedDurationSec ?? 0,
    completed,
  };
}

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored) as WatchHistoryLegacyItem[];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item) => item && (item.episodeSlug || item.animeSlug))
        .map(normalizeHistoryItem)
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    } catch (error) {
      console.error('Failed to load watch history:', error);
      return [];
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save watch history to localStorage:', error);
    }
  }, [history, isLoaded]);

  const updateWatchProgress = useCallback(
    (item: UpdateWatchPayload) => {
      const now = Date.now();
      const progressPercent = Math.max(0, Math.min(100, Math.round(item.progressPercent)));
      const completed = item.completed ?? progressPercent >= WATCH_COMPLETE_THRESHOLD;

      const nextItem: WatchHistoryItem = {
        animeSlug: item.animeSlug,
        animeTitle: item.animeTitle,
        animeThumb: item.animeThumb || '',
        episodeNumber: item.episodeNumber ?? 0,
        episodeSlug: item.episodeSlug ?? item.animeSlug,
        progressPercent,
        watchedDurationSec: item.watchedDurationSec ?? 0,
        estimatedDurationSec: item.estimatedDurationSec ?? 0,
        completed,
        watchedAt: now,
        lastSeenAt: now,
      };

      setHistory((prev) => {
        const withoutCurrent = prev.filter((h) => h.animeSlug !== item.animeSlug);
        const next = [nextItem, ...withoutCurrent].slice(0, MAX_HISTORY);
        return next;
      });
    },
    []
  );

  const getLatestWatchedForAnime = useCallback(
    (animeSlug: string) => {
      const animeHistory = history.filter((h) => h.animeSlug === animeSlug);
      return animeHistory.length > 0 ? animeHistory[0] : null;
    },
    [history]
  );

  const getEpisodeProgress = useCallback(
    (animeSlug: string) => {
      const item = history.find((h) => h.animeSlug === animeSlug);
      return item ? { progressPercent: item.progressPercent, completed: item.completed, lastSeenAt: item.lastSeenAt } : null;
    },
    [history]
  );

  const getWatchedEpisodesForAnime = useCallback(
    (animeSlug: string) => {
      return history
        .filter((h) => h.animeSlug === animeSlug && h.completed)
        .map((h) => h.episodeNumber)
        .sort((a, b) => a - b);
    },
    [history]
  );

  const isWatched = useCallback(
    (animeSlug: string) => {
      return history.some((h) => h.animeSlug === animeSlug && h.completed);
    },
    [history]
  );

  return {
    history,
    isLoaded,
    user: null,
    updateWatchProgress,
    getLatestWatchedForAnime,
    getEpisodeProgress,
    getWatchedEpisodesForAnime,
    isWatched,
  };
}
