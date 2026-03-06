import { useState } from 'react';import { useQuery } from '@tanstack/react-query';
import { AnimeListingPage } from '../components/anime/AnimeListingPage';
import { AnimeApi } from '../lib/api';
import { ListFilter } from 'lucide-react';

export function AnimeList() {
  const [initial, setInitial] = useState('A');
  const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const { data, isLoading } = useQuery({
    queryKey: ['anime-list', initial, 1],
    queryFn: () => AnimeApi.getAnimeList(1, initial),
  });

  const handleInitialChange = (letter: string) => {
    setInitial(letter);
  };

  return (
    <main className="bg-black min-h-screen pt-4 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <ListFilter className="w-8 h-8 text-green-600" />
          A-Z Directory
        </h1>
        <div className="flex flex-wrap gap-2 mb-8">
          {alphabets.map((letter) => (
            <button
              key={letter}
              onClick={() => handleInitialChange(letter)}
              className={`w-10 h-10 rounded-lg font-bold flex items-center justify-center transition-all ${
                initial === letter ? 'bg-green-600 text-white shadow-lg shadow-green-900/30' : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimeListingPage key={initial} title={`Anime Starting with "${initial}"`} initialData={data?.data || []} fetchMore={async (page) => AnimeApi.getAnimeList(page, initial)} />
        )}
      </div>
    </main>
  );
}
