import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTmdbMovie, findByExternalId, getTmdbApiKey } from '../services/api';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

interface PosterHoverProps {
  tmdbId?: number;
  tvdbId?: number;
  type: 'movie' | 'tv';
  children: React.ReactNode;
}

export default function PosterHover({ tmdbId, tvdbId, type, children }: PosterHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if TMDB API key is configured
  const { data: apiKey } = useQuery({
    queryKey: ['tmdb-api-key'],
    queryFn: getTmdbApiKey,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // For movies, fetch directly by TMDB ID
  const { data: movieData } = useQuery({
    queryKey: ['tmdb-movie', tmdbId],
    queryFn: () => getTmdbMovie(tmdbId!),
    enabled: !!apiKey && type === 'movie' && !!tmdbId && isHovering,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // For TV shows, we need to find by TVDB ID first
  const { data: tvFindResult } = useQuery({
    queryKey: ['tmdb-find-tvdb', tvdbId],
    queryFn: () => findByExternalId(String(tvdbId), 'tvdb_id'),
    enabled: !!apiKey && type === 'tv' && !!tvdbId && isHovering,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });

    // Small delay before showing to avoid flashing on quick movements
    hoverTimeout.current = setTimeout(() => {
      setIsHovering(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setIsHovering(false);
  };

  // Don't render poster if no API key
  if (!apiKey) {
    return <>{children}</>;
  }

  // Get the poster path
  let posterPath: string | null = null;
  if (type === 'movie' && movieData?.poster_path) {
    posterPath = movieData.poster_path;
  } else if (type === 'tv' && tvFindResult?.tv_results?.[0]?.poster_path) {
    posterPath = tvFindResult.tv_results[0].poster_path;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovering && posterPath && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
            <img
              src={`${TMDB_IMAGE_BASE}${posterPath}`}
              alt="Poster"
              className="w-40 h-60 object-cover"
              loading="eager"
            />
          </div>
        </div>
      )}
    </div>
  );
}
