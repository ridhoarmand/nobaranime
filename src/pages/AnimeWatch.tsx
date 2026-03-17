import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimeApi } from '../lib/api';
import { AnimePlayer } from '../components/anime/AnimePlayer';
import { ResolutionDownloadDropdown } from '../components/anime/ResolutionDownloadDropdown';
import { ChevronLeft, ChevronRight, Home, List } from 'lucide-react';
import { useWatchHistory } from '../hooks/useWatchHistory';

export function AnimeWatch() {
  const { slug, episode } = useParams<{ slug: string; episode: string }>();
  const { addWatched } = useWatchHistory();

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['episode', episode],
    queryFn: () => AnimeApi.getEpisode(episode!),
    enabled: !!episode,
    gcTime: 0, // Do not cache episode details to always get the latest next_episode URL
  });

  // Record watch history when episode loads
  useEffect(() => {
    if (!isLoading && response?.data && slug && episode) {
      const data = response.data;
      addWatched({
        animeSlug: slug,
        animeTitle: data.anime?.title || 'Unknown',
        animeThumb: data.anime?.thumb || '',
        episodeNumber: data.episode_number,
        episodeSlug: episode,
      });
    }
  }, [isLoading, response, slug, episode, addWatched]);

  if (isLoading) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (isError || !response?.data) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center text-white">
        <h2>Episode not found</h2>
      </main>
    );
  }

  const data = response.data;
  const animeInfo = data.anime;
  const downloads = data.downloads || {};

  return (
    <main className="bg-black min-h-screen text-white pt-4 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
          <Link to="/" className="hover:text-red-500 transition-colors flex items-center gap-1 shrink-0">
            <Home className="w-4 h-4 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Home</span>
          </Link>
          <span className="shrink-0">/</span>
          <Link to={`/anime/${slug}`} className="hover:text-red-500 transition-colors truncate max-w-[150px] sm:max-w-[300px]">
            {animeInfo?.title || 'Anime Details'}
          </Link>
          <span className="shrink-0">/</span>
          <span className="text-white font-medium shrink-0 text-red-500">Episode {data.episode_number}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{data.title}</h1>

            <AnimePlayer streams={data.streams || []} title={data.title} />

            <div className="flex items-center justify-between gap-4">
              {data.prev_episode ? (
                <Link
                  to={`/anime/${slug}/${data.prev_episode}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/5 hover:border-red-500/30 transition-all font-medium"
                >
                  <ChevronLeft className="w-5 h-5" /> Previous
                </Link>
              ) : (
                <div className="flex-1" />
              )}

              <Link
                to={`/anime/${slug}`}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-white/5 hover:border-red-500/30 transition-all text-gray-400 hover:text-white"
              >
                <List className="w-5 h-5" />
              </Link>

              {data.next_episode ? (
                <Link
                  to={`/anime/${slug}/${data.next_episode}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition-all shadow-lg shadow-red-900/20"
                >
                  Next <ChevronRight className="w-5 h-5" />
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5">
              <div className="flex gap-4">
                <div className="relative w-20 h-28 shrink-0">
                  <img src={animeInfo?.thumb || ''} alt={animeInfo?.title || ''} className="w-full h-full object-cover rounded-md shadow-lg" />
                </div>
                <div>
                  <h3 className="font-bold line-clamp-2 mb-1">
                    <Link to={`/anime/${slug}`} className="hover:text-red-500 transition-colors">
                      {animeInfo?.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-gray-400">Released: {data.date}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5">
              <h3 className="font-bold mb-4 text-white">Downloads</h3>
              <ResolutionDownloadDropdown downloads={downloads} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
