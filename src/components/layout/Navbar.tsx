import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Loader2, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AnimeApi } from '../../lib/api';
import { Anime } from '../../types/anime';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query listener
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    const timer = setTimeout(async () => {
      try {
        const res = await AnimeApi.getSearch(searchQuery.trim(), 6);
        if (Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Live search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsMobileMenuOpen(false);
      setShowDropdown(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/ongoing', label: 'Ongoing' },
    { href: '/completed', label: 'Completed' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/list', label: 'A-Z List' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/95 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-b from-black/90 to-transparent'}`}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-red-600 hover:text-red-500 transition">NobarAnime</h1>
          </Link>

          <div className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} className={`text-base font-semibold transition-all relative pb-1 ${isActive(item.href) ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                {item.label}
                {isActive(item.href) && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="hidden lg:block relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowDropdown(true)}
                  placeholder="Cari anime..."
                  className="w-56 xl:w-72 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 pl-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                )}
              </div>

              {/* Live Search Autocomplete Dropdown */}
              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-80 xl:w-96 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md z-50">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      Mencari anime...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
                      {searchResults.map((item) => (
                        <Link
                          key={item.id}
                          to={`/anime/${item.endpoint}`}
                          onClick={() => {
                            setShowDropdown(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-zinc-900 transition group"
                        >
                          <img src={item.thumb} alt={item.title} className="w-10 h-14 object-cover rounded-lg shrink-0 shadow" />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white group-hover:text-red-500 truncate transition">{item.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === 'Ongoing' ? 'bg-red-600/30 text-red-400 border border-red-500/20' : 'bg-blue-600/30 text-blue-400 border border-blue-500/20'}`}>
                                {item.status}
                              </span>
                              {item.score && (
                                <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-semibold">
                                  <Star className="w-3 h-3 fill-current" />
                                  {item.score}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="w-full py-2.5 bg-zinc-900 hover:bg-red-600 text-center text-xs font-bold text-white transition"
                      >
                        Lihat semua hasil untuk "{searchQuery}"
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-zinc-500">
                      Tidak ada anime ditemukan untuk "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </form>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-300 hover:text-white transition" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-gray-300 hover:text-white transition">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/98 border-t border-zinc-800">
          <div className="px-4 pt-3 pb-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari anime..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 pl-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              />
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
            </form>
            {showDropdown && searchResults.length > 0 && (
              <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-zinc-800">
                {searchResults.map((item) => (
                  <Link
                    key={item.id}
                    to={`/anime/${item.endpoint}`}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 p-2.5 hover:bg-zinc-900"
                  >
                    <img src={item.thumb} alt={item.title} className="w-8 h-11 object-cover rounded shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <span className="text-[10px] text-red-400">{item.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`block px-3 py-2 text-base font-medium rounded-lg transition ${isActive(item.href) ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-zinc-800'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
