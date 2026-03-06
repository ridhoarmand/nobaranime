import { Github, Heart } from 'lucide-react';
export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-black via-zinc-950 to-black border-t border-white/5 py-14">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1">
            <h3 className="text-2xl font-bold text-red-600 mb-4">NobarAnime</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Stream anime together with friends — fast, fun, and free.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-red-500/90 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
              <Heart className="w-4 h-4" />
              <span>Made for otakus</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://anime.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Anime
                </a>
              </li>
              <li>
                <a href="https://film.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Film & Series
                </a>
              </li>
              <li>
                <a href="https://dracin.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Dracin
                </a>
              </li>
              <li>
                <a href="https://drakor.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Drakor
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Other Tools</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://pdf.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  PDF Tools
                </a>
              </li>
              <li>
                <a href="https://excalidraw.idho.eu.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition">
                  Excalidraw
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <div className="flex gap-4">
              <a href="https://github.com/ridhoarmand" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition" aria-label="GitHub">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/in/ridhoarmand" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition font-bold" aria-label="LinkedIn">
                in
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} NobarAnime. For educational purposes only.</p>
        </div>
      </div>
    </footer>
  );
}
