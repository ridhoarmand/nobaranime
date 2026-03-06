import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AnimeApi } from '../lib/api';
import { Grid } from 'lucide-react';

export function Genres() {
  const { data, isLoading } = useQuery({
    queryKey: ['genres'],
    queryFn: () => AnimeApi.getGenres(),
  });

  if (isLoading) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const genres = data?.data || [];

  return (
    <main className="bg-black min-h-screen pt-4 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Grid className="w-8 h-8 text-blue-600" />
          Anime Genres
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {genres.map((genre) => (
            <Link
              key={genre.id}
              to={`/genre/${genre.name.toLowerCase()}`}
              className="bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 hover:border-blue-500/50 p-4 rounded-xl text-center transition-all group"
            >
              <h3 className="font-bold text-gray-300 group-hover:text-white transition-colors">{genre.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
