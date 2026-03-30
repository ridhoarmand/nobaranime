import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Download } from '../../types/anime';

interface ResolutionDownloadDropdownProps {
  downloads: Record<string, Download[]>;
}

export function ResolutionDownloadDropdown({ downloads }: ResolutionDownloadDropdownProps) {
  const [expandedResolution, setExpandedResolution] = useState<string | null>(Object.keys(downloads)[0] || null);

  const dedupedDownloads = useMemo(() => {
    const entries = Object.entries(downloads).map(([resolution, links]) => {
      const unique = new Map<string, Download>();

      for (const link of links || []) {
        const normalizedUrl = (link.url || '').trim();
        if (!normalizedUrl) continue;
        const provider = (link.provider || 'Unknown').trim();
        const dedupKey = `${normalizedUrl.toLowerCase()}::${provider.toLowerCase()}::${resolution.toLowerCase()}`;

        if (!unique.has(dedupKey)) {
          unique.set(dedupKey, {
            ...link,
            provider,
            url: normalizedUrl,
          });
        }
      }

      return [resolution, Array.from(unique.values())] as const;
    });

    return Object.fromEntries(entries) as Record<string, Download[]>;
  }, [downloads]);

  const resolutions = Object.keys(dedupedDownloads).sort((a, b) => {
    const orderMap: Record<string, number> = { '1080p': 0, '720p': 1, '480p': 2, '360p': 3, '240p': 4 };
    return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
  });

  if (resolutions.length === 0) {
    return <p className="text-gray-500 text-sm">No download links available.</p>;
  }

  return (
    <div className="space-y-2">
      {resolutions.map((resolution) => (
        <div key={resolution} className="bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden">
          <button
            onClick={() => setExpandedResolution(expandedResolution === resolution ? null : resolution)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
          >
            <span className="text-sm font-bold text-white">{resolution}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {dedupedDownloads[resolution].length} provider{dedupedDownloads[resolution].length !== 1 ? 's' : ''}
              </span>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expandedResolution === resolution && 'rotate-180')} />
            </div>
          </button>

          {expandedResolution === resolution && (
            <div className="border-t border-white/5 p-3 flex flex-wrap gap-2 bg-black/30">
              {dedupedDownloads[resolution].map((link) => (
                <a
                  key={`${resolution}-${link.provider}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-xs md:text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                  <span className="font-medium">{link.provider}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
