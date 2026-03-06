import { useState } from 'react';import { Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
  containerClassName?: string;
}

export function ImageWithFallback({ src, alt, className, fallbackText, containerClassName, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error || !src) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-zinc-900 border border-white/5', containerClassName, className)}>
        <ImageIcon className="w-8 h-8 text-zinc-700 mb-2" />
        {fallbackText && <span className="text-[10px] sm:text-xs text-center text-zinc-500 px-2 line-clamp-2">{fallbackText}</span>}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      <img
        src={src}
        alt={alt}
        className={cn(className, 'transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        {...props}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 animate-pulse">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
