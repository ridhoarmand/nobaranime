export interface ScrapedAnimeItem {
  title: string;
  thumb?: string;
  available_eps: number;
  total_eps?: number | null;
  endpoint: string;
  status: 'Ongoing' | 'Completed';
}

export interface ScrapedEpisodeLink {
  provider: string;
  url: string;
  size?: string | null;
}

export interface ScrapedEpisodeData {
  episode_title?: string;
  episode_date?: string;
  episode_number?: number | null;
}

export interface ScrapedRecommendation {
  title: string;
  endpoint: string;
  thumb?: string;
}
