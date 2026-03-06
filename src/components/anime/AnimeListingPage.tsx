import { useState, useEffect, useCallback } from 'react';import { AnimeCard } from './AnimeCard';
import { Anime } from '../../types/anime';
import { Loader2 } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface AnimeListingPageProps {
  title: string;
  initialData: Anime[];
  fetchMore: (page: number) => Promise<{ data: Anime[]; page?: number; total_pages?: number }>;
  showReleaseDayBadge?: boolean;
}

export function AnimeListingPage({ title, initialData, fetchMore, showReleaseDayBadge = false }: AnimeListingPageProps) {
  const [data, setData] = useState<Anime[]>(initialData);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useIntersectionObserver();

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetchMore(nextPage);

      if (res.data && res.data.length > 0) {
        setData((prev) => [...prev, ...res.data]);
        setPage(nextPage);
        if (res.page !== undefined && res.total_pages !== undefined && res.page >= res.total_pages) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more anime:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, fetchMore, hasMore, loading]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore();
    }
  }, [inView, hasMore, loading, loadMore]);

  return (
    <div className="mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8 border-l-4 border-red-600 pl-4">{title}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
        {data.map((anime, index) => (
          <AnimeCard key={`${anime.id}-${index}`} anime={anime} showReleaseDayBadge={showReleaseDayBadge} />
        ))}
      </div>

      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      )}

      {!hasMore && data.length > 0 && <div className="text-center py-8 text-gray-500">You've reached the end of the list.</div>}
    </div>
  );
}
