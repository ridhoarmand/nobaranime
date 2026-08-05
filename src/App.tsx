import { Component, ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-black min-h-screen pt-24 pb-20 flex flex-col justify-center items-center text-white p-4 text-center">
          <h2 className="text-xl font-bold mb-2">Gagal Memuat Halaman</h2>
          <p className="text-sm text-gray-400 mb-4">Terjadi kendala jaringan saat mengunduh komponen.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 font-bold text-xs rounded-lg transition"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Ongoing = lazy(() => import('./pages/Ongoing').then(m => ({ default: m.Ongoing })));
const Completed = lazy(() => import('./pages/Completed').then(m => ({ default: m.Completed })));
const Schedule = lazy(() => import('./pages/Schedule').then(m => ({ default: m.Schedule })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Genres = lazy(() => import('./pages/Genres').then(m => ({ default: m.Genres })));
const GenreDetail = lazy(() => import('./pages/GenreDetail').then(m => ({ default: m.GenreDetail })));
const AnimeList = lazy(() => import('./pages/AnimeList').then(m => ({ default: m.AnimeList })));
const AnimeDetail = lazy(() => import('./pages/AnimeDetail').then(m => ({ default: m.AnimeDetail })));
const AnimeWatch = lazy(() => import('./pages/AnimeWatch').then(m => ({ default: m.AnimeWatch })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="bg-black min-h-screen pt-24 pb-20 flex justify-center items-center">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
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
          </Suspense>
        </ErrorBoundary>
        <PWAInstallPrompt />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
