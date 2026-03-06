import { Link } from 'react-router-dom';import { Anime } from '../../types/anime';
import { PlayCircle } from 'lucide-react';
import { ImageWithFallback } from '../ImageWithFallback';

interface AnimeCardProps {
  anime: Anime;
  showReleaseDayBadge?: boolean;
}

export function AnimeCard({ anime, showReleaseDayBadge = false }: AnimeCardProps) {
  return (
    <Link to={`/anime/${anime.endpoint}`} className="group relative block overflow-hidden rounded-lg md:rounded-xl bg-zinc-900/50 transition-all hover:bg-zinc-800/50">
      {/* Smaller aspect ratio on mobile (2:3), normal on desktop (3:4) */}
      <div className="aspect-[2/3] md:aspect-[3/4] overflow-hidden rounded-lg md:rounded-xl relative">
        <ImageWithFallback
          src={anime.thumb}
          alt={anime.title}
          containerClassName="w-full h-full"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          fallbackText={anime.title}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

        {/* Status Badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-medium text-white uppercase tracking-wider">{anime.status}</div>

        {/* Rating Badge */}
        {anime.score && <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/90 text-black text-[10px] font-bold">★ {anime.score}</div>}

        {/* Episode Badge */}
        {anime.latest_episode && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-red-600/90 text-white text-[10px] font-bold shadow-sm">Ep {anime.latest_episode.episode_number}</div>
        )}

        {/* Release Date Badge */}
        {anime.latest_episode?.date && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-medium border border-white/10 shadow-sm">
            {anime.latest_episode.date}
          </div>
        )}

        {/* Release Day Badge */}
        {showReleaseDayBadge && anime.broadcast_day && (
          <div className="absolute top-9 left-2 px-2 py-1 rounded-md bg-blue-600/90 text-white text-[10px] font-bold shadow-sm">{anime.broadcast_day}</div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-lg shadow-red-600/20">
            <PlayCircle className="w-6 h-6 text-white fill-current" />
          </div>
        </div>
      </div>

      <div className="p-2 md:p-3">
        <h3 className="text-xs md:text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">{anime.title}</h3>
        <div className="mt-1 md:mt-2 flex items-center gap-2 text-[10px] md:text-xs text-gray-400 line-clamp-1">
          {anime.type && <span>{anime.type}</span>}
          {anime.type && (anime.total_episodes || anime.latest_episode?.date) && <span>•</span>}
          {anime.latest_episode?.date ? <span className="text-red-400 font-medium">{anime.latest_episode.date}</span> : anime.total_episodes ? <span>{anime.total_episodes} Eps</span> : null}
        </div>
      </div>
    </Link>
  );
}
