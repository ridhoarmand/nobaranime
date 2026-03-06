import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Grid, ListFilter } from 'lucide-react';
import { AnimeApi } from '../lib/api';
import { AnimeHero } from '../components/anime/AnimeHero';
import { AnimeCard } from '../components/anime/AnimeCard';

export function Home() {
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

      <div className="mx-auto px-4 sm:px-6 lg:px-8 sm:mt-4 mt-4 flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <Link to="/schedule" className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-red-600 rounded-xl transition-all font-bold whitespace-nowrap">
          <Calendar className="w-5 h-5" /> Schedule
        </Link>
        <Link to="/genres" className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-blue-600 rounded-xl transition-all font-bold whitespace-nowrap">
          <Grid className="w-5 h-5" /> Genres
        </Link>
        <Link to="/list" className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-green-600 rounded-xl transition-all font-bold whitespace-nowrap">
          <ListFilter className="w-5 h-5" /> Directory (A-Z)
        </Link>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 sm:pt-6 space-y-12 sm:space-y-16">
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
              <AnimeCard key={item.id} anime={item} showReleaseDayBadge />
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
