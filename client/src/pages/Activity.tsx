import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInstancesByType,
  getSonarrHistory,
  getRadarrHistory,
} from '../services/api';
import type { SonarrHistoryRecord, RadarrHistoryRecord } from '../types';
import {
  ClockIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  mediaTitle: string;
  subtitle?: string;
  sourceTitle: string;
  eventType: string;
  date: Date;
  quality: string;
  indexer?: string;
  downloadClient?: string;
  instanceName: string;
  instanceId: string;
  type: 'movie' | 'episode';
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'grabbed':
      return <ArrowDownTrayIcon className="w-5 h-5 text-blue-400" />;
    case 'downloadFolderImported':
      return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
    case 'downloadFailed':
      return <XCircleIcon className="w-5 h-5 text-red-400" />;
    case 'movieFileDeleted':
    case 'episodeFileDeleted':
      return <TrashIcon className="w-5 h-5 text-orange-400" />;
    case 'movieFileRenamed':
    case 'episodeFileRenamed':
      return <ArrowPathIcon className="w-5 h-5 text-yellow-400" />;
    default:
      return <ClockIcon className="w-5 h-5 text-gray-400" />;
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case 'grabbed':
      return 'Grabbed';
    case 'downloadFolderImported':
      return 'Imported';
    case 'downloadFailed':
      return 'Failed';
    case 'movieFileDeleted':
    case 'episodeFileDeleted':
      return 'Deleted';
    case 'movieFileRenamed':
    case 'episodeFileRenamed':
      return 'Renamed';
    default:
      return eventType;
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case 'grabbed':
      return 'bg-blue-600';
    case 'downloadFolderImported':
      return 'bg-green-600';
    case 'downloadFailed':
      return 'bg-red-600';
    case 'movieFileDeleted':
    case 'episodeFileDeleted':
      return 'bg-orange-600';
    case 'movieFileRenamed':
    case 'episodeFileRenamed':
      return 'bg-yellow-600';
    default:
      return 'bg-gray-600';
  }
}

export default function Activity() {
  // Fetch instances
  const { data: sonarrInstances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  const { data: radarrInstances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Fetch history from all Sonarr instances
  const sonarrQuery = useQuery({
    queryKey: ['sonarr-history', sonarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!sonarrInstances) return [];
      const items: ActivityItem[] = [];

      for (const instance of sonarrInstances) {
        try {
          const response = await getSonarrHistory(instance._id);
          for (const record of response.records as SonarrHistoryRecord[]) {
            items.push({
              id: `sonarr-${instance._id}-${record.id}`,
              mediaTitle: record.series?.title || 'Unknown Series',
              subtitle: record.episode
                ? `S${String(record.episode.seasonNumber).padStart(2, '0')}E${String(record.episode.episodeNumber).padStart(2, '0')} - ${record.episode.title}`
                : undefined,
              sourceTitle: record.sourceTitle,
              eventType: record.eventType,
              date: new Date(record.date),
              quality: record.quality?.quality?.name || 'Unknown',
              indexer: record.data?.indexer,
              downloadClient: record.data?.downloadClient,
              instanceName: instance.name,
              instanceId: instance._id,
              type: 'episode',
            });
          }
        } catch (error) {
          console.error(`Error fetching history from ${instance.name}:`, error);
        }
      }

      return items;
    },
    enabled: !!sonarrInstances && sonarrInstances.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch history from all Radarr instances
  const radarrQuery = useQuery({
    queryKey: ['radarr-history', radarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!radarrInstances) return [];
      const items: ActivityItem[] = [];

      for (const instance of radarrInstances) {
        try {
          const response = await getRadarrHistory(instance._id);
          for (const record of response.records as RadarrHistoryRecord[]) {
            items.push({
              id: `radarr-${instance._id}-${record.id}`,
              mediaTitle: record.movie?.title || 'Unknown Movie',
              subtitle: record.movie?.year ? `(${record.movie.year})` : undefined,
              sourceTitle: record.sourceTitle,
              eventType: record.eventType,
              date: new Date(record.date),
              quality: record.quality?.quality?.name || 'Unknown',
              indexer: record.data?.indexer,
              downloadClient: record.data?.downloadClient,
              instanceName: instance.name,
              instanceId: instance._id,
              type: 'movie',
            });
          }
        } catch (error) {
          console.error(`Error fetching history from ${instance.name}:`, error);
        }
      }

      return items;
    },
    enabled: !!radarrInstances && radarrInstances.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Combine and sort by date (newest first)
  const allItems = useMemo(() => {
    const items = [...(sonarrQuery.data || []), ...(radarrQuery.data || [])];
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sonarrQuery.data, radarrQuery.data]);

  const isLoading = sonarrQuery.isLoading || radarrQuery.isLoading;

  // Stats
  const stats = useMemo(() => {
    const grabbed = allItems.filter((i) => i.eventType === 'grabbed').length;
    const imported = allItems.filter((i) => i.eventType === 'downloadFolderImported').length;
    const failed = allItems.filter((i) => i.eventType === 'downloadFailed').length;

    return { total: allItems.length, grabbed, imported, failed };
  }, [allItems]);

  // Group by date for timeline display
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};

    for (const item of allItems) {
      const dateKey = item.date.toLocaleDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    }

    return Object.entries(groups);
  }, [allItems]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClockIcon className="w-8 h-8 text-purple-500" />
        <h1 className="text-2xl font-bold">Activity History</h1>
        <span className="text-sm text-gray-400">(auto-refreshes every 30s)</span>
      </div>

      <p className="text-gray-400 mb-6">
        Recent activity across all Sonarr and Radarr instances.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Events</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.grabbed}</div>
          <div className="text-sm text-gray-400">Grabbed</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-400">{stats.imported}</div>
          <div className="text-sm text-gray-400">Imported</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          <div className="text-sm text-gray-400">Failed</div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : allItems.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No activity history found.
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {groupedByDate.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="bg-gray-700/50 px-4 py-2 text-sm font-medium text-gray-400">
                  {dateLabel}
                </div>
                <div className="divide-y divide-gray-700/50">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-700/30">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getEventIcon(item.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{item.mediaTitle}</span>
                            {item.subtitle && (
                              <span className="text-gray-400 text-sm">{item.subtitle}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate mb-2" title={item.sourceTitle}>
                            {item.sourceTitle}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 text-xs rounded ${getEventColor(item.eventType)}`}>
                              {getEventLabel(item.eventType)}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-600">
                              {item.quality}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded ${item.type === 'movie' ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                              {item.instanceName}
                            </span>
                            {item.indexer && (
                              <span className="text-xs text-gray-500">
                                via {item.indexer}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-400 flex-shrink-0">
                          {formatRelativeTime(item.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {allItems.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          Showing {allItems.length} recent events
        </div>
      )}
    </div>
  );
}
