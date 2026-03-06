import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Ongoing } from './pages/Ongoing';
import { Completed } from './pages/Completed';
import { Schedule } from './pages/Schedule';
import { Search } from './pages/Search';
import { Genres } from './pages/Genres';
import { GenreDetail } from './pages/GenreDetail';
import { AnimeList } from './pages/AnimeList';
import { AnimeDetail } from './pages/AnimeDetail';
import { AnimeWatch } from './pages/AnimeWatch';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Volatile data like episodes should be fetched on every mount
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="ongoing" element={<Ongoing />} />
            <Route path="completed" element={<Completed />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="search" element={<Search />} />
            <Route path="genres" element={<Genres />} />
            <Route path="genre/:name" element={<GenreDetail />} />
            <Route path="list" element={<AnimeList />} />
            <Route path="anime/:slug" element={<AnimeDetail />} />
            <Route path="anime/:slug/:episode" element={<AnimeWatch />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
