import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInstancesByType,
  getSonarrCutoffUnmet,
  getRadarrCutoffUnmet,
  getRadarrMovies,
} from '../services/api';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface CutoffItem {
  id: string;
  title: string;
  subtitle?: string;
  year?: number;
  currentQuality: string;
  path: string;
  instanceName: string;
  instanceId: string;
  type: 'movie' | 'episode';
}

export default function CutoffUnmet() {
  const [mediaType, setMediaType] = useState<'movies' | 'series'>('movies');

  // Fetch instances
  const { data: sonarrInstances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  const { data: radarrInstances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Fetch cutoff unmet for movies (Radarr)
  const radarrQuery = useQuery({
    queryKey: ['radarr-cutoff-unmet', radarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!radarrInstances) return [];
      const items: CutoffItem[] = [];

      for (const instance of radarrInstances) {
        try {
          // Fetch both cutoff unmet and all movies (for quality info)
          const [cutoffResponse, movies] = await Promise.all([
            getRadarrCutoffUnmet(instance._id),
            getRadarrMovies(instance._id),
          ]);

          // Create a lookup map for movie quality by ID
          const movieQualityMap = new Map<number, string>();
          for (const movie of movies) {
            if (movie.movieFile?.quality?.quality?.name) {
              movieQualityMap.set(movie.id, movie.movieFile.quality.quality.name);
            }
          }

          for (const record of cutoffResponse.records) {
            items.push({
              id: `radarr-${instance._id}-${record.id}`,
              title: record.title,
              year: record.year,
              currentQuality: movieQualityMap.get(record.id) || 'Unknown',
              path: record.path,
              instanceName: instance.name,
              instanceId: instance._id,
              type: 'movie',
            });
          }
        } catch (error) {
          console.error(`Error fetching cutoff unmet from ${instance.name}:`, error);
        }
      }

      return items;
    },
    enabled: !!radarrInstances && radarrInstances.length > 0,
  });

  // Fetch cutoff unmet for series (Sonarr)
  const sonarrQuery = useQuery({
    queryKey: ['sonarr-cutoff-unmet', sonarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!sonarrInstances) return [];
      const items: CutoffItem[] = [];

      for (const instance of sonarrInstances) {
        try {
          const response = await getSonarrCutoffUnmet(instance._id);
          for (const record of response.records) {
            items.push({
              id: `sonarr-${instance._id}-${record.id}`,
              title: record.series?.title || 'Unknown Series',
              subtitle: `S${String(record.seasonNumber).padStart(2, '0')}E${String(record.episodeNumber).padStart(2, '0')} - ${record.title}`,
              year: record.series?.year,
              currentQuality: record.episodeFile?.quality?.quality?.name || 'Unknown',
              path: record.series?.path || '',
              instanceName: instance.name,
              instanceId: instance._id,
              type: 'episode',
            });
          }
        } catch (error) {
          console.error(`Error fetching cutoff unmet from ${instance.name}:`, error);
        }
      }

      return items;
    },
    enabled: !!sonarrInstances && sonarrInstances.length > 0,
  });

  const items = useMemo(() => {
    if (mediaType === 'movies') {
      return radarrQuery.data || [];
    }
    return sonarrQuery.data || [];
  }, [mediaType, radarrQuery.data, sonarrQuery.data]);

  const isLoading = mediaType === 'movies' ? radarrQuery.isLoading : sonarrQuery.isLoading;

  // Group by instance for stats
  const stats = useMemo(() => {
    const byInstance: Record<string, number> = {};
    for (const item of items) {
      byInstance[item.instanceName] = (byInstance[item.instanceName] || 0) + 1;
    }
    return {
      total: items.length,
      byInstance,
    };
  }, [items]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
        <h1 className="text-2xl font-bold">Cutoff Unmet</h1>
      </div>

      <p className="text-gray-400 mb-6">
        Media files that don't meet their quality profile cutoff and are eligible for upgrade.
      </p>

      {/* Media type toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          <button
            onClick={() => setMediaType('movies')}
            className={`px-4 py-2 text-sm ${
              mediaType === 'movies'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setMediaType('series')}
            className={`px-4 py-2 text-sm ${
              mediaType === 'series'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            TV Series
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.total}</div>
          <div className="text-sm text-gray-400">
            {mediaType === 'movies' ? 'Movies' : 'Episodes'} Below Cutoff
          </div>
        </div>
        {Object.entries(stats.byInstance).map(([name, count]) => (
          <div key={name} className="card p-4">
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-sm text-gray-400">{name}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No items below quality cutoff. Everything meets your quality standards!
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3">Title</th>
                {mediaType === 'series' && <th className="p-3">Episode</th>}
                <th className="p-3">Year</th>
                <th className="p-3">Current Quality</th>
                <th className="p-3">Instance</th>
                <th className="p-3">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-700/30">
                  <td className="p-3 font-medium">{item.title}</td>
                  {mediaType === 'series' && (
                    <td className="p-3 text-gray-400 text-sm">{item.subtitle}</td>
                  )}
                  <td className="p-3 text-gray-400">{item.year || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded bg-yellow-600/50 text-yellow-200">
                      {item.currentQuality}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      item.type === 'movie' ? 'bg-yellow-600' : 'bg-blue-600'
                    }`}>
                      {item.instanceName}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs font-mono truncate max-w-xs" title={item.path}>
                    {item.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {items.length} {mediaType === 'movies' ? 'movies' : 'episodes'} below cutoff
        </div>
      )}
    </div>
  );
}
