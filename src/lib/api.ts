import { AnimeResponse, Anime, Episode, Schedule, Genre, Batch } from '../types/anime';
const API_BASE_URL = import.meta.env.VITE_ANIME_API_BASE_URL || 'http://localhost:8000';

export class AnimeApi {
  private static async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...(options?.headers as Record<string, string>),
    };

    if (import.meta.env.VITE_ANIME_API_KEY) {
      headers['x-api-key'] = import.meta.env.VITE_ANIME_API_KEY;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Anime API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  }

  static async getOngoing(page = 1) {
    return this.fetch<AnimeResponse<Anime[]>>(`/ongoing?page=${page}`);
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

  static async getBatch(slug: string) {
     
    return this.fetch<AnimeResponse<Batch>>(`/batch/${slug}`);
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
