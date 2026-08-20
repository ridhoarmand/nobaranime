import { useCallback, useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state, isLoaded]);

  const isFollowed = useCallback(
    (slug: string) => {
      return state.followed.some((item) => item.slug === slug);
    },
    [state.followed]
  );

  const isLiked = useCallback(
    (slug: string) => {
      return state.liked.some((item) => item.slug === slug);
    },
    [state.liked]
  );

  const toggleFollow = useCallback(
    (item: Omit<AnimePreferenceItem, 'updatedAt'>) => {
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
    },
    []
  );

  const toggleLike = useCallback(
    (item: Omit<AnimePreferenceItem, 'updatedAt'>) => {
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
    },
    []
  );

  return useMemo(
    () => ({
      followed: state.followed,
      liked: state.liked,
      isFollowed,
      isLiked,
      toggleFollow,
      toggleLike,
      user: null,
      isLoaded,
    }),
    [isFollowed, isLiked, state.followed, state.liked, toggleFollow, toggleLike, isLoaded]
  );
}
