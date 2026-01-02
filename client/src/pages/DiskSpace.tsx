import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInstancesByType,
  getSonarrSeries,
  getRadarrMovies,
} from '../services/api';

interface MediaItem {
  id: number;
  title: string;
  year: number;
  size: number;
  type: 'series' | 'movie';
  instanceName: string;
  instanceId: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DiskSpace() {
  // Fetch all instances
  const { data: sonarrInstances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  const { data: radarrInstances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Fetch all series
  const sonarrQuery = useQuery({
    queryKey: ['sonarr-all-series', sonarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!sonarrInstances) return [];
      const items: MediaItem[] = [];

      for (const instance of sonarrInstances) {
        const series = await getSonarrSeries(instance._id);
        for (const s of series) {
          if ((s.statistics?.sizeOnDisk || 0) > 0) {
            items.push({
              id: s.id,
              title: s.title,
              year: s.year,
              size: s.statistics?.sizeOnDisk || 0,
              type: 'series',
              instanceName: instance.name,
              instanceId: instance._id,
            });
          }
        }
      }

      return items;
    },
    enabled: !!sonarrInstances && sonarrInstances.length > 0,
  });

  // Fetch all movies
  const radarrQuery = useQuery({
    queryKey: ['radarr-all-movies', radarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!radarrInstances) return [];
      const items: MediaItem[] = [];

      for (const instance of radarrInstances) {
        const movies = await getRadarrMovies(instance._id);
        for (const m of movies) {
          if (m.sizeOnDisk > 0) {
            items.push({
              id: m.id,
              title: m.title,
              year: m.year,
              size: m.sizeOnDisk,
              type: 'movie',
              instanceName: instance.name,
              instanceId: instance._id,
            });
          }
        }
      }

      return items;
    },
    enabled: !!radarrInstances && radarrInstances.length > 0,
  });

  const allItems = useMemo(() => {
    const items: MediaItem[] = [];
    if (sonarrQuery.data) items.push(...sonarrQuery.data);
    if (radarrQuery.data) items.push(...radarrQuery.data);
    return items.sort((a, b) => b.size - a.size);
  }, [sonarrQuery.data, radarrQuery.data]);

  const isLoading = sonarrQuery.isLoading || radarrQuery.isLoading;

  // Calculate totals
  const stats = useMemo(() => {
    const seriesItems = allItems.filter((i) => i.type === 'series');
    const movieItems = allItems.filter((i) => i.type === 'movie');

    return {
      totalSize: allItems.reduce((acc, i) => acc + i.size, 0),
      seriesSize: seriesItems.reduce((acc, i) => acc + i.size, 0),
      movieSize: movieItems.reduce((acc, i) => acc + i.size, 0),
      seriesCount: seriesItems.length,
      movieCount: movieItems.length,
    };
  }, [allItems]);

  // Top 20 largest items
  const topItems = allItems.slice(0, 20);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Disk Space Analysis</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold">{formatBytes(stats.totalSize)}</div>
          <div className="text-sm text-gray-400">Total Media Size</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-400">{formatBytes(stats.seriesSize)}</div>
          <div className="text-sm text-gray-400">{stats.seriesCount} TV Series</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-400">{formatBytes(stats.movieSize)}</div>
          <div className="text-sm text-gray-400">{stats.movieCount} Movies</div>
        </div>
      </div>

      {/* Distribution bar */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Distribution</h3>
        <div className="flex rounded-full h-4 overflow-hidden">
          <div
            className="bg-blue-500"
            style={{ width: `${(stats.seriesSize / stats.totalSize) * 100}%` }}
            title={`TV Series: ${formatBytes(stats.seriesSize)}`}
          />
          <div
            className="bg-yellow-500"
            style={{ width: `${(stats.movieSize / stats.totalSize) * 100}%` }}
            title={`Movies: ${formatBytes(stats.movieSize)}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-500" /> TV Series
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500" /> Movies
          </span>
        </div>
      </div>

      {/* Largest items */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Largest Items (Top 20)</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : topItems.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No data available</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Title</th>
                <th className="p-3">Year</th>
                <th className="p-3">Type</th>
                <th className="p-3">Instance</th>
                <th className="p-3 text-right">Size</th>
                <th className="p-3">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {topItems.map((item, idx) => (
                <tr key={`${item.instanceId}-${item.type}-${item.id}`} className="hover:bg-gray-700/30">
                  <td className="p-3 text-gray-400">{idx + 1}</td>
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3 text-gray-400">{item.year}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        item.type === 'series' ? 'bg-blue-600' : 'bg-yellow-600'
                      }`}
                    >
                      {item.type === 'series' ? 'SERIES' : 'MOVIE'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">{item.instanceName}</td>
                  <td className="p-3 text-right font-mono">{formatBytes(item.size)}</td>
                  <td className="p-3 w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary-500 h-full"
                          style={{
                            width: `${(item.size / stats.totalSize) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {((item.size / stats.totalSize) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
