import { useQuery } from '@tanstack/react-query';import { AnimeListingPage } from '../components/anime/AnimeListingPage';
import { AnimeApi } from '../lib/api';

export function Ongoing() {
  const { data, isLoading } = useQuery({
    queryKey: ['ongoing', 1],
    queryFn: () => AnimeApi.getOngoing(1),
  });

  if (isLoading) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const initialData = data?.data || [];

  return (
    <main className="bg-black min-h-screen pt-4 pb-20 px-4 sm:px-6 lg:px-8">
      <AnimeListingPage title="Rilisan Terbaru" initialData={initialData} fetchMore={async (page) => AnimeApi.getOngoing(page)} showReleaseDayBadge groupByWeek />
    </main>
  );
}
