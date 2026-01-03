import { useQuery } from '@tanstack/react-query';
import { getTmdbMovie, findByExternalId, getTmdbApiKey } from '../services/api';
import { FilmIcon } from '@heroicons/react/24/outline';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

interface PosterCardProps {
  tmdbId?: number;
  tvdbId?: number;
  type: 'movie' | 'tv';
  title: string;
  year: number;
  selected: boolean;
  onSelect: () => void;
}

export default function PosterCard({
  tmdbId,
  tvdbId,
  type,
  title,
  year,
  selected,
  onSelect,
}: PosterCardProps) {
  // Check if TMDB API key is configured
  const { data: apiKey } = useQuery({
    queryKey: ['tmdb-api-key'],
    queryFn: getTmdbApiKey,
    staleTime: 1000 * 60 * 5,
  });

  // For movies, fetch directly by TMDB ID
  const { data: movieData, isLoading: movieLoading } = useQuery({
    queryKey: ['tmdb-movie', tmdbId],
    queryFn: () => getTmdbMovie(tmdbId!),
    enabled: !!apiKey && type === 'movie' && !!tmdbId,
    staleTime: 1000 * 60 * 60,
  });

  // For TV shows, find by TVDB ID
  const { data: tvFindResult, isLoading: tvLoading } = useQuery({
    queryKey: ['tmdb-find-tvdb', tvdbId],
    queryFn: () => findByExternalId(String(tvdbId), 'tvdb_id'),
    enabled: !!apiKey && type === 'tv' && !!tvdbId,
    staleTime: 1000 * 60 * 60,
  });

  // Get poster path
  let posterPath: string | null = null;
  if (type === 'movie' && movieData?.poster_path) {
    posterPath = movieData.poster_path;
  } else if (type === 'tv' && tvFindResult?.tv_results?.[0]?.poster_path) {
    posterPath = tvFindResult.tv_results[0].poster_path;
  }

  const isLoading = (type === 'movie' && movieLoading) || (type === 'tv' && tvLoading);

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gray-800 cursor-pointer group transition-transform hover:scale-105 ${
        selected ? 'ring-2 ring-primary-500' : ''
      }`}
      onClick={onSelect}
    >
      {/* Aspect ratio container (2:3 poster ratio) */}
      <div className="aspect-[2/3] relative">
        {posterPath ? (
          <img
            src={`${TMDB_IMAGE_BASE}${posterPath}`}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            {isLoading ? (
              <div className="animate-pulse w-12 h-12 bg-gray-600 rounded-full" />
            ) : (
              <FilmIcon className="w-16 h-16 text-gray-500" />
            )}
          </div>
        )}

        {/* Selection checkbox */}
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded bg-gray-700/80 border-gray-500 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-8">
          <h3 className="text-sm font-medium text-white truncate">{title}</h3>
          <p className="text-xs text-gray-400">{year}</p>
        </div>
      </div>
    </div>
  );
}
