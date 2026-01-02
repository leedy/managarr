import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInstancesByType,
  getExcludedPlexLibraries,
  setExcludedPlexLibraries,
} from '../services/api';
import axios from 'axios';
import { CheckIcon } from '@heroicons/react/24/outline';

interface PlexLibrary {
  key: string;
  title: string;
  type: string;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [selectedLibraries, setSelectedLibraries] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Fetch Plex instances
  const { data: plexInstances } = useQuery({
    queryKey: ['instances', 'plex'],
    queryFn: () => getInstancesByType('plex'),
  });

  // Fetch all Plex libraries
  const { data: allLibraries, isLoading: librariesLoading } = useQuery({
    queryKey: ['plex-all-libraries', plexInstances?.map((i) => i._id)],
    queryFn: async () => {
      if (!plexInstances) return [];

      const libraries: Array<PlexLibrary & { instanceId: string; instanceName: string }> = [];

      for (const instance of plexInstances) {
        try {
          const response = await axios.get(`/api/plex/${instance._id}/libraries`);
          const libs = response.data.MediaContainer?.Directory || [];
          for (const lib of libs) {
            libraries.push({
              key: `${instance._id}:${lib.key}`,
              title: lib.title,
              type: lib.type,
              instanceId: instance._id,
              instanceName: instance.name,
            });
          }
        } catch (error) {
          console.error('Error fetching libraries:', error);
        }
      }

      return libraries;
    },
    enabled: !!plexInstances && plexInstances.length > 0,
  });

  // Fetch excluded libraries
  const { data: excludedLibraries } = useQuery({
    queryKey: ['excluded-plex-libraries'],
    queryFn: getExcludedPlexLibraries,
  });

  // Initialize selected libraries from saved settings
  useEffect(() => {
    if (excludedLibraries) {
      setSelectedLibraries(new Set(excludedLibraries));
    }
  }, [excludedLibraries]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (libraries: string[]) => setExcludedPlexLibraries(libraries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excluded-plex-libraries'] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
  });

  const handleToggleLibrary = (key: string) => {
    const newSet = new Set(selectedLibraries);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedLibraries(newSet);
  };

  const handleSave = () => {
    setSaveStatus('saving');
    saveMutation.mutate(Array.from(selectedLibraries));
  };

  const getLibraryType = (type: string) => {
    switch (type) {
      case 'movie':
        return 'Movies';
      case 'show':
        return 'TV Shows';
      case 'artist':
        return 'Music';
      case 'photo':
        return 'Photos';
      default:
        return type;
    }
  };

  const hasChanges = () => {
    const current = new Set(excludedLibraries || []);
    if (current.size !== selectedLibraries.size) return true;
    for (const lib of selectedLibraries) {
      if (!current.has(lib)) return true;
    }
    return false;
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Plex Library Exclusions */}
      <div className="card">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Plex Library Exclusions</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select libraries to exclude from the Compare feature. Useful for home movies or other libraries that won't have matches in Radarr/Sonarr.
          </p>
        </div>

        <div className="p-4">
          {librariesLoading ? (
            <div className="text-gray-400">Loading libraries...</div>
          ) : !allLibraries || allLibraries.length === 0 ? (
            <div className="text-gray-400">No Plex libraries found. Add a Plex instance first.</div>
          ) : (
            <div className="space-y-2">
              {allLibraries.map((lib) => (
                <label
                  key={lib.key}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLibraries.has(lib.key)}
                    onChange={() => handleToggleLibrary(lib.key)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{lib.title}</div>
                    <div className="text-sm text-gray-400">
                      {lib.instanceName} &middot; {getLibraryType(lib.type)}
                    </div>
                  </div>
                  {selectedLibraries.has(lib.key) && (
                    <span className="text-xs text-yellow-400">Excluded</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={!hasChanges() || saveMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            {saveStatus === 'saving' ? (
              'Saving...'
            ) : saveStatus === 'saved' ? (
              <>
                <CheckIcon className="w-4 h-4" />
                Saved
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          {hasChanges() && saveStatus === 'idle' && (
            <span className="text-sm text-yellow-400">You have unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
