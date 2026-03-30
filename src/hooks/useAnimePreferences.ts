import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface AnimePreferenceItem {
  slug: string;
  title: string;
  thumb: string;
  updatedAt: number;
}

interface AnimePreferencesState {
  followed: AnimePreferenceItem[];
  liked: AnimePreferenceItem[];
}

export interface SupabaseAnimePreference {
  id: string;
  user_id: string;
  anime_slug: string;
  anime_title: string;
  is_followed: boolean;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'nobaranime_anime_preferences';

function dedupeBySlug(items: AnimePreferenceItem[]): AnimePreferenceItem[] {
  const map = new Map<string, AnimePreferenceItem>();
  for (const item of items) {
    map.set(item.slug, item);
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function loadPreferences(): AnimePreferencesState {
  if (typeof window === 'undefined') {
    return { followed: [], liked: [] };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { followed: [], liked: [] };

    const parsed = JSON.parse(raw) as Partial<AnimePreferencesState>;
    return {
      followed: dedupeBySlug(parsed.followed || []),
      liked: dedupeBySlug(parsed.liked || []),
    };
  } catch {
    return { followed: [], liked: [] };
  }
}

export function useAnimePreferences() {
  const [state, setState] = useState<AnimePreferencesState>(() => loadPreferences());
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [supabasePreferences, setSupabasePreferences] = useState<SupabaseAnimePreference[]>([]);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Load user & Supabase preferences on mount
  useEffect(() => {
    const loadUserAndPreferences = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser ? { id: currentUser.id } : null);

        if (!currentUser) {
          setIsLoaded(true);
          return;
        }

        // Fetch preferences from Supabase
        const { data: supabaseData, error } = await supabase
          .from('user_anime_preferences')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Failed to load preferences from Supabase:', error);
        } else if (supabaseData) {
          setSupabasePreferences(supabaseData as SupabaseAnimePreference[]);

          // Migrate localStorage to Supabase if user just logged in and has local prefs
          const localPrefs = localStorage.getItem(STORAGE_KEY);
          if (localPrefs) {
            try {
              const parsed = JSON.parse(localPrefs) as AnimePreferencesState;
              const migrateData: Array<{ user_id: string; anime_slug: string; anime_title: string; is_followed: boolean; is_liked: boolean }> = [];

              // Migrate followed
              for (const item of parsed.followed) {
                migrateData.push({
                  user_id: currentUser.id,
                  anime_slug: item.slug,
                  anime_title: item.title,
                  is_followed: true,
                  is_liked: parsed.liked.some((l) => l.slug === item.slug),
                });
              }

              // Migrate liked (that aren't already followed)
              for (const item of parsed.liked) {
                if (!migrateData.some((d) => d.anime_slug === item.slug)) {
                  migrateData.push({
                    user_id: currentUser.id,
                    anime_slug: item.slug,
                    anime_title: item.title,
                    is_followed: false,
                    is_liked: true,
                  });
                }
              }

              if (migrateData.length > 0) {
                await supabase.from('user_anime_preferences').upsert(migrateData, { onConflict: 'user_id,anime_slug' });
                console.log('Migrated', migrateData.length, 'preferences to Supabase');
                localStorage.removeItem(STORAGE_KEY);
              }
            } catch (migrationError) {
              console.error('Failed to migrate localStorage preferences to Supabase:', migrationError);
            }
          }
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load user:', error);
        setIsLoaded(true);
      }
    };

    loadUserAndPreferences();

    // Subscribe to realtime updates
    const initRealtimeChannel = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        realtimeChannelRef.current = supabase
          .channel(`user_anime_preferences:user_id=eq.${currentUser.id}`)
          .on('postgres_changes' as any, {
              event: '*',
              schema: 'public',
              table: 'user_anime_preferences',
              filter: `user_id=eq.${currentUser.id}`,
            },
            (payload: any) => {
              const typedPayload = payload as {
                eventType: string;
                new: SupabaseAnimePreference;
                old: SupabaseAnimePreference;
              };
              if (typedPayload.eventType === 'INSERT' || typedPayload.eventType === 'UPDATE') {
                const newRecord = typedPayload.new as SupabaseAnimePreference;
                setSupabasePreferences((prev) => {
                  const existing = prev.findIndex((p) => p.anime_slug === newRecord.anime_slug);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = newRecord;
                    return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                  }
                  return [newRecord, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedRecord = payload.old as SupabaseAnimePreference;
                setSupabasePreferences((prev) => prev.filter((p) => p.anime_slug !== deletedRecord.anime_slug));
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

  // Save to localStorage for non-logged-in users
  useEffect(() => {
    if (!isLoaded || user) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state, isLoaded, user]);

  const isFollowed = useCallback(
    (slug: string) => {
      if (user) {
        return supabasePreferences.some((p) => p.anime_slug === slug && p.is_followed);
      }
      return state.followed.some((item) => item.slug === slug);
    },
    [user, supabasePreferences, state.followed]
  );

  const isLiked = useCallback(
    (slug: string) => {
      if (user) {
        return supabasePreferences.some((p) => p.anime_slug === slug && p.is_liked);
      }
      return state.liked.some((item) => item.slug === slug);
    },
    [user, supabasePreferences, state.liked]
  );

  const toggleFollow = useCallback(
    async (item: Omit<AnimePreferenceItem, 'updatedAt'>) => {
      if (!user) {
        // Fallback to localStorage
        setState((prev) => {
          const exists = prev.followed.some((entry) => entry.slug === item.slug);
          if (exists) {
            return {
              ...prev,
              followed: prev.followed.filter((entry) => entry.slug !== item.slug),
            };
          }
          const next: AnimePreferenceItem = { ...item, updatedAt: Date.now() };
          return {
            ...prev,
            followed: dedupeBySlug([next, ...prev.followed]),
          };
        });
        return;
      }

      // Toggle in Supabase
      try {
        const isCurrentFollowed = supabasePreferences.some((p) => p.anime_slug === item.slug && p.is_followed);
        const { error } = await supabase.from('user_anime_preferences').upsert(
          {
            user_id: user.id,
            anime_slug: item.slug,
            anime_title: item.title,
            is_followed: !isCurrentFollowed,
            is_liked: supabasePreferences.find((p) => p.anime_slug === item.slug)?.is_liked ?? false,
          },
          { onConflict: 'user_id,anime_slug' }
        );

        if (error) {
          console.error('Failed to toggle follow:', error);
        }
      } catch (error) {
        console.error('Error toggling follow:', error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, supabasePreferences]
  );

  const toggleLike = useCallback(
    async (item: Omit<AnimePreferenceItem, 'updatedAt'>) => {
      if (!user) {
        // Fallback to localStorage
        setState((prev) => {
          const exists = prev.liked.some((entry) => entry.slug === item.slug);
          if (exists) {
            return {
              ...prev,
              liked: prev.liked.filter((entry) => entry.slug !== item.slug),
            };
          }
          const next: AnimePreferenceItem = { ...item, updatedAt: Date.now() };
          return {
            ...prev,
            liked: dedupeBySlug([next, ...prev.liked]),
          };
        });
        return;
      }

      // Toggle in Supabase
      try {
        const isCurrentLiked = supabasePreferences.some((p) => p.anime_slug === item.slug && p.is_liked);
        const { error } = await supabase.from('user_anime_preferences').upsert(
          {
            user_id: user.id,
            anime_slug: item.slug,
            anime_title: item.title,
            is_followed: supabasePreferences.find((p) => p.anime_slug === item.slug)?.is_followed ?? false,
            is_liked: !isCurrentLiked,
          },
          { onConflict: 'user_id,anime_slug' }
        );

        if (error) {
          console.error('Failed to toggle like:', error);
        }
      } catch (error) {
        console.error('Error toggling like:', error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, supabasePreferences]
  );

  const followed = useMemo(() => {
    if (user) {
      return supabasePreferences
        .filter((p) => p.is_followed)
        .map((p) => ({
          slug: p.anime_slug,
          title: p.anime_title,
          thumb: '',
          updatedAt: new Date(p.updated_at).getTime(),
        }));
    }
    return state.followed;
  }, [user, supabasePreferences, state.followed]);

  const liked = useMemo(() => {
    if (user) {
      return supabasePreferences
        .filter((p) => p.is_liked)
        .map((p) => ({
          slug: p.anime_slug,
          title: p.anime_title,
          thumb: '',
          updatedAt: new Date(p.updated_at).getTime(),
        }));
    }
    return state.liked;
  }, [user, supabasePreferences, state.liked]);

  return useMemo(
    () => ({
      followed,
      liked,
      isFollowed,
      isLiked,
      toggleFollow,
      toggleLike,
      user,
      isLoaded,
    }),
    [isFollowed, isLiked, followed, liked, toggleFollow, toggleLike, user, isLoaded]
  );
}
