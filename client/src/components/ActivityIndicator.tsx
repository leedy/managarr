import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInstancesByType } from '../services/api';
import axios from 'axios';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Command {
  id: number;
  name: string;
  commandName: string;
  status: 'queued' | 'started' | 'completed';
  result?: 'successful' | 'failed' | 'unsuccessful';
  queued: string;
  started?: string;
  ended?: string;
  duration?: string;
  message?: string;
  body?: {
    seriesId?: number;
    movieId?: number;
    destinationPath?: string;
    sourcePath?: string;
  };
}

interface InstanceCommands {
  instanceId: string;
  instanceName: string;
  instanceType: 'sonarr' | 'radarr';
  commands: Command[];
}

export default function ActivityIndicator() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentCommands, setRecentCommands] = useState<InstanceCommands[]>([]);
  const [dismissed, setDismissed] = useState(false);

  // Fetch instances
  const { data: sonarrInstances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  const { data: radarrInstances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Poll for commands
  useEffect(() => {
    const fetchCommands = async () => {
      const allCommands: InstanceCommands[] = [];

      // Fetch Sonarr commands
      if (sonarrInstances) {
        for (const instance of sonarrInstances) {
          try {
            const response = await axios.get(`/api/sonarr/${instance._id}/command`);
            const commands = (response.data as Command[])
              .filter((cmd) => {
                // Filter for move commands and recent activity (last 5 minutes)
                const isMove = cmd.name.toLowerCase().includes('move');
                const isRecent = new Date(cmd.queued).getTime() > Date.now() - 5 * 60 * 1000;
                const isActive = cmd.status === 'queued' || cmd.status === 'started';
                return isMove && (isRecent || isActive);
              })
              .sort((a, b) => new Date(b.queued).getTime() - new Date(a.queued).getTime())
              .slice(0, 20);

            if (commands.length > 0) {
              allCommands.push({
                instanceId: instance._id,
                instanceName: instance.name,
                instanceType: 'sonarr',
                commands,
              });
            }
          } catch (error) {
            console.error('Error fetching Sonarr commands:', error);
          }
        }
      }

      // Fetch Radarr commands
      if (radarrInstances) {
        for (const instance of radarrInstances) {
          try {
            const response = await axios.get(`/api/radarr/${instance._id}/command`);
            const commands = (response.data as Command[])
              .filter((cmd) => {
                const isMove = cmd.name.toLowerCase().includes('move');
                const isRecent = new Date(cmd.queued).getTime() > Date.now() - 5 * 60 * 1000;
                const isActive = cmd.status === 'queued' || cmd.status === 'started';
                return isMove && (isRecent || isActive);
              })
              .sort((a, b) => new Date(b.queued).getTime() - new Date(a.queued).getTime())
              .slice(0, 20);

            if (commands.length > 0) {
              allCommands.push({
                instanceId: instance._id,
                instanceName: instance.name,
                instanceType: 'radarr',
                commands,
              });
            }
          } catch (error) {
            console.error('Error fetching Radarr commands:', error);
          }
        }
      }

      setRecentCommands(allCommands);
    };

    fetchCommands();
    const interval = setInterval(fetchCommands, 1000); // Poll every 1 second

    return () => clearInterval(interval);
  }, [sonarrInstances, radarrInstances]);

  // Count active commands
  const activeCount = recentCommands.reduce(
    (sum, ic) => sum + ic.commands.filter((c) => c.status === 'queued' || c.status === 'started').length,
    0
  );

  const totalCount = recentCommands.reduce((sum, ic) => sum + ic.commands.length, 0);

  // Reset dismissed when new active operations come in
  useEffect(() => {
    if (activeCount > 0) {
      setDismissed(false);
    }
  }, [activeCount]);

  // Don't show if dismissed or no activity
  if (dismissed || totalCount === 0) {
    return null;
  }

  const getStatusIcon = (cmd: Command) => {
    if (cmd.status === 'queued' || cmd.status === 'started') {
      return <ArrowPathIcon className="w-4 h-4 text-blue-400 animate-spin" />;
    }
    if (cmd.status === 'completed' && cmd.result === 'successful') {
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    }
    return <XCircleIcon className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = (cmd: Command) => {
    if (cmd.status === 'queued') return 'Queued';
    if (cmd.status === 'started') return 'Moving...';
    if (cmd.status === 'completed' && cmd.result === 'successful') return 'Complete';
    return 'Failed';
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return '';
    // Duration is in format "00:00:00.1234567"
    const match = duration.match(/(\d+):(\d+):(\d+)/);
    if (!match) return duration;
    const [, hours, minutes, seconds] = match;
    if (hours !== '00') return `${parseInt(hours)}h ${parseInt(minutes)}m`;
    if (minutes !== '00') return `${parseInt(minutes)}m ${parseInt(seconds)}s`;
    return `${parseInt(seconds)}s`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          activeCount > 0
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        {activeCount > 0 ? (
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircleIcon className="w-4 h-4" />
        )}
        <span className="text-sm">
          {activeCount > 0 ? `${activeCount} Moving` : 'Activity'}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Move Operations</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-700">
              {recentCommands.map((ic) => (
                <div key={ic.instanceId}>
                  <div className="px-3 py-2 bg-gray-700/50 text-xs text-gray-400">
                    {ic.instanceName} ({ic.instanceType})
                  </div>
                  {ic.commands.map((cmd) => (
                    <div
                      key={cmd.id}
                      className="px-3 py-2 flex items-start gap-3 hover:bg-gray-700/30"
                    >
                      <div className="mt-0.5">{getStatusIcon(cmd)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {cmd.commandName}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-2">
                          <span>{getStatusText(cmd)}</span>
                          {cmd.duration && cmd.status === 'completed' && (
                            <span>({formatDuration(cmd.duration)})</span>
                          )}
                        </div>
                        {cmd.body?.destinationPath && (
                          <div className="text-xs text-gray-500 truncate mt-1" title={cmd.body.destinationPath}>
                            → {cmd.body.destinationPath}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {totalCount === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">
                No recent move operations
              </div>
            )}
            {activeCount === 0 && totalCount > 0 && (
              <div className="p-2 border-t border-gray-700">
                <button
                  onClick={() => {
                    setDismissed(true);
                    setIsExpanded(false);
                  }}
                  className="w-full px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
