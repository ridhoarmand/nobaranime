import { useEffect, useState, useCallback } from 'react';

export interface WatchHistoryItem {
  animeSlug: string;
  animeTitle: string;
  animeThumb: string;
  episodeNumber: number;
  episodeSlug: string;
  watchedAt: number; // timestamp
}

const STORAGE_KEY = 'nobaranime_watch_history';
const MAX_HISTORY = 100; // Maximum items to store

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load watch history:', error);
      return [];
    }
  });
  const [isLoaded] = useState(true);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  }, [history, isLoaded]);

  // Add or update a watched episode
  const addWatched = useCallback((item: Omit<WatchHistoryItem, 'watchedAt'>) => {
    setHistory((prev) => {
      // Remove existing entry for the same episode
      const filtered = prev.filter(
        (h) => h.episodeSlug !== item.episodeSlug
      );

      // Add new entry at the beginning
      const newItem: WatchHistoryItem = {
        ...item,
        watchedAt: Date.now(),
      };

      const updated = [newItem, ...filtered];

      // Limit to MAX_HISTORY items
      if (updated.length > MAX_HISTORY) {
        return updated.slice(0, MAX_HISTORY);
      }

      return updated;
    });
  }, []);

  // Remove a specific episode from history
  const removeWatched = useCallback((episodeSlug: string) => {
    setHistory((prev) => prev.filter((h) => h.episodeSlug !== episodeSlug));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Check if an episode has been watched
  const isWatched = useCallback(
    (episodeSlug: string) => {
      return history.some((h) => h.episodeSlug === episodeSlug);
    },
    [history]
  );

  // Get the latest watched episode for an anime
  const getLatestWatchedForAnime = useCallback(
    (animeSlug: string) => {
      const animeHistory = history.filter((h) => h.animeSlug === animeSlug);
      if (animeHistory.length === 0) return null;
      // Return the most recently watched
      return animeHistory[0];
    },
    [history]
  );

  // Get all watched episodes for an anime
  const getWatchedEpisodesForAnime = useCallback(
    (animeSlug: string) => {
      return history
        .filter((h) => h.animeSlug === animeSlug)
        .map((h) => h.episodeNumber)
        .sort((a, b) => a - b);
    },
    [history]
  );

  return {
    history,
    isLoaded,
    addWatched,
    removeWatched,
    clearHistory,
    isWatched,
    getLatestWatchedForAnime,
    getWatchedEpisodesForAnime,
  };
}
