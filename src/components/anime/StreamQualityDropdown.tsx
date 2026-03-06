import { useState } from 'react';import { ChevronDown } from 'lucide-react';
import { Stream } from '../../types/anime';
import { cn } from '../../lib/utils';

interface StreamQualityDropdownProps {
  streams: Stream[];
  currentStream: Stream | null;
  onStreamSelect: (stream: Stream) => void;
}

export function StreamQualityDropdown({ streams, currentStream, onStreamSelect }: StreamQualityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group streams by quality
  const groupedByQuality = streams.reduce(
    (acc, stream) => {
      // Force 'Unknown' text if somehow quality is empty or weird
      const quality = stream.quality || 'Unknown';
      if (!acc[quality]) {
        acc[quality] = [];
      }
      acc[quality].push(stream);
      return acc;
    },
    {} as Record<string, Stream[]>,
  );

  const qualities = Object.keys(groupedByQuality).sort((a, b) => {
    // If 'Unknown', push to top or bottom? User requested "jadikan diatas sendiri" -> push to top if Unknown
    if (a.toLowerCase() === 'unknown') return -1;
    if (b.toLowerCase() === 'unknown') return 1;

    const orderMap: Record<string, number> = { '1080p': 0, '720p': 1, '480p': 2, '360p': 3, '240p': 4 };
    return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
  });

  return (
    <div className="relative mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 text-white text-sm font-bold flex items-center justify-between transition-colors shadow-lg"
      >
        <span>
          {currentStream ? (
            <>
              {currentStream.provider}{' '}
              <span className="text-gray-400 font-normal ml-1">({currentStream.quality && currentStream.quality.toLowerCase() !== 'unknown' ? currentStream.quality : 'Default'})</span>
            </>
          ) : (
            'Pilih Server Video'
          )}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5">
          {qualities.map((quality) => (
            <div key={quality} className="p-3">
              <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{quality.toLowerCase() === 'unknown' ? 'Default Server' : quality}</div>
              <div className="flex flex-wrap gap-2">
                {groupedByQuality[quality].map((stream) => (
                  <button
                    key={stream.id}
                    onClick={() => {
                      onStreamSelect(stream);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors font-medium border flex-grow sm:flex-grow-0',
                      currentStream?.id === stream.id ? 'bg-red-600 border-red-500 text-white shadow-md' : 'bg-black/50 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {stream.provider}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
