import { useQuery } from '@tanstack/react-query';
import { getHealthStatus } from '../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/solid';

export default function Dashboard() {
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: getHealthStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
        Failed to load health status
      </div>
    );
  }

  const online = health?.filter((h) => h.status === 'online').length || 0;
  const offline = health?.filter((h) => h.status === 'offline').length || 0;
  const disabled = health?.filter((h) => h.status === 'disabled').length || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{online}</div>
              <div className="text-sm text-gray-400">Online</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{offline}</div>
              <div className="text-sm text-gray-400">Offline</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <MinusCircleIcon className="w-8 h-8 text-gray-500" />
            <div>
              <div className="text-2xl font-bold">{disabled}</div>
              <div className="text-sm text-gray-400">Disabled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Instance Status List */}
      <div className="card">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Instance Status</h2>
        </div>
        {!health || health.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No instances configured. Add one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {health.map((instance) => (
              <li key={instance.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {instance.status === 'online' && (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  )}
                  {instance.status === 'offline' && (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                  {instance.status === 'disabled' && (
                    <MinusCircleIcon className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <div className="font-medium">{instance.name}</div>
                    <div className="text-sm text-gray-400">
                      {instance.type.charAt(0).toUpperCase() + instance.type.slice(1)}
                      {instance.version && ` v${instance.version}`}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {instance.message || instance.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
