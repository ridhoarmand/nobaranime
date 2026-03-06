import { useEffect, useState } from 'react';import { useSearchParams } from 'react-router-dom';
import { SearchIcon, Tv, AlertCircle, Loader2 } from 'lucide-react';
import { AnimeApi } from '../lib/api';
import { Anime } from '../types/anime';
import { AnimeCard } from '../components/anime/AnimeCard';

export function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function performSearch() {
      if (!query) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await AnimeApi.getSearch(query);
        if (Array.isArray(res.data)) {
          setResults(res.data);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Failed to search anime:', err);
        setError('Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    }

    performSearch();
  }, [query]);

  return (
    <main className="bg-black min-h-screen pt-4 px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Anime Search</h1>
                <p className="text-gray-400 text-xs md:text-sm">
                  {query ? (
                    <>
                      Search results for: <span className="text-purple-500 font-semibold">{query}</span>
                    </>
                  ) : (
                    'Enter a keyword to start searching'
                  )}
                </p>
              </div>
            </div>

            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search anime..."
                defaultValue={query}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      window.location.href = `/search?q=${encodeURIComponent(val)}`;
                    }
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-white rounded-lg pl-10 pr-4 py-3 outline-none transition-all placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center py-10 text-red-500">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && hasSearched && results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {results.map((anime, index) => (
              <AnimeCard key={`${anime.id}-${index}`} anime={anime} />
            ))}
          </div>
        )}

        {!loading && !error && hasSearched && results.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
              <SearchIcon className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Results Found</h2>
            <p className="text-gray-400 mb-2">We couldn't find any anime matching "{query}"</p>
            <p className="text-sm text-gray-500">Try checking for typos or use different keywords.</p>
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 mb-6">
              <SearchIcon className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Start Searching</h2>
            <p className="text-gray-400 mb-2">Find your favorite anime by title.</p>
          </div>
        )}
      </div>
    </main>
  );
}
