import { useState, useEffect, useCallback } from 'react';import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Calendar, Star, Info } from 'lucide-react';
import { Anime } from '../../types/anime';
import { ImageWithFallback } from '../ImageWithFallback';

interface AnimeHeroProps {
  animes: Anime[];
  autoPlayInterval?: number;
}

export function AnimeHero({ animes, autoPlayInterval = 5000 }: AnimeHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const validAnimes = animes.filter((a) => a.thumb);

  const nextSlide = useCallback(() => {
    if (validAnimes.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % validAnimes.length);
  }, [validAnimes.length]);

  const prevSlide = useCallback(() => {
    if (validAnimes.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + validAnimes.length) % validAnimes.length);
  }, [validAnimes.length]);

  useEffect(() => {
    if (isHovered || validAnimes.length <= 1) return;
    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isHovered, nextSlide, autoPlayInterval, validAnimes.length]);

  if (validAnimes.length === 0) return null;

  const currentAnime = validAnimes[currentIndex];

  return (
    <div className="relative min-h-[55vh] sm:min-h-[60vh] md:h-[80vh] w-full overflow-hidden group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="absolute inset-0">
        <ImageWithFallback
          src={currentAnime.thumb}
          alt={currentAnime.title}
          containerClassName="w-full h-full absolute inset-0"
          className="max-w-none w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          fallbackText={currentAnime.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      <div className="absolute inset-0 flex items-center md:items-center items-end pb-12 md:pb-0">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16 md:pt-20">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-end">
            <div className="w-full md:w-2/3 space-y-3 md:space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">{currentAnime.status}</span>
                {currentAnime.score && (
                  <div className="flex items-center gap-1 text-yellow-400 text-sm font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{currentAnime.score}</span>
                  </div>
                )}
                {currentAnime.latest_episode && (
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-white/20">
                    Episode {currentAnime.latest_episode.episode_number}
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight line-clamp-2 md:line-clamp-3 drop-shadow-lg">{currentAnime.title}</h1>

              <div className="flex items-center gap-4 text-xs md:text-sm text-gray-300">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{currentAnime.broadcast_day || 'Unknown Day'}</span>
                </div>
                <span>•</span>
                <span>{currentAnime.total_episodes ? `${currentAnime.total_episodes} Episodes` : '? Episodes'}</span>
                {currentAnime.latest_episode?.date && (
                  <>
                    <span>•</span>
                    <span className="text-red-400 font-medium">{currentAnime.latest_episode.date}</span>
                  </>
                )}
              </div>

              <p className="text-gray-300 text-sm md:text-lg line-clamp-3 max-w-2xl hidden md:block">{currentAnime.synopsis || 'No synopsis available.'}</p>

              <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 pt-2 md:pt-4">
                <Link
                  to={`/anime/${currentAnime.endpoint}`}
                  className="px-4 sm:px-6 md:px-8 py-2 md:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1.5 md:gap-2 transition-colors text-xs sm:text-sm md:text-base w-fit"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 fill-current" />
                  Watch Now
                </Link>
                <Link
                  to={`/anime/${currentAnime.endpoint}`}
                  className="px-4 sm:px-6 md:px-8 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg flex items-center gap-1.5 md:gap-2 backdrop-blur-sm transition-colors text-xs sm:text-sm md:text-base border border-white/10 w-fit"
                >
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  Details
                </Link>
              </div>
            </div>

            <div className="hidden lg:block w-1/3 relative z-10 pl-10">
              <div
                key={currentAnime.id}
                className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-red-600/20 transform rotate-3 hover:rotate-0 transition-transform duration-500 animate-in fade-in slide-in-from-right-8 duration-700"
              >
                <ImageWithFallback
                  src={currentAnime.thumb}
                  alt={currentAnime.title}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover max-w-none"
                  fallbackText={currentAnime.title}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {validAnimes.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              prevSlide();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 text-white backdrop-blur-md border border-white/10 hover:bg-red-600 hover:border-red-600 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              nextSlide();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 text-white backdrop-blur-md border border-white/10 hover:bg-red-600 hover:border-red-600 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {validAnimes.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {validAnimes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-red-600' : 'w-2 bg-white/30 hover:bg-white/60'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
