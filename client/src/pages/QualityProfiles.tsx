import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInstancesByType,
  getSonarrSeries,
  getSonarrQualityProfiles,
  getRadarrMovies,
  getRadarrQualityProfiles,
} from '../services/api';

interface ProfileStats {
  profileId: number;
  profileName: string;
  instanceId: string;
  instanceName: string;
  instanceType: 'sonarr' | 'radarr';
  itemCount: number;
  totalSize: number;
  items: Array<{ id: number; title: string; size: number }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function QualityProfiles() {
  // Fetch all instances
  const { data: sonarrInstances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  const { data: radarrInstances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Fetch data for each Sonarr instance
  const sonarrQueries = useQuery({
    queryKey: ['sonarr-all-data', sonarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!sonarrInstances) return [];
      const results: ProfileStats[] = [];

      for (const instance of sonarrInstances) {
        const [series, profiles] = await Promise.all([
          getSonarrSeries(instance._id),
          getSonarrQualityProfiles(instance._id),
        ]);

        const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

        // Group by profile
        const byProfile = new Map<number, ProfileStats>();
        for (const s of series) {
          if (!byProfile.has(s.qualityProfileId)) {
            byProfile.set(s.qualityProfileId, {
              profileId: s.qualityProfileId,
              profileName: profileMap.get(s.qualityProfileId) || 'Unknown',
              instanceId: instance._id,
              instanceName: instance.name,
              instanceType: 'sonarr',
              itemCount: 0,
              totalSize: 0,
              items: [],
            });
          }
          const stats = byProfile.get(s.qualityProfileId)!;
          stats.itemCount++;
          stats.totalSize += s.statistics?.sizeOnDisk || 0;
          stats.items.push({ id: s.id, title: s.title, size: s.statistics?.sizeOnDisk || 0 });
        }

        results.push(...byProfile.values());
      }

      return results;
    },
    enabled: !!sonarrInstances && sonarrInstances.length > 0,
  });

  // Fetch data for each Radarr instance
  const radarrQueries = useQuery({
    queryKey: ['radarr-all-data', radarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!radarrInstances) return [];
      const results: ProfileStats[] = [];

      for (const instance of radarrInstances) {
        const [movies, profiles] = await Promise.all([
          getRadarrMovies(instance._id),
          getRadarrQualityProfiles(instance._id),
        ]);

        const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

        // Group by profile
        const byProfile = new Map<number, ProfileStats>();
        for (const m of movies) {
          if (!byProfile.has(m.qualityProfileId)) {
            byProfile.set(m.qualityProfileId, {
              profileId: m.qualityProfileId,
              profileName: profileMap.get(m.qualityProfileId) || 'Unknown',
              instanceId: instance._id,
              instanceName: instance.name,
              instanceType: 'radarr',
              itemCount: 0,
              totalSize: 0,
              items: [],
            });
          }
          const stats = byProfile.get(m.qualityProfileId)!;
          stats.itemCount++;
          stats.totalSize += m.sizeOnDisk;
          stats.items.push({ id: m.id, title: m.title, size: m.sizeOnDisk });
        }

        results.push(...byProfile.values());
      }

      return results;
    },
    enabled: !!radarrInstances && radarrInstances.length > 0,
  });

  const allStats = useMemo(() => {
    const stats: ProfileStats[] = [];
    if (sonarrQueries.data) stats.push(...sonarrQueries.data);
    if (radarrQueries.data) stats.push(...radarrQueries.data);
    return stats.sort((a, b) => b.totalSize - a.totalSize);
  }, [sonarrQueries.data, radarrQueries.data]);

  const isLoading = sonarrQueries.isLoading || radarrQueries.isLoading;

  // Calculate totals
  const totals = useMemo(() => {
    return allStats.reduce(
      (acc, s) => ({
        items: acc.items + s.itemCount,
        size: acc.size + s.totalSize,
      }),
      { items: 0, size: 0 }
    );
  }, [allStats]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Quality Profiles</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold">{allStats.length}</div>
          <div className="text-sm text-gray-400">Active Profiles</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold">{totals.items}</div>
          <div className="text-sm text-gray-400">Total Items</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold">{formatBytes(totals.size)}</div>
          <div className="text-sm text-gray-400">Total Size</div>
        </div>
      </div>

      {/* Profile breakdown */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Profile Usage</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : allStats.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No data available</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3">Instance</th>
                <th className="p-3">Type</th>
                <th className="p-3">Profile</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">Size</th>
                <th className="p-3">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {allStats.map((stat, idx) => (
                <tr key={`${stat.instanceId}-${stat.profileId}-${idx}`} className="hover:bg-gray-700/30">
                  <td className="p-3 font-medium">{stat.instanceName}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        stat.instanceType === 'sonarr' ? 'bg-blue-600' : 'bg-yellow-600'
                      }`}
                    >
                      {stat.instanceType.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">{stat.profileName}</td>
                  <td className="p-3 text-right">{stat.itemCount}</td>
                  <td className="p-3 text-right">{formatBytes(stat.totalSize)}</td>
                  <td className="p-3 w-48">
                    <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-500 h-full"
                        style={{
                          width: `${Math.max(1, (stat.totalSize / totals.size) * 100)}%`,
                        }}
                      />
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
