import { useState, useEffect } from 'react';
import { Stream } from '../../types/anime';
import { AlertCircle } from 'lucide-react';
import { StreamQualityDropdown } from './StreamQualityDropdown';

interface AnimePlayerProps {
  streams: Stream[];
  title: string;
}

export function AnimePlayer({ streams, title }: AnimePlayerProps) {
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);

  useEffect(() => {
    if (streams && streams.length > 0) {
      const defaultStream = streams.find((s) => s.is_default === 1) || streams[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStream(defaultStream);
    }
  }, [streams]);

  if (!streams || streams.length === 0) {
    return (
      <div className="aspect-video w-full bg-black flex flex-col items-center justify-center text-gray-500 rounded-xl border border-zinc-800">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>No streams available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
        {currentStream ? (
          <iframe
            key={currentStream.id}
            src={currentStream.url}
            title={title}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <StreamQualityDropdown streams={streams} currentStream={currentStream} onStreamSelect={setCurrentStream} />
    </div>
  );
}
