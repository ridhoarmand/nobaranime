import { useQuery } from '@tanstack/react-query';import { AnimeApi } from '../lib/api';
import { AnimeSchedule } from '../components/anime/AnimeSchedule';

export function Schedule() {
  const { data, isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => AnimeApi.getSchedule(),
  });

  if (isLoading) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="bg-black min-h-screen pt-4 pb-20 px-4 sm:px-6 lg:px-8">
      <AnimeSchedule schedule={data?.data || {}} />
    </main>
  );
}
