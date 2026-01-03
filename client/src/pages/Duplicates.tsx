import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInstancesByType,
  getRadarrMovies,
  getSonarrSeries,
} from '../services/api';
import type { RadarrMovie, SonarrSeries, Instance } from '../types';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

interface DuplicateItem {
  key: string;
  title: string;
  year: number;
  externalId?: number;
  instances: Array<{
    instanceId: string;
    instanceName: string;
    path: string;
    sizeOnDisk: number;
    itemId: number;
  }>;
  totalSize: number;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Duplicates() {
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

  // Fetch all movies from all Radarr instances
  const radarrQuery = useQuery({
    queryKey: ['radarr-all-movies', radarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!radarrInstances) return [];
      const allMovies: Array<{ movie: RadarrMovie; instance: Instance }> = [];

      for (const instance of radarrInstances) {
        try {
          const movies = await getRadarrMovies(instance._id);
          for (const movie of movies) {
            allMovies.push({ movie, instance });
          }
        } catch (error) {
          console.error(`Error fetching movies from ${instance.name}:`, error);
        }
      }

      return allMovies;
    },
    enabled: !!radarrInstances && radarrInstances.length > 0,
  });

  // Fetch all series from all Sonarr instances
  const sonarrQuery = useQuery({
    queryKey: ['sonarr-all-series', sonarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!sonarrInstances) return [];
      const allSeries: Array<{ series: SonarrSeries; instance: Instance }> = [];

      for (const instance of sonarrInstances) {
        try {
          const seriesList = await getSonarrSeries(instance._id);
          for (const series of seriesList) {
            allSeries.push({ series, instance });
          }
        } catch (error) {
          console.error(`Error fetching series from ${instance.name}:`, error);
        }
      }

      return allSeries;
    },
    enabled: !!sonarrInstances && sonarrInstances.length > 0,
  });

  // Find duplicates in movies
  const movieDuplicates = useMemo(() => {
    if (!radarrQuery.data) return [];

    const byKey: Record<string, DuplicateItem> = {};

    for (const { movie, instance } of radarrQuery.data) {
      // Primary key: TMDB ID, fallback to title+year
      const key = movie.tmdbId
        ? `tmdb-${movie.tmdbId}`
        : `title-${movie.title.toLowerCase()}-${movie.year}`;

      if (!byKey[key]) {
        byKey[key] = {
          key,
          title: movie.title,
          year: movie.year,
          externalId: movie.tmdbId,
          instances: [],
          totalSize: 0,
        };
      }

      byKey[key].instances.push({
        instanceId: instance._id,
        instanceName: instance.name,
        path: movie.path,
        sizeOnDisk: movie.sizeOnDisk,
        itemId: movie.id,
      });
      byKey[key].totalSize += movie.sizeOnDisk;
    }

    // Filter to only items with 2+ instances
    return Object.values(byKey)
      .filter((item) => item.instances.length >= 2)
      .sort((a, b) => b.totalSize - a.totalSize);
  }, [radarrQuery.data]);

  // Find duplicates in series
  const seriesDuplicates = useMemo(() => {
    if (!sonarrQuery.data) return [];

    const byKey: Record<string, DuplicateItem> = {};

    for (const { series, instance } of sonarrQuery.data) {
      // Primary key: TVDB ID, fallback to title+year
      const key = series.tvdbId
        ? `tvdb-${series.tvdbId}`
        : `title-${series.title.toLowerCase()}-${series.year}`;

      if (!byKey[key]) {
        byKey[key] = {
          key,
          title: series.title,
          year: series.year,
          externalId: series.tvdbId,
          instances: [],
          totalSize: 0,
        };
      }

      byKey[key].instances.push({
        instanceId: instance._id,
        instanceName: instance.name,
        path: series.path,
        sizeOnDisk: series.statistics?.sizeOnDisk || 0,
        itemId: series.id,
      });
      byKey[key].totalSize += series.statistics?.sizeOnDisk || 0;
    }

    // Filter to only items with 2+ instances
    return Object.values(byKey)
      .filter((item) => item.instances.length >= 2)
      .sort((a, b) => b.totalSize - a.totalSize);
  }, [sonarrQuery.data]);

  const duplicates = mediaType === 'movies' ? movieDuplicates : seriesDuplicates;
  const isLoading = mediaType === 'movies' ? radarrQuery.isLoading : sonarrQuery.isLoading;

  // Calculate stats
  const stats = useMemo(() => {
    const totalDuplicateSize = duplicates.reduce((sum, item) => {
      // Only count the "extra" copies (total - one copy's worth)
      const avgSize = item.totalSize / item.instances.length;
      return sum + (item.totalSize - avgSize);
    }, 0);

    return {
      totalItems: duplicates.length,
      totalDuplicateSize,
    };
  }, [duplicates]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <DocumentDuplicateIcon className="w-8 h-8 text-orange-500" />
        <h1 className="text-2xl font-bold">Duplicate Detection</h1>
      </div>

      <p className="text-gray-400 mb-6">
        Media that exists in multiple instances. This could indicate duplicated storage usage.
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold text-orange-400">{stats.totalItems}</div>
          <div className="text-sm text-gray-400">
            {mediaType === 'movies' ? 'Movies' : 'Series'} with Duplicates
          </div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-400">{formatSize(stats.totalDuplicateSize)}</div>
          <div className="text-sm text-gray-400">Duplicate Storage Used</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold">
            {mediaType === 'movies' ? radarrInstances?.length || 0 : sonarrInstances?.length || 0}
          </div>
          <div className="text-sm text-gray-400">
            {mediaType === 'movies' ? 'Radarr' : 'Sonarr'} Instances
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : duplicates.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No duplicates found across your instances.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Year</th>
                <th className="p-3">{mediaType === 'movies' ? 'TMDB ID' : 'TVDB ID'}</th>
                <th className="p-3">Instances</th>
                <th className="p-3">Total Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {duplicates.map((item) => (
                <tr key={item.key} className="hover:bg-gray-700/30">
                  <td className="p-3">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.instances.map((inst, idx) => (
                        <div key={idx} className="truncate max-w-md" title={inst.path}>
                          {inst.path}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-gray-400">{item.year}</td>
                  <td className="p-3 text-gray-400 font-mono text-sm">
                    {item.externalId || '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {item.instances.map((inst, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 text-xs rounded ${
                            mediaType === 'movies' ? 'bg-yellow-600' : 'bg-blue-600'
                          }`}
                          title={`${formatSize(inst.sizeOnDisk)}`}
                        >
                          {inst.instanceName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-gray-400">{formatSize(item.totalSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {duplicates.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {duplicates.length} {mediaType === 'movies' ? 'movies' : 'series'} exist in multiple instances
        </div>
      )}
    </div>
  );
}
