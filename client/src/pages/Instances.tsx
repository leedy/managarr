import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getInstances, deleteInstance, testInstanceConnection } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const typeColors: Record<string, string> = {
  sonarr: 'bg-blue-600',
  radarr: 'bg-yellow-600',
  plex: 'bg-orange-600',
};

export default function Instances() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const { data: instances, isLoading, error } = useQuery({
    queryKey: ['instances'],
    queryFn: getInstances,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testInstanceConnection(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: result.success, message: result.message },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: 'Test failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

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
        Failed to load instances
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Instances</h1>
        <Link to="/instances/new" className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Instance
        </Link>
      </div>

      {!instances || instances.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400 mb-4">No instances configured yet.</p>
          <Link to="/instances/new" className="btn btn-primary">
            Add your first instance
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {instances.map((instance) => (
            <div key={instance._id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${typeColors[instance.type]} text-white`}
                  >
                    {instance.type.toUpperCase()}
                  </span>
                  <div>
                    <h3 className="font-medium">{instance.name}</h3>
                    <p className="text-sm text-gray-400">{instance.url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {testResults[instance._id] && (
                    <span
                      className={`flex items-center gap-1 text-sm ${
                        testResults[instance._id].success ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {testResults[instance._id].success ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <XCircleIcon className="w-4 h-4" />
                      )}
                      {testResults[instance._id].message}
                    </span>
                  )}

                  <button
                    onClick={() => handleTest(instance._id)}
                    disabled={testingId === instance._id}
                    className="btn btn-secondary text-sm"
                  >
                    {testingId === instance._id ? 'Testing...' : 'Test'}
                  </button>

                  <Link
                    to={`/instances/${instance._id}/edit`}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </Link>

                  <button
                    onClick={() => handleDelete(instance._id, instance.name)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {!instance.isEnabled && (
                <div className="mt-2 text-sm text-yellow-400">Disabled</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
