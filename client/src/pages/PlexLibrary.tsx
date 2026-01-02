import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInstancesByType } from '../services/api';
import axios from 'axios';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface PlexLibrary {
  key: string;
  title: string;
  type: string;
  agent: string;
  scanner: string;
}

interface PlexMediaItem {
  ratingKey: string;
  title: string;
  year?: number;
  type: string;
  addedAt: number;
  updatedAt: number;
  duration?: number;
  viewCount?: number;
}

export default function PlexLibrary() {
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [selectedLibrary, setSelectedLibrary] = useState<string>('');
  const [search, setSearch] = useState('');

  // Fetch Plex instances
  const { data: instances } = useQuery({
    queryKey: ['instances', 'plex'],
    queryFn: () => getInstancesByType('plex'),
  });

  const activeInstance = selectedInstance || instances?.[0]?._id || '';

  // Fetch libraries for selected instance
  const { data: libraries, isLoading: librariesLoading } = useQuery({
    queryKey: ['plex', activeInstance, 'libraries'],
    queryFn: async () => {
      const response = await axios.get(`/api/plex/${activeInstance}/libraries`);
      const container = response.data.MediaContainer;
      return (container?.Directory || []) as PlexLibrary[];
    },
    enabled: !!activeInstance,
  });

  const activeLibrary = selectedLibrary || libraries?.[0]?.key || '';

  // Fetch library contents
  const { data: mediaItems, isLoading: mediaLoading } = useQuery({
    queryKey: ['plex', activeInstance, 'library', activeLibrary],
    queryFn: async () => {
      const response = await axios.get(`/api/plex/${activeInstance}/libraries/${activeLibrary}`);
      const container = response.data.MediaContainer;
      return (container?.Metadata || []) as PlexMediaItem[];
    },
    enabled: !!activeInstance && !!activeLibrary,
  });

  // Filter items
  const filteredItems = mediaItems?.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
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

  if (!instances || instances.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Plex Library</h1>
        <div className="card p-8 text-center text-gray-400">
          No Plex instances configured. Add one in the Instances page.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plex Library</h1>

        <div className="flex items-center gap-4">
          {instances.length > 1 && (
            <select
              value={activeInstance}
              onChange={(e) => {
                setSelectedInstance(e.target.value);
                setSelectedLibrary('');
              }}
              className="input w-auto"
            >
              {instances.map((inst) => (
                <option key={inst._id} value={inst._id}>
                  {inst.name}
                </option>
              ))}
            </select>
          )}

          {libraries && libraries.length > 0 && (
            <select
              value={activeLibrary}
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className="input w-auto"
            >
              {libraries.map((lib) => (
                <option key={lib.key} value={lib.key}>
                  {lib.title} ({getLibraryType(lib.type)})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Library contents */}
      <div className="card overflow-hidden">
        {librariesLoading || mediaLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : !filteredItems.length ? (
          <div className="p-8 text-center text-gray-400">
            {search ? 'No items match your search' : 'No items in library'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Year</th>
                <th className="p-3">Type</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Added</th>
                <th className="p-3">Plays</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.ratingKey} className="hover:bg-gray-700/30">
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3 text-gray-400">{item.year || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded bg-orange-600">
                      {item.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">{formatDuration(item.duration)}</td>
                  <td className="p-3 text-gray-400">{formatDate(item.addedAt)}</td>
                  <td className="p-3 text-gray-400">{item.viewCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredItems.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {filteredItems.length} items
        </div>
      )}
    </div>
  );
}
