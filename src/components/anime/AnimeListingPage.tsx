import { useState, useEffect, useCallback } from 'react';import { AnimeCard } from './AnimeCard';
import { Anime } from '../../types/anime';
import { Loader2 } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface AnimeListingPageProps {
  title: string;
  initialData: Anime[];
  fetchMore: (page: number) => Promise<{ data: Anime[]; page?: number; total_pages?: number }>;
  showReleaseDayBadge?: boolean;
  groupByWeek?: boolean;
}

export function AnimeListingPage({ title, initialData, fetchMore, showReleaseDayBadge = false, groupByWeek = false }: AnimeListingPageProps) {
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

      {groupByWeek ? (
        <div className="space-y-12">
          {Object.entries(
            data.reduce((acc, anime) => {
              const dateStr = anime.last_episode_date || anime.latest_episode?.date;
              let group = 'MINGGU INI';
              
              if (!dateStr) {
                group = 'PENDING';
              } else {
                const date = new Date(dateStr.split(' ')[0]);
                const today = new Date();
                today.setHours(0,0,0,0);
                date.setHours(0,0,0,0);
                
                const diffTime = today.getTime() - date.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                if (diffDays > 30) {
                  group = 'PENDING';
                } else {
                  const todayDay = today.getDay() || 7;
                  const lastMonday = new Date(today);
                  lastMonday.setDate(today.getDate() - (todayDay - 1));
                  
                  const dateDay = date.getDay() || 7;
                  const dateMonday = new Date(date);
                  dateMonday.setDate(date.getDate() - (dateDay - 1));
                  
                  const diffWeeks = Math.floor((lastMonday.getTime() - dateMonday.getTime()) / (1000 * 60 * 60 * 24 * 7));
                  
                  if (diffWeeks <= 0) {
                    group = 'MINGGU INI';
                  } else if (diffWeeks === 1) {
                    group = '1 MINGGU LALU';
                  } else if (diffWeeks === 2) {
                    group = '2 MINGGU LALU';
                  } else if (diffWeeks === 3) {
                    group = '3 MINGGU LALU';
                  } else {
                    group = '4+ MINGGU LALU';
                  }
                }
              }
              
              if (!acc[group]) acc[group] = [];
              acc[group].push(anime);
              return acc;
            }, {} as Record<string, Anime[]>)
          )
          .sort(([a], [b]) => {
            const order = ['MINGGU INI', '1 MINGGU LALU', '2 MINGGU LALU', '3 MINGGU LALU', '4+ MINGGU LALU', 'PENDING'];
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
          })
          .map(([groupName, animes]) => (
            <div key={groupName}>
              <h2 className="text-xl font-bold text-gray-300 mb-4 border-b border-white/10 pb-2">{groupName}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {animes.map((anime, index) => (
                  <AnimeCard key={`${anime.id}-${index}`} anime={anime} showReleaseDayBadge={showReleaseDayBadge} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {data.map((anime, index) => (
            <AnimeCard key={`${anime.id}-${index}`} anime={anime} showReleaseDayBadge={showReleaseDayBadge} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      )}

      {!hasMore && data.length > 0 && <div className="text-center py-8 text-gray-500">You've reached the end of the list.</div>}
    </div>
  );
}
