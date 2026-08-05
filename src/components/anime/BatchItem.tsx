import { useQuery } from '@tanstack/react-query';
import { AnimeApi } from '../../lib/api';
import { ResolutionDownloadDropdown } from './ResolutionDownloadDropdown';
import { Batch, DownloadLink } from '../../types/anime';

export function BatchItem({ batch }: { batch: Batch }) {
  const { data: batchDetail, isLoading } = useQuery({
    queryKey: ['batch', batch.endpoint],
    queryFn: () => AnimeApi.getBatch(batch.endpoint),
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
