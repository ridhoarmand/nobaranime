export interface Anime {  id: number;
  title: string;
  japanese_title?: string | null;
  endpoint: string;
  thumb: string;
  status: 'Ongoing' | 'Completed';
  score?: number | null;
  producer?: string | null;
  type?: string | null;
  studio?: string | null;
  duration?: string | null;
  release_date?: string | null;
  total_episodes?: number | null;
  broadcast_day?: string | null;
  synopsis?: string | null;
  created_at?: string;
  updated_at?: string;
  last_episode_number?: number | null;
  last_episode_date?: string | null;
  genres?: Genre[];
  episodes?: Episode[];
  batches?: Batch[];
  latest_episode?: {
    episode_number: number;
    date: string;
  };
}

export interface Episode {
  id: number;
  anime_id?: number;
  title: string;
  episode_number: number;
  endpoint: string;
  date: string;
  created_at?: string;
  updated_at?: string;
  anime?: Anime;
  streams?: Stream[];
  downloads?: DownloadCollection;
  prev_episode?: string | null;
  next_episode?: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Batch {
  id: number;
  anime_id: number;
  title: string;
  endpoint: string;
  download_links?: Record<string, DownloadLink[]>;
  anime?: Anime;
}

export interface DownloadLink {
  title: string;
  url: string;
}

export interface Stream {
  id: number;
  provider: string;
  quality: string;
  url: string;
  is_default: number;
}

export interface Download {
  provider: string;
  format: string;
  url: string;
}

export interface DownloadCollection {
  [resolution: string]: Download[];
}

export interface AnimeResponse<T> {
  status: boolean;
  message?: string;
  data: T;
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
  genre?: string;
}

export interface Schedule {
  [day: string]: ScheduleAnime[];
}

export interface ScheduleAnime {
  id: number;
  title: string;
  endpoint: string;
  thumb: string;
  total_episodes: number;
}
