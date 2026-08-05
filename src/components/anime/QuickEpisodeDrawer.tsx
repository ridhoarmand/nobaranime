import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Search, X } from 'lucide-react';
import { Episode } from '../../types/anime';

interface QuickEpisodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slug?: string;
  currentEpisodeEndpoint?: string;
  episodes?: Episode[];
  watchedEpisodes: number[];
}

export function QuickEpisodeDrawer({
  isOpen,
  onClose,
  slug,
  currentEpisodeEndpoint,
  episodes,
  watchedEpisodes,
}: QuickEpisodeDrawerProps) {
  const navigate = useNavigate();
  const [epSearch, setEpSearch] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <List className="w-5 h-5 text-red-500" />
            Pilih Episode
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-zinc-800/60">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari episode..."
              value={epSearch}
              onChange={(e) => setEpSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2 pl-9 text-xs focus:outline-none focus:border-red-500"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-4 sm:grid-cols-5 gap-2">
          {episodes ? (
            episodes
              .filter((ep) => {
                if (!epSearch.trim()) return true;
                const q = epSearch.trim().toLowerCase();
                return ep.title.toLowerCase().includes(q) || String(ep.episode_number).includes(q);
              })
              .map((ep) => {
                const epNum = ep.title.match(/Episode\s+(\d+)/i)?.[1] || ep.episode_number;
                const isCurrent = ep.endpoint === currentEpisodeEndpoint;
                const isWatched = watchedEpisodes.includes(Number(epNum));

                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      onClose();
                      if (slug) navigate(`/anime/${slug}/${ep.endpoint}`);
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                      isCurrent
                        ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/40 ring-2 ring-red-400'
                        : isWatched
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] opacity-75 font-normal">Ep</span>
                    <span className="text-sm sm:text-base font-black">{epNum}</span>
                  </button>
                );
              })
          ) : (
            <div className="col-span-full py-8 text-center text-xs text-zinc-500 flex justify-center items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              Memuat daftar episode...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
