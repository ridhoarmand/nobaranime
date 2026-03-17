import { useState } from 'react';
import { ChevronDown, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Stream } from '../../types/anime';
import { cn } from '../../lib/utils';

interface StreamQualityDropdownProps {
  streams: Stream[];
  currentStream: Stream | null;
  onStreamSelect: (stream: Stream) => void;
}

// Providers known to have fewer ads (curated list)
const LOW_ADS_PROVIDERS = ['mega', 'google drive', 'youtube'];

// Providers known to have heavy ads
const HIGH_ADS_PROVIDERS = ['vidhide', 'filedon', 'ondesu', 'updesu', 'odstream', 'pdrain'];

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

  const getAdWarningLevel = (provider: string): 'low' | 'medium' | 'high' => {
    const providerLower = provider.toLowerCase();
    
    // Check if it's a known low-ads provider
    if (LOW_ADS_PROVIDERS.some(p => providerLower.includes(p))) {
      return 'low';
    }
    
    // Check if it's a known high-ads provider
    if (HIGH_ADS_PROVIDERS.some(p => providerLower.includes(p))) {
      return 'high';
    }
    
    // Default to medium
    return 'medium';
  };

  return (
    <div className="relative mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/20 text-white text-sm font-bold flex items-center justify-between transition-colors shadow-lg"
      >
        <span>
          {currentStream ? (
            <div className="flex items-center gap-2">
              <span>{currentStream.provider}</span>
              <span className="text-gray-400 font-normal ml-1">
                ({currentStream.quality && currentStream.quality.toLowerCase() !== 'unknown' ? currentStream.quality : 'Default'})
              </span>
              {(() => {
                const warningLevel = getAdWarningLevel(currentStream.provider);
                if (warningLevel === 'low') {
                  return (
                    <span title="Low ads risk">
                      <ShieldCheck className="w-4 h-4 text-green-500 inline ml-1" />
                    </span>
                  );
                }
                if (warningLevel === 'high') {
                  return (
                    <span title="May contain ads">
                      <ShieldAlert className="w-4 h-4 text-amber-500 inline ml-1" />
                    </span>
                  );
                }
                return null;
              })()}
            </div>
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
              <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                {quality.toLowerCase() === 'unknown' ? 'Default Server' : quality}
              </div>
              <div className="flex flex-wrap gap-2">
                {groupedByQuality[quality].map((stream) => {
                  const warningLevel = getAdWarningLevel(stream.provider);
                  return (
                    <button
                      key={stream.id}
                      onClick={() => {
                        onStreamSelect(stream);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors font-medium border flex-grow sm:flex-grow-0 relative',
                        currentStream?.id === stream.id
                          ? 'bg-red-600 border-red-500 text-white shadow-md'
                          : 'bg-black/50 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {stream.provider}
                        {warningLevel === 'low' && (
                          <ShieldCheck className="w-3 h-3 text-green-500" />
                        )}
                        {warningLevel === 'high' && (
                          <ShieldAlert className="w-3 h-3 text-amber-500" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Info footer */}
          <div className="px-4 py-2 bg-zinc-950/50 border-t border-white/5">
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Some providers may show ads. We recommend trying multiple servers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
