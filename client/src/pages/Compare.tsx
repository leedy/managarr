import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInstancesByType,
  getSonarrSeries,
  getRadarrMovies,
  getExcludedPlexLibraries,
} from '../services/api';
import axios from 'axios';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';

type CompareMode = 'plex-vs-arr' | 'arr-vs-plex';

interface CompareItem {
  title: string;
  year?: number;
  inPlex: boolean;
  inArr: boolean;
  type: 'movie' | 'series';
  plexKey?: string;
  arrId?: number;
  arrInstanceId?: string;
}

export default function Compare() {
  const [compareMode, setCompareMode] = useState<CompareMode>('plex-vs-arr');
  const [mediaType, setMediaType] = useState<'movies' | 'series'>('movies');

  // Fetch all instances
  const { data: plexInstances } = useQuery({
    queryKey: ['instances', 'plex'],
    queryFn: () => getInstancesByType('plex'),
  });

  const { data: sonarrInstances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  const { data: radarrInstances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Fetch excluded libraries setting
  const { data: excludedLibraries } = useQuery({
    queryKey: ['excluded-plex-libraries'],
    queryFn: getExcludedPlexLibraries,
  });

  // Fetch Plex libraries
  const plexQuery = useQuery({
    queryKey: ['plex-all-libraries', plexInstances?.map((i) => i._id), mediaType, excludedLibraries],
    queryFn: async () => {
      if (!plexInstances || plexInstances.length === 0) return [];

      const items: Array<{ title: string; year?: number; ratingKey: string }> = [];
      const excluded = new Set(excludedLibraries || []);

      for (const instance of plexInstances) {
        try {
          const libResponse = await axios.get(`/api/plex/${instance._id}/libraries`);
          const libraries = libResponse.data.MediaContainer?.Directory || [];

          // Get movie or show libraries based on mediaType
          const targetType = mediaType === 'movies' ? 'movie' : 'show';
          const targetLibraries = libraries.filter((l: { type: string; key: string }) => {
            // Check if this library is excluded
            const libraryKey = `${instance._id}:${l.key}`;
            if (excluded.has(libraryKey)) return false;
            return l.type === targetType;
          });

          for (const lib of targetLibraries) {
            const contentResponse = await axios.get(`/api/plex/${instance._id}/libraries/${lib.key}`);
            const metadata = contentResponse.data.MediaContainer?.Metadata || [];

            for (const item of metadata) {
              items.push({
                title: item.title,
                year: item.year,
                ratingKey: item.ratingKey,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching Plex library:', error);
        }
      }

      return items;
    },
    enabled: !!plexInstances && plexInstances.length > 0,
  });

  // Fetch *arr data
  const arrQuery = useQuery({
    queryKey: ['arr-all-data', mediaType, sonarrInstances?.map((i) => i._id), radarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      const items: Array<{ title: string; year: number; id: number; instanceId: string; hasFile: boolean }> = [];

      if (mediaType === 'movies' && radarrInstances) {
        for (const instance of radarrInstances) {
          const movies = await getRadarrMovies(instance._id);
          for (const m of movies) {
            // Only include movies that have been downloaded
            if (m.hasFile) {
              items.push({
                title: m.title,
                year: m.year,
                id: m.id,
                instanceId: instance._id,
                hasFile: true,
              });
            }
          }
        }
      } else if (mediaType === 'series' && sonarrInstances) {
        for (const instance of sonarrInstances) {
          const series = await getSonarrSeries(instance._id);
          for (const s of series) {
            // Only include series that have at least one episode downloaded
            const hasFiles = (s.statistics?.episodeFileCount || 0) > 0;
            if (hasFiles) {
              items.push({
                title: s.title,
                year: s.year,
                id: s.id,
                instanceId: instance._id,
                hasFile: true,
              });
            }
          }
        }
      }

      return items;
    },
    enabled: (mediaType === 'movies' && !!radarrInstances) || (mediaType === 'series' && !!sonarrInstances),
  });

  // Compare the two lists
  const comparison = useMemo(() => {
    const plexItems = plexQuery.data || [];
    const arrItems = arrQuery.data || [];

    const results: CompareItem[] = [];
    const plexTitles = new Map<string, { title: string; year?: number; ratingKey: string }>();
    const arrTitles = new Map<string, { title: string; year: number; id: number; instanceId: string; hasFile: boolean }>();

    // Normalize title for comparison
    const normalize = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Build maps
    for (const item of plexItems) {
      const key = normalize(item.title) + (item.year || '');
      plexTitles.set(key, item);
    }

    for (const item of arrItems) {
      const key = normalize(item.title) + item.year;
      arrTitles.set(key, item);
    }

    // Find all unique keys
    const allKeys = new Set([...plexTitles.keys(), ...arrTitles.keys()]);

    for (const key of allKeys) {
      const plexItem = plexTitles.get(key);
      const arrItem = arrTitles.get(key);

      results.push({
        title: plexItem?.title || arrItem?.title || '',
        year: plexItem?.year || arrItem?.year,
        inPlex: !!plexItem,
        inArr: !!arrItem,
        type: mediaType === 'movies' ? 'movie' : 'series',
        plexKey: plexItem?.ratingKey,
        arrId: arrItem?.id,
        arrInstanceId: arrItem?.instanceId,
      });
    }

    // Sort based on compare mode
    if (compareMode === 'plex-vs-arr') {
      // Show items in Plex but not in *arr first
      results.sort((a, b) => {
        if (a.inPlex && !a.inArr && !(b.inPlex && !b.inArr)) return -1;
        if (b.inPlex && !b.inArr && !(a.inPlex && !a.inArr)) return 1;
        return a.title.localeCompare(b.title);
      });
    } else {
      // Show items in *arr but not in Plex first
      results.sort((a, b) => {
        if (a.inArr && !a.inPlex && !(b.inArr && !b.inPlex)) return -1;
        if (b.inArr && !b.inPlex && !(a.inArr && !a.inPlex)) return 1;
        return a.title.localeCompare(b.title);
      });
    }

    return results;
  }, [plexQuery.data, arrQuery.data, compareMode, mediaType]);

  const stats = useMemo(() => {
    const inBoth = comparison.filter((c) => c.inPlex && c.inArr).length;
    const onlyPlex = comparison.filter((c) => c.inPlex && !c.inArr).length;
    const onlyArr = comparison.filter((c) => c.inArr && !c.inPlex).length;
    return { inBoth, onlyPlex, onlyArr };
  }, [comparison]);

  const isLoading = plexQuery.isLoading || arrQuery.isLoading;
  const arrLabel = mediaType === 'movies' ? 'Radarr' : 'Sonarr';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Library Comparison</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
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

        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          <button
            onClick={() => setCompareMode('plex-vs-arr')}
            className={`px-4 py-2 text-sm ${
              compareMode === 'plex-vs-arr'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Plex → {arrLabel}
          </button>
          <button
            onClick={() => setCompareMode('arr-vs-plex')}
            className={`px-4 py-2 text-sm ${
              compareMode === 'arr-vs-plex'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {arrLabel} → Plex
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{stats.inBoth}</div>
              <div className="text-sm text-gray-400">In Both</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{stats.onlyPlex}</div>
              <div className="text-sm text-gray-400">Only in Plex</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{stats.onlyArr}</div>
              <div className="text-sm text-gray-400">Only in {arrLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : comparison.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No data to compare</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Year</th>
                <th className="p-3 text-center">In Plex</th>
                <th className="p-3 text-center">In {arrLabel}</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {comparison.map((item, idx) => (
                <tr
                  key={`${item.title}-${item.year}-${idx}`}
                  className={`hover:bg-gray-700/30 ${
                    !item.inPlex || !item.inArr ? 'bg-yellow-900/10' : ''
                  }`}
                >
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3 text-gray-400">{item.year || '-'}</td>
                  <td className="p-3 text-center">
                    {item.inPlex ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500 inline" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500 inline" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {item.inArr ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500 inline" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500 inline" />
                    )}
                  </td>
                  <td className="p-3">
                    {item.inPlex && item.inArr ? (
                      <span className="text-green-400 text-sm">Synced</span>
                    ) : item.inPlex && !item.inArr ? (
                      <span className="text-orange-400 text-sm">Not in {arrLabel}</span>
                    ) : (
                      <span className="text-red-400 text-sm">Not in Plex</span>
                    )}
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
