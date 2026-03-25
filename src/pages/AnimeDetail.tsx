import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ResolutionDownloadDropdown } from '../components/anime/ResolutionDownloadDropdown';
import { AnimeApi } from '../lib/api';
import { Play, Calendar, Star, Info, Hash, Clock, MonitorPlay, Download, Tv, Check } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { Batch, DownloadLink } from "../types/anime";



function BatchItem({ batch }: { batch: Batch }) {
  const { data: batchDetail, isLoading } = useQuery({
    queryKey: ['batch', batch.endpoint],
    queryFn: () => AnimeApi.getBatch(batch.endpoint)
  });

  return (
    <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <span className="font-medium text-gray-300 sm:w-1/3 pt-1">{batch.title}</span>
      <div className="w-full sm:w-2/3 mt-3 sm:mt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            Loading links...
          </div>
        ) : batchDetail?.data?.download_links && Object.keys(batchDetail.data.download_links).length > 0 ? (
          <ResolutionDownloadDropdown
            downloads={Object.fromEntries(
              
              Object.entries(batchDetail.data.download_links).map(([res, links]) => [
                res,
                
                links.map((link: DownloadLink) => ({ provider: link.title || 'Unknown', format: res, url: link.url })),
              ])
            )}
          />
        ) : (
          <div className="text-sm text-gray-500">No download links available for this batch.</div>
        )}
      </div>
    </div>
  );
}

export function AnimeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const { isWatched, getWatchedEpisodesForAnime } = useWatchHistory();
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
  const watchedEpisodeNumbers = slug ? getWatchedEpisodesForAnime(slug) : [];
  const latestWatchedEpisode = watchedEpisodeNumbers.length > 0 ? Math.max(...watchedEpisodeNumbers) : 0;

  const latestEpisodeEntry = [...(data.episodes || [])].reduce((latest, current) => {
    const latestNum = Number(latest?.episode_number || 0);
    const currentNum = Number(current?.episode_number || 0);
    return currentNum > latestNum ? current : latest;
  }, data.episodes?.[0]);

  const latestAvailableEpisodeNumber = Number(latestEpisodeEntry?.episode_number || 0);
  const hasNewEpisodeSuggestion = latestAvailableEpisodeNumber > 0 && latestAvailableEpisodeNumber > latestWatchedEpisode;

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

              {hasNewEpisodeSuggestion && latestEpisodeEntry?.endpoint && (
                <Link
                  to={`/anime/${slug}/${latestEpisodeEntry.endpoint}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-emerald-200 hover:bg-emerald-500/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300/80">Lanjut nonton</p>
                    <p className="text-sm font-semibold truncate">Episode terbaru sudah rilis, ayo lanjut ke Ep {latestAvailableEpisodeNumber}</p>
                  </div>
                  <Play className="w-4 h-4 shrink-0 fill-current" />
                </Link>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {data.episodes?.map((ep) => {
                  const epNumber = ep.title.match(/Episode\s+(\d+)/i)?.[1] || ep.episode_number;
                  const watched = isWatched(ep.endpoint);
                  return (
                    <Link
                      key={ep.id}
                      to={`/anime/${slug}/${ep.endpoint}`}
                      className={`group relative bg-zinc-900 hover:bg-zinc-800 rounded-lg p-2 md:p-3 border transition-all flex flex-col justify-between h-full text-center md:text-left ${watched ? 'border-green-500/50 hover:border-green-500/80 bg-green-900/10' : 'border-white/5 hover:border-red-500/50'}`}
                    >
                      {watched && (
                        <div className="absolute top-1 right-1 md:top-2 md:right-2">
                          <Check className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row md:justify-between items-center md:items-start mb-1 md:mb-2 w-full gap-1">
                        <div className={`text-[9px] md:text-[10px] uppercase tracking-widest hidden md:block ${watched ? 'text-green-500/70' : 'text-gray-500'}`}>Episode</div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                          <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
                        </div>
                      </div>
                      <div className={`text-base sm:text-lg md:text-2xl font-black transition-colors mb-0.5 leading-none ${watched ? 'text-green-500 group-hover:text-green-400' : 'text-white group-hover:text-red-500'}`}>
                        <span className={`md:hidden text-[10px] font-normal mr-1 ${watched ? 'text-green-500/70' : 'text-gray-500'}`}>Ep</span>
                        {epNumber}
                      </div>
                      <div className={`mt-1 md:mt-2 text-[8px] md:text-[10px] truncate w-full ${watched ? 'text-green-500/50' : 'text-gray-400'}`}>{ep.date?.split(' ')[0]}</div>
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
                  {data.batches.map(( batch: Batch) => (
                    <BatchItem key={batch.endpoint || batch.id} batch={batch} />
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
