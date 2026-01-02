import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, FolderIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

interface PathEditModalProps {
  isOpen: boolean;
  title: string;
  currentPath: string;
  availablePaths: string[]; // List of all paths from media items
  onClose: () => void;
  onSave: (newPath: string) => Promise<void>;
}

export default function PathEditModal({
  isOpen,
  title,
  currentPath,
  availablePaths,
  onClose,
  onSave,
}: PathEditModalProps) {
  const [newPath, setNewPath] = useState(currentPath);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract the media folder name (last segment of path)
  const getMediaFolder = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : '';
  };

  // Get parent directory (short path) from full path
  const getShortPath = (fullPath: string) => {
    const parts = fullPath.split('/').filter(Boolean);
    if (parts.length <= 1) return fullPath;
    return '/' + parts.slice(0, -1).join('/');
  };

  // Get unique short paths sorted alphabetically
  const uniqueShortPaths = useMemo(() => {
    const shortPaths = new Set<string>();
    availablePaths.forEach((p) => {
      const short = getShortPath(p);
      if (short) shortPaths.add(short);
    });
    return Array.from(shortPaths).sort();
  }, [availablePaths]);

  const currentShortPath = getShortPath(currentPath);
  const mediaFolder = getMediaFolder(currentPath);

  useEffect(() => {
    if (isOpen) {
      setNewPath(currentPath);
      setError(null);
      setIsSaving(false);
    }
  }, [currentPath, isOpen]);

  if (!isOpen) return null;

  const handleShortPathSelect = (shortPath: string) => {
    // Combine selected short path with the media folder name
    const fullPath = shortPath + '/' + mediaFolder;
    setNewPath(fullPath);
  };

  const handleSave = async () => {
    if (!newPath.trim()) {
      setError('Path cannot be empty');
      return;
    }

    if (newPath === currentPath) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);

    // Trigger the move and close immediately - progress shown in Activity indicator
    onSave(newPath).catch((err) => {
      console.error('Move failed:', err);
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Edit Path</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Title</div>
            <div className="font-medium">{title}</div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-1">Current Path</div>
            <div className="flex items-center gap-2 text-sm font-mono bg-gray-900 p-2 rounded">
              <FolderIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="break-all">{currentPath}</span>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-1">Media Folder</div>
            <div className="flex items-center gap-2 text-sm font-mono bg-gray-900 p-2 rounded">
              <FolderIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="break-all text-blue-400">{mediaFolder}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This folder will be moved to the new location
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Move To (Select Destination)
            </label>
            <div className="relative">
              <select
                value={getShortPath(newPath)}
                onChange={(e) => handleShortPathSelect(e.target.value)}
                className="input font-mono text-sm appearance-none pr-10"
              >
                {uniqueShortPaths.map((path) => (
                  <option key={path} value={path}>
                    {path === currentShortPath ? `${path} (current)` : path}
                  </option>
                ))}
              </select>
              <ChevronUpDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="newPath" className="block text-sm text-gray-400 mb-1">
              New Full Path
            </label>
            <input
              type="text"
              id="newPath"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="input font-mono text-sm"
              placeholder="/path/to/media"
            />
            <p className="mt-1 text-xs text-gray-500">
              You can also manually edit the path above
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded p-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || newPath === currentPath}
            className="btn btn-primary"
          >
            {isSaving ? 'Moving...' : 'Move Files'}
          </button>
        </div>
      </div>
    </div>
  );
}
