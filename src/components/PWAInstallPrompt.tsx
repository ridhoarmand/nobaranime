import { X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">Install NobarAnime</h3>
          <p className="text-sm text-zinc-400">
            Install our app for a better experience and easy access!
          </p>
        </div>
        <button
          onClick={() => {
            // Dismiss logic can be added here if needed
          }}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={install}
          className="flex-1 bg-white text-black font-medium py-2 px-4 rounded-md hover:bg-zinc-200 transition-colors"
        >
          Install Now
        </button>
        <button
          onClick={() => {
            // Optionally hide the prompt
          }}
          className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
