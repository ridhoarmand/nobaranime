import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Grid, ListFilter, PlayCircle, BellRing } from 'lucide-react';
import { AnimeApi } from '../lib/api';
import { AnimeHero } from '../components/anime/AnimeHero';
import { AnimeCard } from '../components/anime/AnimeCard';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useAnimePreferences } from '../hooks/useAnimePreferences';

export function Home() {
  const { history, user: watchUser } = useWatchHistory();
  const { followed, user: prefUser, isLoaded } = useAnimePreferences();

  const { data: ongoing, isLoading: ongoingLoading } = useQuery({
    queryKey: ['ongoing', 1],
    queryFn: () => AnimeApi.getOngoing(1),
    gcTime: 0,
  });

  const { data: completed, isLoading: completedLoading } = useQuery({
    queryKey: ['completed', 1],
    queryFn: () => AnimeApi.getCompleted(1),
    gcTime: 0,
  });

  const { data: latestEpisodes } = useQuery({
    queryKey: ['latest-episodes', 1],
    queryFn: () => AnimeApi.getLatestEpisodes(1),
    gcTime: 0,
  });

  const continueWatchingList = history
    .filter((item) => !item.completed && item.progressPercent > 0)
    .slice(0, 10);

  const followedSlugSet = new Set(followed.map((item) => item.slug));
  const followedLatestReleases = (latestEpisodes?.data || [])
    .filter((anime) => followedSlugSet.has(anime.endpoint) && !!anime.last_episode_slug)
    .slice(0, 10);

  if (ongoingLoading || completedLoading) {
    return (
      <main className="bg-black min-h-screen pb-20 pt-20 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="bg-black min-h-screen pb-20">
      {ongoing?.data && ongoing.data.length > 0 && <AnimeHero animes={ongoing.data.slice(0, 5)} />}

      <div className="mx-auto px-4 sm:px-6 lg:px-8 sm:mt-6 mt-4 grid grid-cols-3 gap-2 sm:gap-4">
        <Link to="/schedule" className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 bg-zinc-900/80 hover:bg-red-600 rounded-xl transition-all font-bold whitespace-nowrap text-[11px] sm:text-base text-gray-300 hover:text-white">
          <Calendar className="w-5 h-5 sm:w-5 sm:h-5" /> <span>Schedule</span>
        </Link>
        <Link to="/genres" className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 bg-zinc-900/80 hover:bg-blue-600 rounded-xl transition-all font-bold whitespace-nowrap text-[11px] sm:text-base text-gray-300 hover:text-white">
          <Grid className="w-5 h-5 sm:w-5 sm:h-5" /> <span>Genres</span>
        </Link>
        <Link to="/list" className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 bg-zinc-900/80 hover:bg-green-600 rounded-xl transition-all font-bold whitespace-nowrap text-[11px] sm:text-base text-gray-300 hover:text-white">
          <ListFilter className="w-5 h-5 sm:w-5 sm:h-5" /> <span>Directory</span>
        </Link>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 sm:pt-6 space-y-12 sm:space-y-16">
        {watchUser && continueWatchingList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-8 bg-amber-500 rounded-full" />
                Lanjut Nonton
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {continueWatchingList.map((item) => (
                <Link
                  key={item.episodeSlug}
                  to={`/anime/${item.animeSlug}/${item.episodeSlug}`}
                  className="group rounded-xl border border-amber-500/25 bg-zinc-900/70 p-3 hover:bg-zinc-800/80 transition-colors"
                >
                  <div className="flex gap-3">
                    <img src={item.animeThumb} alt={item.animeTitle} className="h-20 w-14 rounded-md object-cover shrink-0" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white line-clamp-2 group-hover:text-amber-200 transition-colors">{item.animeTitle}</p>
                      <p className="mt-1 text-xs text-zinc-400">Episode {item.episodeNumber}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, Math.round(item.progressPercent))}%` }} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-200/90">
                        <span>{Math.round(item.progressPercent)}%</span>
                        <span className="inline-flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5" />Lanjut</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {prefUser && isLoaded && followedLatestReleases.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1 h-8 bg-emerald-500 rounded-full" />
                Update Anime yang Kamu Ikuti
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {followedLatestReleases.map((anime) => (
                <div key={anime.id} className="relative">
                  <AnimeCard anime={anime} showReleaseDayBadge directToLatestEpisode />
                  <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-emerald-600/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm inline-flex items-center gap-1">
                    <BellRing className="w-3 h-3" />
                    Followed
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-1 h-8 bg-red-600 rounded-full" />
              Rilisan Terbaru
            </h2>
            <Link to="/ongoing" className="text-sm text-gray-400 hover:text-red-500 transition-colors">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {ongoing?.data?.slice(0, 14).map((item) => (
              <AnimeCard key={item.id} anime={item} showReleaseDayBadge directToLatestEpisode />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-1 h-8 bg-blue-600 rounded-full" />
              Completed Anime
            </h2>
            <Link to="/completed" className="text-sm text-gray-400 hover:text-red-500 transition-colors">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {completed?.data?.slice(0, 14).map((item) => (
              <AnimeCard key={item.id} anime={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
