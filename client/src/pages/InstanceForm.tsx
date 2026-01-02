import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInstance,
  createInstance,
  updateInstance,
  testConnection,
} from '../services/api';
import type { InstanceType } from '../types';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function InstanceForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    type: 'sonarr' as InstanceType,
    url: '',
    apiKey: '',
    isEnabled: true,
  });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Fetch existing instance if editing
  const { data: existingInstance } = useQuery({
    queryKey: ['instance', id],
    queryFn: () => getInstance(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingInstance) {
      setFormData({
        name: existingInstance.name,
        type: existingInstance.type,
        url: existingInstance.url,
        apiKey: '', // Don't populate API key for security
        isEnabled: existingInstance.isEnabled,
      });
    }
  }, [existingInstance]);

  const createMutation = useMutation({
    mutationFn: createInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      navigate('/instances');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      updateInstance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      navigate('/instances');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && id) {
      // Only include apiKey if it was changed
      const updateData = formData.apiKey
        ? formData
        : { ...formData, apiKey: undefined };
      updateMutation.mutate({ id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTest = async () => {
    if (!formData.url || !formData.apiKey) {
      setTestResult({ success: false, message: 'URL and API key are required' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection(formData.type, formData.url, formData.apiKey);
      setTestResult({ success: result.success, message: result.message });
    } catch {
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Instance' : 'Add Instance'}
      </h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 text-red-200">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="My Sonarr Server"
            required
          />
        </div>

        <div>
          <label htmlFor="type" className="label">
            Type
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as InstanceType })
            }
            className="input"
            disabled={isEditing}
          >
            <option value="sonarr">Sonarr</option>
            <option value="radarr">Radarr</option>
            <option value="plex">Plex</option>
          </select>
        </div>

        <div>
          <label htmlFor="url" className="label">
            URL
          </label>
          <input
            type="url"
            id="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="input"
            placeholder="http://localhost:8989"
            required
          />
          <p className="mt-1 text-sm text-gray-400">
            {formData.type === 'plex'
              ? 'e.g., http://localhost:32400'
              : formData.type === 'radarr'
              ? 'e.g., http://localhost:7878'
              : 'e.g., http://localhost:8989'}
          </p>
        </div>

        <div>
          <label htmlFor="apiKey" className="label">
            {formData.type === 'plex' ? 'Plex Token' : 'API Key'}
          </label>
          <input
            type="password"
            id="apiKey"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            className="input"
            placeholder={isEditing ? '(unchanged)' : ''}
            required={!isEditing}
          />
          {isEditing && (
            <p className="mt-1 text-sm text-gray-400">
              Leave blank to keep existing key
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isEnabled"
            checked={formData.isEnabled}
            onChange={(e) =>
              setFormData({ ...formData, isEnabled: e.target.checked })
            }
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isEnabled" className="text-sm text-gray-300">
            Enabled
          </label>
        </div>

        {/* Test Connection */}
        <div className="border-t border-gray-700 pt-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !formData.url || !formData.apiKey}
              className="btn btn-secondary"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            {testResult && (
              <span
                className={`flex items-center gap-2 ${
                  testResult.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  <XCircleIcon className="w-5 h-5" />
                )}
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/instances')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
