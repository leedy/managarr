import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInstancesByType,
  getSonarrQueue,
  getRadarrQueue,
} from '../services/api';
import type { SonarrQueueRecord, RadarrQueueRecord } from '../types';
import { ArrowDownTrayIcon, ExclamationCircleIcon, InboxIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

interface QueueItem {
  id: string;
  title: string;
  mediaTitle: string;
  subtitle?: string;
  status: string;
  trackedDownloadState: string;
  size: number;
  sizeleft: number;
  progress: number;
  timeleft: string | null;
  quality: string;
  downloadClient: string;
  indexer: string;
  instanceName: string;
  instanceId: string;
  type: 'movie' | 'episode';
  hasError: boolean;
  errorMessage?: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTimeLeft(timeleft: string | null): string {
  if (!timeleft) return '-';
  if (timeleft === '00:00:00') return 'Done';
  return timeleft;
}

function getStatusColor(status: string, trackedDownloadState: string): string {
  if (trackedDownloadState === 'importBlocked' || trackedDownloadState === 'importPending') {
    return 'bg-yellow-600';
  }
  switch (status) {
    case 'downloading':
      return 'bg-blue-600';
    case 'paused':
      return 'bg-gray-600';
    case 'completed':
      return 'bg-green-600';
    case 'failed':
    case 'warning':
      return 'bg-red-600';
    default:
      return 'bg-gray-600';
  }
}

function getStateLabel(status: string, trackedDownloadState: string): string {
  if (trackedDownloadState === 'importBlocked') return 'Import Blocked';
  if (trackedDownloadState === 'importPending') return 'Import Pending';
  if (trackedDownloadState === 'importing') return 'Importing';
  switch (status) {
    case 'downloading':
      return 'Downloading';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'warning':
      return 'Warning';
    case 'queued':
      return 'Queued';
    default:
      return status;
  }
}

export default function Queue() {
  // Fetch instances
  const { data: sonarrInstances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  const { data: radarrInstances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Fetch queues from all Sonarr instances
  const sonarrQuery = useQuery({
    queryKey: ['sonarr-queue', sonarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!sonarrInstances) return [];
      const items: QueueItem[] = [];

      for (const instance of sonarrInstances) {
        try {
          const response = await getSonarrQueue(instance._id);
          for (const record of response.records as SonarrQueueRecord[]) {
            const progress = record.size > 0 ? ((record.size - record.sizeleft) / record.size) * 100 : 0;
            items.push({
              id: `sonarr-${instance._id}-${record.id}`,
              title: record.title,
              mediaTitle: record.series?.title || 'Unknown Series',
              subtitle: record.episode
                ? `S${String(record.seasonNumber).padStart(2, '0')}E${String(record.episode.episodeNumber).padStart(2, '0')} - ${record.episode.title}`
                : undefined,
              status: record.status,
              trackedDownloadState: record.trackedDownloadState,
              size: record.size,
              sizeleft: record.sizeleft,
              progress,
              timeleft: record.timeleft,
              quality: record.quality?.quality?.name || 'Unknown',
              downloadClient: record.downloadClient,
              indexer: record.indexer,
              instanceName: instance.name,
              instanceId: instance._id,
              type: 'episode',
              hasError: record.trackedDownloadState === 'importBlocked' || record.status === 'failed',
              errorMessage: record.errorMessage,
            });
          }
        } catch (error) {
          console.error(`Error fetching queue from ${instance.name}:`, error);
        }
      }

      return items;
    },
    enabled: !!sonarrInstances && sonarrInstances.length > 0,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch queues from all Radarr instances
  const radarrQuery = useQuery({
    queryKey: ['radarr-queue', radarrInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!radarrInstances) return [];
      const items: QueueItem[] = [];

      for (const instance of radarrInstances) {
        try {
          const response = await getRadarrQueue(instance._id);
          for (const record of response.records as RadarrQueueRecord[]) {
            const progress = record.size > 0 ? ((record.size - record.sizeleft) / record.size) * 100 : 0;
            items.push({
              id: `radarr-${instance._id}-${record.id}`,
              title: record.title,
              mediaTitle: record.movie?.title || 'Unknown Movie',
              subtitle: record.movie?.year ? `(${record.movie.year})` : undefined,
              status: record.status,
              trackedDownloadState: record.trackedDownloadState,
              size: record.size,
              sizeleft: record.sizeleft,
              progress,
              timeleft: record.timeleft,
              quality: record.quality?.quality?.name || 'Unknown',
              downloadClient: record.downloadClient,
              indexer: record.indexer,
              instanceName: instance.name,
              instanceId: instance._id,
              type: 'movie',
              hasError: record.trackedDownloadState === 'importBlocked' || record.status === 'failed',
              errorMessage: record.errorMessage,
            });
          }
        } catch (error) {
          console.error(`Error fetching queue from ${instance.name}:`, error);
        }
      }

      return items;
    },
    enabled: !!radarrInstances && radarrInstances.length > 0,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Combine all queue items
  const allItems = useMemo(() => {
    const items = [...(sonarrQuery.data || []), ...(radarrQuery.data || [])];
    // Sort: errors first, then by progress (downloading items first)
    return items.sort((a, b) => {
      if (a.hasError && !b.hasError) return -1;
      if (!a.hasError && b.hasError) return 1;
      if (a.status === 'downloading' && b.status !== 'downloading') return -1;
      if (a.status !== 'downloading' && b.status === 'downloading') return 1;
      return b.progress - a.progress;
    });
  }, [sonarrQuery.data, radarrQuery.data]);

  const isLoading = sonarrQuery.isLoading || radarrQuery.isLoading;

  // Stats
  const stats = useMemo(() => {
    const downloading = allItems.filter((i) => i.status === 'downloading').length;
    const paused = allItems.filter((i) => i.status === 'paused').length;
    const errors = allItems.filter((i) => i.hasError).length;
    const totalSize = allItems.reduce((sum, i) => sum + i.size, 0);
    const remainingSize = allItems.reduce((sum, i) => sum + i.sizeleft, 0);

    return { total: allItems.length, downloading, paused, errors, totalSize, remainingSize };
  }, [allItems]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ArrowDownTrayIcon className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold">Download Queue</h1>
        <span className="text-sm text-gray-400">(auto-refreshes every 5s)</span>
      </div>

      <p className="text-gray-400 mb-6">
        Active downloads across all Sonarr and Radarr instances.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Items</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.downloading}</div>
          <div className="text-sm text-gray-400">Downloading</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-400">{stats.paused}</div>
          <div className="text-sm text-gray-400">Paused</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
          <div className="text-sm text-gray-400">Errors</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold">{formatSize(stats.remainingSize)}</div>
          <div className="text-sm text-gray-400">Remaining</div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Loading download queue..." />
        ) : allItems.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="w-12 h-12" />}
            title="Queue is empty"
            description="No active downloads. Items will appear here when Sonarr or Radarr start downloading."
          />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3">Media</th>
                <th className="p-3">Status</th>
                <th className="p-3">Progress</th>
                <th className="p-3">Size</th>
                <th className="p-3">Time Left</th>
                <th className="p-3">Quality</th>
                <th className="p-3">Instance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {allItems.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-700/30 ${item.hasError ? 'bg-red-900/20' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-start gap-2">
                      {item.hasError && (
                        <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{item.mediaTitle}</div>
                        {item.subtitle && (
                          <div className="text-sm text-gray-400">{item.subtitle}</div>
                        )}
                        <div className="text-xs text-gray-500 truncate max-w-md" title={item.title}>
                          {item.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.status, item.trackedDownloadState)}`}>
                      {getStateLabel(item.status, item.trackedDownloadState)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="w-24">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">
                          {item.progress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">
                    <div>{formatSize(item.size - item.sizeleft)}</div>
                    <div className="text-xs text-gray-500">of {formatSize(item.size)}</div>
                  </td>
                  <td className="p-3 text-gray-400">{formatTimeLeft(item.timeleft)}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded bg-gray-600">
                      {item.quality}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded ${item.type === 'movie' ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                      {item.instanceName}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {allItems.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {allItems.length} items in queue - {formatSize(stats.remainingSize)} remaining of {formatSize(stats.totalSize)} total
        </div>
      )}
    </div>
  );
}
