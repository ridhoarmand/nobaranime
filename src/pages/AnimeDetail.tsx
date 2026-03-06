import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { AnimeApi } from '../lib/api';
import { Play, Calendar, Star, Info, Hash, Clock, MonitorPlay, Download, Tv } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';

export function AnimeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['anime', slug],
    queryFn: () => AnimeApi.getDetail(slug!),
    enabled: !!slug,
    gcTime: 0, // Force clear cache so new episodes won't be missed on re-visit
  });

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
        <h2>Anime not found</h2>
      </main>
    );
  }

  const data = response.data;

  return (
    <main className="bg-black min-h-screen text-white pb-20">
      <div className="relative h-[25vh] sm:h-[30vh] md:h-[40vh] w-full overflow-hidden">
        <ImageWithFallback
          src={data.thumb}
          alt={data.title}
          containerClassName="w-full h-full absolute inset-0"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          fallbackText={data.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-16 md:-mt-40 lg:-mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start text-center md:text-left">
          <div className="w-48 sm:w-56 md:w-1/4 shrink-0 -mt-36 sm:-mt-40 md:mt-0 relative z-20">
            <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative">
              <ImageWithFallback src={data.thumb} alt={data.title} containerClassName="w-full h-full" className="w-full h-full object-cover" fallbackText={data.title} />
              <div className="absolute top-2 left-2 md:top-4 md:left-4">
                <span
                  className={`px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-bold uppercase rounded-md shadow-sm ${data.status === 'Ongoing' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
                >
                  {data.status}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-3/4 space-y-5 pt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight mb-1 md:mb-2">{data.title}</h1>
              {data.japanese_title && <h2 className="text-sm md:text-xl text-gray-400 font-medium">{data.japanese_title}</h2>}

              <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:gap-2 mt-3 md:mt-4">
                {data.genres?.map((g) => (
                  <Link
                    key={g.id}
                    to={`/genre/${g.name}`}
                    className="px-2.5 py-0.5 md:px-3 md:py-1 bg-white/10 hover:bg-red-600 rounded-full text-[10px] md:text-xs font-medium transition-colors border border-white/5"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/30 rounded-2xl p-4 md:p-5 border border-white/5 text-gray-300 leading-relaxed whitespace-pre-line text-sm md:text-base text-left">
              <h3 className="text-base md:text-lg font-bold mb-3 flex items-center gap-2 text-white justify-start">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                Synopsis
              </h3>
              <div className={`relative transition-all duration-300 overflow-hidden ${!isSynopsisExpanded ? 'line-clamp-2 md:line-clamp-3' : ''}`}>
                {data.synopsis || 'Tidak ada sinopsis untuk anime ini.'}
              </div>
              {data.synopsis && data.synopsis.length > 250 && (
                <button
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="mt-2 text-red-500 hover:text-red-400 text-xs md:text-sm font-bold transition-colors w-full md:w-auto text-center md:text-left"
                >
                  {isSynopsisExpanded ? 'Sembunyikan' : 'Baca Selengkapnya...'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 text-left">
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Score</span>
                </div>
                <p className="text-xs md:text-sm font-bold truncate">{data.score || 'N/A'}</p>
              </div>
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Durasi</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.duration || 'N/A'}</p>
              </div>
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <MonitorPlay className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Studio</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.studio || 'N/A'}</p>
              </div>
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Aired</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.release_date || 'N/A'}</p>
              </div>
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors col-span-2 md:col-span-1">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Tv className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Rilis Hari</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.broadcast_day || 'Unknown'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2 justify-start">
                  <Hash className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                  Episodes
                </h3>
                <span className="text-xs md:text-sm text-gray-400 text-left">{data.episodes?.length || 0} Episodes Available</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {data.episodes?.map((ep) => {
                  const epNumber = ep.title.match(/Episode\s+(\d+)/i)?.[1] || ep.episode_number;
                  return (
                    <Link
                      key={ep.id}
                      to={`/anime/${slug}/${ep.endpoint}`}
                      className="group relative bg-zinc-900 hover:bg-zinc-800 rounded-lg p-2 md:p-3 border border-white/5 hover:border-red-500/50 transition-all flex flex-col justify-between h-full text-center md:text-left"
                    >
                      <div className="flex flex-col md:flex-row md:justify-between items-center md:items-start mb-1 md:mb-2 w-full gap-1">
                        <div className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest hidden md:block">Episode</div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                          <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg md:text-2xl font-black text-white group-hover:text-red-500 transition-colors mb-0.5 leading-none">
                        <span className="md:hidden text-[10px] font-normal text-gray-500 mr-1">Ep</span>
                        {epNumber}
                      </div>
                      <div className="mt-1 md:mt-2 text-[8px] md:text-[10px] text-gray-400 truncate w-full">{ep.date}</div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {data.batches && data.batches.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-white/5">
                <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <Download className="w-6 h-6 text-blue-500" />
                  Batch Downloads
                </h3>
                <div className="grid gap-3">
                  {data.batches.map((batch) => (
                    <div key={batch.id} className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="font-medium text-gray-300">{batch.title}</span>
                      <div className="text-sm text-gray-500">Batch download functionality pending</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
