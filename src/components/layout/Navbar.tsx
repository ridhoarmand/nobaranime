import { Link, useNavigate, useLocation } from 'react-router-dom';import { Search, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsMobileMenuOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
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

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="hidden lg:block">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search anime..."
                  className="w-56 xl:w-72 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 pl-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </form>

            <button onClick={() => navigate('/search')} className="lg:hidden p-2 text-gray-300 hover:text-white transition" aria-label="Search">
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
          <div className="px-4 py-4 space-y-1">
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
