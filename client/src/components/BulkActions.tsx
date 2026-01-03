import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  updateSonarrSeries,
  deleteSonarrSeries,
  updateRadarrMovie,
  deleteRadarrMovie,
} from '../services/api';
import type { SonarrSeries, RadarrMovie, SonarrQualityProfile, RadarrQualityProfile } from '../types';
import { TrashIcon, EyeSlashIcon, EyeIcon, FolderArrowDownIcon } from '@heroicons/react/24/outline';

interface BulkActionsProps {
  type: 'sonarr' | 'radarr';
  instanceId: string;
  selectedItems: SonarrSeries[] | RadarrMovie[];
  qualityProfiles: SonarrQualityProfile[] | RadarrQualityProfile[];
  onComplete: () => void;
  onMoveClick?: () => void;
}

export default function BulkActions({
  type,
  instanceId,
  selectedItems,
  qualityProfiles,
  onComplete,
  onMoveClick,
}: BulkActionsProps) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const invalidateQueries = () => {
    if (type === 'sonarr') {
      queryClient.invalidateQueries({ queryKey: ['sonarr', instanceId, 'series'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['radarr', instanceId, 'movies'] });
    }
  };

  const handleSetMonitored = async (monitored: boolean) => {
    setIsProcessing(true);
    try {
      for (const item of selectedItems) {
        if (type === 'sonarr') {
          await updateSonarrSeries(instanceId, { ...(item as SonarrSeries), monitored });
        } else {
          await updateRadarrMovie(instanceId, { ...(item as RadarrMovie), monitored });
        }
      }
      invalidateQueries();
      onComplete();
    } catch (error) {
      console.error('Failed to update monitored status:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeQuality = async (qualityProfileId: number) => {
    if (!qualityProfileId) return;
    setIsProcessing(true);
    try {
      for (const item of selectedItems) {
        if (type === 'sonarr') {
          await updateSonarrSeries(instanceId, { ...(item as SonarrSeries), qualityProfileId });
        } else {
          await updateRadarrMovie(instanceId, { ...(item as RadarrMovie), qualityProfileId });
        }
      }
      invalidateQueries();
      onComplete();
    } catch (error) {
      console.error('Failed to update quality profile:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      for (const item of selectedItems) {
        if (type === 'sonarr') {
          await deleteSonarrSeries(instanceId, (item as SonarrSeries).id, deleteFiles);
        } else {
          await deleteRadarrMovie(instanceId, (item as RadarrMovie).id, deleteFiles);
        }
      }
      invalidateQueries();
      onComplete();
    } catch (error) {
      console.error('Failed to delete items:', error);
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 mr-2">
        {selectedItems.length} selected
      </span>

      {/* Monitor/Unmonitor */}
      <button
        onClick={() => handleSetMonitored(true)}
        disabled={isProcessing}
        className="btn btn-secondary text-sm flex items-center gap-1"
        title="Monitor selected"
      >
        <EyeIcon className="w-4 h-4" />
        Monitor
      </button>
      <button
        onClick={() => handleSetMonitored(false)}
        disabled={isProcessing}
        className="btn btn-secondary text-sm flex items-center gap-1"
        title="Unmonitor selected"
      >
        <EyeSlashIcon className="w-4 h-4" />
        Unmonitor
      </button>

      {/* Move */}
      {onMoveClick && (
        <button
          onClick={onMoveClick}
          disabled={isProcessing}
          className="btn btn-secondary text-sm flex items-center gap-1"
          title="Move selected"
        >
          <FolderArrowDownIcon className="w-4 h-4" />
          Move
        </button>
      )}

      {/* Quality Profile */}
      <select
        onChange={(e) => handleChangeQuality(Number(e.target.value))}
        disabled={isProcessing}
        className="input w-auto text-sm"
        defaultValue=""
      >
        <option value="" disabled>
          Change Quality...
        </option>
        {qualityProfiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isProcessing}
          className="btn btn-danger text-sm flex items-center gap-1"
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-red-900/50 px-3 py-1 rounded-lg">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={deleteFiles}
              onChange={(e) => setDeleteFiles(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
            />
            Delete files
          </label>
          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="btn btn-danger text-sm"
          >
            {isProcessing ? 'Deleting...' : 'Confirm'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isProcessing}
            className="btn btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {isProcessing && (
        <span className="text-sm text-gray-400">Processing...</span>
      )}
    </div>
  );
}
