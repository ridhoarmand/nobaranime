import { AnimeResponse, Anime, Episode, Schedule, Genre } from '../types/anime';
const API_BASE_URL = import.meta.env.VITE_ANIME_API_BASE_URL || 'http://localhost:8000';

export class AnimeApi {
  private static async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (import.meta.env.VITE_ANIME_API_KEY) {
      headers['x-api-key'] = import.meta.env.VITE_ANIME_API_KEY;
    }

    const startTime = import.meta.env.DEV ? performance.now() : 0;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const endTime = import.meta.env.DEV ? performance.now() : 0;

    if (import.meta.env.DEV) {
      console.log(`📡 API HIT [${res.status}]: ${API_BASE_URL}${endpoint} - ${(endTime - startTime).toFixed(2)}ms`);
    }

    if (!res.ok) {
      throw new Error(`Anime API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  }

  static async getOngoing(page = 1) {
    const res = await this.fetch<AnimeResponse<Anime[]>>(`/ongoing?page=${page}`);

    // START TEMPORARY MOCK for latest_episode
    if (res.data) {
      res.data = res.data.map((anime) => ({
        ...anime,
        latest_episode: anime.latest_episode || {
          episode_number: Math.floor(Math.random() * 20) + 1, // Random ep number for demo
          date: new Date().toISOString().split('T')[0], // Today's date
        },
      }));
    }
    // END TEMPORARY MOCK

    return res;
  }

  static async getCompleted(page = 1) {
    return this.fetch<AnimeResponse<Anime[]>>(`/completed?page=${page}`);
  }

  static async getSearch(query: string) {
    return this.fetch<AnimeResponse<Anime[]>>(`/search?q=${encodeURIComponent(query)}`);
  }

  static async getAnimeList(page = 1, initial = 'A') {
    return this.fetch<AnimeResponse<Anime[]>>(`/anime-list?page=${page}&initial=${encodeURIComponent(initial)}`);
  }

  static async getDetail(slug: string) {
    return this.fetch<AnimeResponse<Anime>>(`/anime/${slug}`);
  }

  static async getEpisode(slug: string) {
    return this.fetch<AnimeResponse<Episode>>(`/episode/${slug}`);
  }

  static async getSchedule() {
    return this.fetch<AnimeResponse<Schedule>>(`/schedule`);
  }

  static async getGenres() {
    return this.fetch<AnimeResponse<Genre[]>>(`/genres`);
  }

  static async getByGenre(genre: string, page = 1) {
    return this.fetch<AnimeResponse<Anime[]>>(`/genres/${genre}?page=${page}`);
  }
}
