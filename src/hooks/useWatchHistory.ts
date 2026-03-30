import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

// Supabase model (global progress per anime)
export interface SupabaseWatchHistory {
  id: string;
  user_id: string;
  anime_slug: string;
  title: string;
  cover_url: string | null;
  progress_percent: number;
  watched_duration_sec: number;
  estimated_duration_sec: number;
  completed: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'nobaranime_watch_history';
const MAX_HISTORY = 100;
const WATCH_COMPLETE_THRESHOLD = 80;
const WATCH_HISTORY_TABLE = 'watch_history_anime';

type WatchHistoryLegacyItem = {
  animeSlug: string;
  animeTitle: string;
  animeThumb: string;
  episodeNumber: number;
  episodeSlug: string;
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
    animeThumb: item.animeThumb,
    episodeNumber: item.episodeNumber,
    episodeSlug: item.episodeSlug,
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
        .filter((item) => item && item.episodeSlug)
        .map(normalizeHistoryItem)
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    } catch (error) {
      console.error('Failed to load watch history:', error);
      return [];
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [supabaseHistory, setSupabaseHistory] = useState<SupabaseWatchHistory[]>([]);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Load user session & Supabase history on mount
  useEffect(() => {
    const loadUserAndHistory = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser ? { id: currentUser.id } : null);

        if (!currentUser) {
          setIsLoaded(true);
          return;
        }

        // Fetch watch history from Supabase for logged-in user
        const { data: supabaseData, error } = await supabase
          .from(WATCH_HISTORY_TABLE)
          .select('*')
          .eq('user_id', currentUser.id)
          .order('last_seen_at', { ascending: false });

        if (error) {
          console.error('Failed to load watch history from Supabase:', error);
        } else if (supabaseData) {
          setSupabaseHistory(supabaseData as SupabaseWatchHistory[]);

          // Migrate localStorage to Supabase if user just logged in and has local history
          const localHistory = localStorage.getItem(STORAGE_KEY);
          if (localHistory) {
            try {
              const parsed = JSON.parse(localHistory) as WatchHistoryLegacyItem[];
              if (Array.isArray(parsed) && parsed.length > 0) {
                const groupedByAnime = new Map<string, WatchHistoryLegacyItem>();
                parsed.forEach((item) => {
                  if (!groupedByAnime.has(item.animeSlug) || (item.lastSeenAt ?? 0) > (groupedByAnime.get(item.animeSlug)?.lastSeenAt ?? 0)) {
                    groupedByAnime.set(item.animeSlug, item);
                  }
                });

                const migrateData = Array.from(groupedByAnime.values()).map((item) => ({
                  user_id: currentUser.id,
                  anime_slug: item.animeSlug,
                  title: item.animeTitle,
                  cover_url: item.animeThumb || null,
                  progress_percent: item.progressPercent ?? (item.completed ? 100 : 0),
                  watched_duration_sec: item.watchedDurationSec ?? 0,
                  estimated_duration_sec: item.estimatedDurationSec ?? 0,
                  completed: item.completed ?? false,
                  last_seen_at: new Date((item.lastSeenAt ?? Date.now())).toISOString(),
                }));

                // Upsert migrated data
                await supabase.from(WATCH_HISTORY_TABLE).upsert(migrateData, { onConflict: 'user_id,anime_slug' });
                console.log('Migrated', migrateData.length, 'items to Supabase');

                // Clear localStorage after migration
                localStorage.removeItem(STORAGE_KEY);
              }
            } catch (migrationError) {
              console.error('Failed to migrate localStorage to Supabase:', migrationError);
            }
          }
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load user:', error);
        setIsLoaded(true);
      }
    };

    loadUserAndHistory();

    // Subscribe to Supabase realtime updates
    const initRealtimeChannel = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        realtimeChannelRef.current = supabase
          .channel(`${WATCH_HISTORY_TABLE}:user_id=eq.${currentUser.id}`)
          .on('postgres_changes' as any, {
              event: '*',
              schema: 'public',
              table: WATCH_HISTORY_TABLE,
              filter: `user_id=eq.${currentUser.id}`,
            },
            (payload: any) => {
              const typedPayload = payload as {
                eventType: string;
                new: SupabaseWatchHistory;
                old: SupabaseWatchHistory;
              };
              if (typedPayload.eventType === 'INSERT' || typedPayload.eventType === 'UPDATE') {
                const newRecord = typedPayload.new as SupabaseWatchHistory;
                setSupabaseHistory((prev) => {
                  const existing = prev.findIndex((h) => h.anime_slug === newRecord.anime_slug);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = newRecord;
                    return updated.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
                  }
                  return [newRecord, ...prev].sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
                });
              } else if (typedPayload.eventType === 'DELETE') {
                const deletedRecord = typedPayload.old as SupabaseWatchHistory;
                setSupabaseHistory((prev) => prev.filter((h) => h.anime_slug !== deletedRecord.anime_slug));
              }
            }
          )
          .subscribe();
      }
    };

    initRealtimeChannel();

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [supabase]);

  // Save history to localStorage whenever it changes (for non-logged-in users)
  useEffect(() => {
    if (!isLoaded || user) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  }, [history, isLoaded, user]);

  const updateWatchProgress = useCallback(
    async (item: {
      animeSlug: string;
      animeTitle: string;
      animeThumb: string;
      progressPercent: number;
      watchedDurationSec: number;
      estimatedDurationSec: number;
    }) => {
      if (!user) {
        // Fallback to localStorage for non-logged-in users
        setHistory((prev) => {
          const mockItem: WatchHistoryItem = {
            animeSlug: item.animeSlug,
            animeTitle: item.animeTitle,
            animeThumb: item.animeThumb,
            episodeNumber: 0,
            episodeSlug: item.animeSlug,
            watchedAt: Date.now(),
            lastSeenAt: Date.now(),
            progressPercent: item.progressPercent,
            watchedDurationSec: item.watchedDurationSec,
            estimatedDurationSec: item.estimatedDurationSec,
            completed: item.progressPercent >= WATCH_COMPLETE_THRESHOLD,
          };

          const filtered = prev.filter((h) => h.animeSlug !== item.animeSlug);
          return [mockItem, ...filtered].slice(0, MAX_HISTORY);
        });
        return;
      }

      // Update in Supabase for logged-in users
      try {
        const completed = item.progressPercent >= WATCH_COMPLETE_THRESHOLD;
        const { error } = await supabase.from(WATCH_HISTORY_TABLE).upsert(
          {
            user_id: user.id,
            anime_slug: item.animeSlug,
            title: item.animeTitle,
            cover_url: item.animeThumb || null,
            progress_percent: Math.min(100, item.progressPercent),
            watched_duration_sec: item.watchedDurationSec,
            estimated_duration_sec: item.estimatedDurationSec,
            completed,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,anime_slug' }
        );

        if (error) {
          console.error('Failed to update watch history:', error);
        }
      } catch (error) {
        console.error('Error updating watch progress:', error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  const getLatestWatchedForAnime = useCallback(
    (animeSlug: string) => {
      if (user) {
        const record = supabaseHistory.find((h) => h.anime_slug === animeSlug);
        if (record) {
          return {
            animeSlug: record.anime_slug,
            animeTitle: record.title,
            animeThumb: record.cover_url ?? '',
            episodeNumber: 0,
            episodeSlug: record.anime_slug,
            watchedAt: Date.now(),
            lastSeenAt: new Date(record.last_seen_at).getTime(),
            progressPercent: record.progress_percent,
            watchedDurationSec: record.watched_duration_sec,
            estimatedDurationSec: record.estimated_duration_sec,
            completed: record.completed,
          };
        }
        return null;
      }

      // Fallback for non-logged-in users (localStorage)
      const animeHistory = history.filter((h) => h.animeSlug === animeSlug);
      return animeHistory.length > 0 ? animeHistory[0] : null;
    },
    [user, supabaseHistory, history]
  );

  const getEpisodeProgress = useCallback(
    (animeSlug: string) => {
      if (user) {
        const record = supabaseHistory.find((h) => h.anime_slug === animeSlug);
        if (record) {
          return {
            progressPercent: record.progress_percent,
            completed: record.completed,
            lastSeenAt: new Date(record.last_seen_at).getTime(),
          };
        }
        return null;
      }

      // Fallback for localStorage
      const item = history.find((h) => h.animeSlug === animeSlug);
      return item ? { progressPercent: item.progressPercent, completed: item.completed, lastSeenAt: item.lastSeenAt } : null;
    },
    [user, supabaseHistory, history]
  );

  const getWatchedEpisodesForAnime = useCallback(
    (animeSlug: string) => {
      if (user) {
        const record = supabaseHistory.find((h) => h.anime_slug === animeSlug);
        return record?.completed ? [0] : [];
      }

      // Fallback for localStorage
      return history
        .filter((h) => h.animeSlug === animeSlug && h.completed)
        .map((h) => h.episodeNumber)
        .sort((a, b) => a - b);
    },
    [user, supabaseHistory, history]
  );

  const isWatched = useCallback(
    (animeSlug: string) => {
      if (user) {
        return supabaseHistory.some((h) => h.anime_slug === animeSlug && h.completed);
      }
      return history.some((h) => h.animeSlug === animeSlug && h.completed);
    },
    [user, supabaseHistory, history]
  );

  return {
    history,
    isLoaded,
    user,
    updateWatchProgress,
    getLatestWatchedForAnime,
    getEpisodeProgress,
    getWatchedEpisodesForAnime,
    isWatched,
  };
}
