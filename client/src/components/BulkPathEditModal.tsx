import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, FolderIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

interface BulkPathEditModalProps {
  isOpen: boolean;
  selectedItems: Array<{ id: number; title: string; path: string }>;
  availablePaths: string[]; // All paths from media items
  onClose: () => void;
  onMove: (items: Array<{ id: number; newPath: string }>) => Promise<void>;
}

export default function BulkPathEditModal({
  isOpen,
  selectedItems,
  availablePaths,
  onClose,
  onMove,
}: BulkPathEditModalProps) {
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get parent directory (short path) from full path
  const getShortPath = (fullPath: string) => {
    const parts = fullPath.split('/').filter(Boolean);
    if (parts.length <= 1) return fullPath;
    return '/' + parts.slice(0, -1).join('/');
  };

  // Get media folder name from full path
  const getMediaFolder = (fullPath: string) => {
    const parts = fullPath.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : '';
  };

  // Get unique short paths from selected items
  const selectedShortPaths = useMemo(() => {
    const paths = new Set<string>();
    selectedItems.forEach((item) => {
      paths.add(getShortPath(item.path));
    });
    return Array.from(paths).sort();
  }, [selectedItems]);

  // Get all unique short paths sorted alphabetically
  const allShortPaths = useMemo(() => {
    const shortPaths = new Set<string>();
    availablePaths.forEach((p) => {
      const short = getShortPath(p);
      if (short) shortPaths.add(short);
    });
    return Array.from(shortPaths).sort();
  }, [availablePaths]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDestination('');
      setError(null);
      setIsMoving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMove = async () => {
    if (!selectedDestination) {
      setError('Please select a destination');
      return;
    }

    // Check if any items would actually move
    const itemsToMove = selectedItems.filter(
      (item) => getShortPath(item.path) !== selectedDestination
    );

    if (itemsToMove.length === 0) {
      setError('All selected items are already in this location');
      return;
    }

    setIsMoving(true);
    setError(null);

    // Build the move list with new paths
    const moveList = itemsToMove.map((item) => ({
      id: item.id,
      newPath: selectedDestination + '/' + getMediaFolder(item.path),
    }));

    try {
      await onMove(moveList);
      onClose();
    } catch (err) {
      console.error('Bulk move failed:', err);
      setError('Some moves failed. Check the Activity indicator for details.');
      setIsMoving(false);
    }
  };

  const itemsToMoveCount = selectedDestination
    ? selectedItems.filter((item) => getShortPath(item.path) !== selectedDestination).length
    : selectedItems.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Move {selectedItems.length} Items</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Selected items summary */}
          <div>
            <div className="text-sm text-gray-400 mb-2">Selected Items</div>
            <div className="bg-gray-900 rounded p-3 max-h-40 overflow-y-auto">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1 text-sm">
                  <FolderIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                  <span className="text-gray-500 text-xs truncate">
                    ({getShortPath(item.path)})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Current locations */}
          <div>
            <div className="text-sm text-gray-400 mb-2">Current Locations</div>
            <div className="flex flex-wrap gap-2">
              {selectedShortPaths.map((path) => (
                <span
                  key={path}
                  className="px-2 py-1 text-xs font-mono bg-gray-700 rounded"
                >
                  {path}
                </span>
              ))}
            </div>
          </div>

          {/* Destination selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Move All To
            </label>
            <div className="relative">
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="input font-mono text-sm appearance-none pr-10"
              >
                <option value="">Select destination...</option>
                {allShortPaths.map((path) => (
                  <option key={path} value={path}>
                    {selectedShortPaths.includes(path) ? `${path} (current)` : path}
                  </option>
                ))}
              </select>
              <ChevronUpDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {selectedDestination && (
              <p className="mt-2 text-sm text-gray-400">
                {itemsToMoveCount} item{itemsToMoveCount !== 1 ? 's' : ''} will be moved
                {itemsToMoveCount < selectedItems.length && (
                  <span className="text-gray-500">
                    {' '}({selectedItems.length - itemsToMoveCount} already in this location)
                  </span>
                )}
              </p>
            )}
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
            disabled={isMoving}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={isMoving || !selectedDestination || itemsToMoveCount === 0}
            className="btn btn-primary"
          >
            {isMoving ? `Moving ${itemsToMoveCount} Item${itemsToMoveCount !== 1 ? 's' : ''}...` : `Move ${itemsToMoveCount} Item${itemsToMoveCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
