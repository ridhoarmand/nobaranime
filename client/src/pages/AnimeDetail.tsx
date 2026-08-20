import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ResolutionDownloadDropdown } from '../components/anime/ResolutionDownloadDropdown';
import { AnimeApi } from '../lib/api';
import { Play, Calendar, Star, Info, Hash, Clock, MonitorPlay, Download, Tv, Check, Circle, Heart, Bell, RefreshCw, Search as SearchIcon, ArrowUpDown, Film, Building2, Sparkles } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useAnimePreferences } from '../hooks/useAnimePreferences';
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
  const queryClient = useQueryClient();
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'asc' | 'desc'>('asc');

  const { getWatchedEpisodesForAnime, getEpisodeProgress, getLatestWatchedForAnime } = useWatchHistory();
  const { isFollowed, isLiked, toggleFollow, toggleLike, isLoaded } = useAnimePreferences();
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['anime', slug],
    queryFn: () => AnimeApi.getDetail(slug!),
    enabled: !!slug,
    gcTime: 0,
  });

  useEffect(() => {
    if (slug) {
      AnimeApi.syncAnime(slug)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['anime', slug] });
        })
        .catch(() => {});
    }
  }, [slug, queryClient]);

  const handleSyncData = async () => {
    if (!slug || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('Menyinkronkan data dari Otakudesu...');
    try {
      await AnimeApi.syncAnime(slug);
      await queryClient.invalidateQueries({ queryKey: ['anime', slug] });
      setSyncFeedback('Data berhasil diperbarui!');
    } catch (err: any) {
      setSyncFeedback('Gagal sinkronisasi. Coba beberapa saat lagi.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(''), 4000);
    }
  };

  if (isLoading) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (isError || !response?.data) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center text-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Anime Tidak Ditemukan</h2>
          <p className="text-gray-400 mb-6">Mungkin URL salah atau data belum disinkronkan.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold transition">
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    );
  }

  const data = response.data;
  const followed = slug ? isFollowed(slug) : false;
  const liked = slug ? isLiked(slug) : false;
  const watchedEpisodeNumbers = slug ? getWatchedEpisodesForAnime(slug) : [];
  const latestWatchedEpisode = watchedEpisodeNumbers.length > 0 ? Math.max(...watchedEpisodeNumbers) : 0;
  const latestProgressEntry = slug ? getLatestWatchedForAnime(slug) : null;

  const latestEpisodeEntry = [...(data.episodes || [])].reduce((latest, current) => {
    const latestNum = Number(latest?.episode_number || 0);
    const currentNum = Number(current?.episode_number || 0);
    return currentNum > latestNum ? current : latest;
  }, data.episodes?.[0]);

  const latestAvailableEpisodeNumber = Number(latestEpisodeEntry?.episode_number || 0);
  const hasNewEpisodeSuggestion = latestAvailableEpisodeNumber > 0 && latestAvailableEpisodeNumber > latestWatchedEpisode;
  const shouldResumeCurrentEpisode = !!latestProgressEntry && !latestProgressEntry.completed;

  return (
    <main className="bg-black text-white min-h-screen pb-20">
      <div className="relative h-64 sm:h-80 md:h-[420px] w-full overflow-hidden group">
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
              <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-1.5 items-start">
                <span
                  className={`px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-bold uppercase rounded-md shadow-sm ${data.status === 'Ongoing' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
                >
                  {data.status}
                </span>
                {(data.available_eps || data.total_eps) && (
                  <span className="px-2 py-0.5 md:px-2.5 md:py-0.5 text-[9px] md:text-[10px] font-bold bg-black/80 backdrop-blur-sm text-zinc-200 border border-white/10 rounded-md shadow-sm">
                    {data.available_eps ? `${data.available_eps}${data.total_eps ? ` / ${data.total_eps}` : ''} Eps` : `${data.total_eps} Eps`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full md:w-3/4 space-y-5 pt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight mb-1 md:mb-2">{data.title}</h1>
              {data.japanese_title && <h2 className="text-sm md:text-xl text-gray-400 font-medium">{data.japanese_title}</h2>}

              <div className="mt-3 md:mt-4 flex flex-wrap gap-2 justify-center md:justify-start items-center">
                <button
                  type="button"
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600/20 text-red-300 hover:bg-red-600/30 px-3 py-1.5 text-xs md:text-sm font-semibold transition-all shadow-md shadow-red-900/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-red-400' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Data Otakudesu'}
                </button>

                {isLoaded && (
                  <>
                    <button
                      type="button"
                      onClick={() => slug && toggleFollow({ slug, title: data.title, thumb: data.thumb })}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs md:text-sm font-semibold transition-colors ${followed ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/25' : 'border-white/15 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800'}`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {followed ? 'Mengikuti' : 'Ikuti'}
                    </button>

                    <button
                      type="button"
                      onClick={() => slug && toggleLike({ slug, title: data.title, thumb: data.thumb })}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs md:text-sm font-semibold transition-colors ${liked ? 'border-rose-500/60 bg-rose-500/20 text-rose-200 hover:bg-rose-500/25' : 'border-white/15 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800'}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                      {liked ? 'Disukai' : 'Sukai'}
                    </button>
                  </>
                )}
              </div>

              {syncFeedback && (
                <div className="mt-2 text-xs font-semibold text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-1.5 rounded-lg inline-block">
                  {syncFeedback}
                </div>
              )}

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
                  type="button"
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold focus:outline-none"
                >
                  {isSynopsisExpanded ? 'Sembunyikan' : 'Baca Selengkapnya...'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3 text-left">
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
                  <Film className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Tipe</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.type || 'TV'}</p>
              </div>
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Musim</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.season || 'N/A'}</p>
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
                  <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Produser</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.producer || 'N/A'}</p>
              </div>
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Aired</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.release_date || 'N/A'}</p>
              </div>
              <div className="bg-zinc-900/50 p-2 md:p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Tv className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Rilis Hari</span>
                </div>
                <p className="text-xs md:text-sm font-semibold truncate">{data.broadcast_day || 'Unknown'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2 justify-start">
                  <Hash className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                  Episodes
                </h3>

                {/* Episode Filter & Sort Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari episode..."
                      value={episodeSearchQuery}
                      onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 pl-8 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 w-36 sm:w-44"
                    />
                    <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setEpisodeSortOrder(episodeSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-xs font-semibold text-gray-300 transition"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                    <span>{episodeSortOrder === 'asc' ? 'Terlama' : 'Terbaru'}</span>
                  </button>
                </div>
              </div>

              {shouldResumeCurrentEpisode && latestProgressEntry && (
                <Link
                  to={`/anime/${slug}/${latestProgressEntry.episodeSlug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-amber-100 hover:bg-amber-500/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-amber-200/80">Lanjut nonton</p>
                    <p className="text-sm font-semibold truncate">Lanjutkan Ep {latestProgressEntry.episodeNumber} ({Math.round(latestProgressEntry.progressPercent)}%)</p>
                  </div>
                  <Play className="w-4 h-4 shrink-0 fill-current" />
                </Link>
              )}

              {!shouldResumeCurrentEpisode && hasNewEpisodeSuggestion && latestEpisodeEntry?.endpoint && (
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
                {([...(data.episodes || [])])
                  .filter((ep) => {
                    if (!episodeSearchQuery.trim()) return true;
                    const query = episodeSearchQuery.trim().toLowerCase();
                    return ep.title.toLowerCase().includes(query) || String(ep.episode_number).includes(query);
                  })
                  .sort((a, b) => {
                    const numA = Number(a.episode_number || 0);
                    const numB = Number(b.episode_number || 0);
                    return episodeSortOrder === 'asc' ? numA - numB : numB - numA;
                  })
                  .map((ep) => {
                    const epNumber = ep.title.match(/Episode\s+(\d+)/i)?.[1] || ep.episode_number;
                    const episodeNum = Number(epNumber);
                    const allWatchedEps = slug ? getWatchedEpisodesForAnime(slug) : [];
                    const watched = allWatchedEps.includes(episodeNum);
                    const progressEntry = slug ? getEpisodeProgress(slug) : null;
                    const inProgress = !!progressEntry && 
                      !progressEntry.completed && 
                      progressEntry.progressPercent > 0 &&
                      (progressEntry.episodeSlug === ep.endpoint || Number(progressEntry.episodeNumber) === episodeNum);
                    return (
                      <Link
                        key={ep.id}
                        to={`/anime/${slug}/${ep.endpoint}`}
                        className={`group relative bg-zinc-900 hover:bg-zinc-800 rounded-lg p-2 md:p-3 border transition-all flex flex-col justify-between h-full text-center md:text-left ${watched ? 'border-green-500/50 hover:border-green-500/80 bg-green-900/10' : inProgress ? 'border-amber-500/50 hover:border-amber-400/80 bg-amber-900/10' : 'border-white/5 hover:border-red-500/50'}`}
                      >
                        {watched && (
                          <div className="absolute top-1 right-1 md:top-2 md:right-2">
                            <Check className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                          </div>
                        )}
                        {!watched && inProgress && (
                          <div className="absolute top-1 right-1 md:top-2 md:right-2 flex items-center gap-1">
                            <Circle className="w-2.5 h-2.5 md:w-3 md:h-3 text-amber-400 fill-current" />
                            <span className="text-[8px] md:text-[9px] text-amber-300 font-semibold">{Math.round(progressEntry.progressPercent)}%</span>
                          </div>
                        )}
                        <div className="flex flex-col md:flex-row md:justify-between items-center md:items-start mb-1 md:mb-2 w-full gap-1">
                          <div className={`text-[9px] md:text-[10px] uppercase tracking-widest hidden md:block ${watched ? 'text-green-500/70' : 'text-gray-500'}`}>Episode</div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                            <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
                          </div>
                        </div>
                        <div className={`text-base sm:text-lg md:text-2xl font-black transition-colors mb-0.5 leading-none ${watched ? 'text-green-500 group-hover:text-green-400' : inProgress ? 'text-amber-300 group-hover:text-amber-200' : 'text-white group-hover:text-red-500'}`}>
                          <span className={`md:hidden text-[10px] font-normal mr-1 ${watched ? 'text-green-500/70' : inProgress ? 'text-amber-300/70' : 'text-gray-500'}`}>Ep</span>
                          {epNumber}
                        </div>
                        <div className={`mt-1 md:mt-2 text-[8px] md:text-[10px] truncate w-full ${watched ? 'text-green-500/50' : inProgress ? 'text-amber-300/70' : 'text-gray-400'}`}>
                          {ep.date?.split(' ')[0]}
                        </div>
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

            {data.recommendations && data.recommendations.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-white/5 text-left">
                <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-white">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  Rekomendasi Anime Serupa
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {data.recommendations.map((rec) => (
                    <Link
                      key={rec.endpoint || rec.id}
                      to={`/anime/${rec.endpoint}`}
                      className="group block bg-zinc-900/60 rounded-xl overflow-hidden border border-white/5 hover:border-yellow-500/40 transition-all duration-300"
                    >
                      <div className="aspect-[3/4] relative overflow-hidden">
                        <ImageWithFallback
                          src={rec.thumb || ''}
                          alt={rec.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          fallbackText={rec.title}
                        />
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-semibold text-white line-clamp-2 group-hover:text-yellow-400 transition-colors">
                          {rec.title}
                        </h4>
                      </div>
                    </Link>
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
