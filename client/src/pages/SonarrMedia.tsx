import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInstancesByType, getSonarrSeries, getSonarrQualityProfiles, updateSonarrSeriesPath } from '../services/api';
import type { SonarrSeries, Instance } from '../types';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronUpDownIcon,
  PencilIcon,
  FolderIcon,
  ViewColumnsIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import BulkActions from '../components/BulkActions';
import PathEditModal from '../components/PathEditModal';
import BulkPathEditModal from '../components/BulkPathEditModal';

type SortField = 'title' | 'year' | 'path' | 'sizeOnDisk' | 'episodeFileCount';
type SortDir = 'asc' | 'desc';
type FilterMode = 'downloaded' | 'missing' | 'all';
type ColumnKey = 'title' | 'year' | 'path' | 'quality' | 'episodes' | 'size' | 'monitored';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  sortField?: SortField;
  defaultWidth: number;
  minWidth: number;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'title', label: 'Title', sortField: 'title', defaultWidth: 200, minWidth: 100 },
  { key: 'year', label: 'Year', sortField: 'year', defaultWidth: 80, minWidth: 60 },
  { key: 'path', label: 'Path', sortField: 'path', defaultWidth: 300, minWidth: 150 },
  { key: 'quality', label: 'Quality', defaultWidth: 120, minWidth: 80 },
  { key: 'episodes', label: 'Episodes', sortField: 'episodeFileCount', defaultWidth: 100, minWidth: 80 },
  { key: 'size', label: 'Size', sortField: 'sizeOnDisk', defaultWidth: 100, minWidth: 70 },
  { key: 'monitored', label: 'Monitored', defaultWidth: 90, minWidth: 70 },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function SonarrMedia() {
  const queryClient = useQueryClient();
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('downloaded');
  const [editingPath, setEditingPath] = useState<{ series: SonarrSeries } | null>(null);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(
    () => COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: col.defaultWidth }), {} as Record<ColumnKey, number>)
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(COLUMNS.map((c) => c.key))
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);
  const resizingRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

  // Get parent directory (short path) from full path
  const getShortPath = (fullPath: string) => {
    const parts = fullPath.split('/').filter(Boolean);
    if (parts.length <= 1) return fullPath;
    return '/' + parts.slice(0, -1).join('/');
  };

  // Fetch Sonarr instances
  const { data: instances } = useQuery({
    queryKey: ['instances', 'sonarr'],
    queryFn: () => getInstancesByType('sonarr'),
  });

  // Auto-select first instance
  const activeInstance = selectedInstance || instances?.[0]?._id || '';

  // Fetch series for selected instance
  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ['sonarr', activeInstance, 'series'],
    queryFn: () => getSonarrSeries(activeInstance),
    enabled: !!activeInstance,
  });

  // Fetch quality profiles
  const { data: qualityProfiles } = useQuery({
    queryKey: ['sonarr', activeInstance, 'qualityprofiles'],
    queryFn: () => getSonarrQualityProfiles(activeInstance),
    enabled: !!activeInstance,
  });

  const qualityProfileMap = useMemo(() => {
    const map: Record<number, string> = {};
    qualityProfiles?.forEach((p) => (map[p.id] = p.name));
    return map;
  }, [qualityProfiles]);

  // Filter and sort series
  const filteredSeries = useMemo(() => {
    if (!series) return [];

    let result = series.filter((s) => {
      // Text search
      if (!s.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Filter mode - for series, "downloaded" means has at least one episode file
      const hasFiles = s.statistics?.episodeFileCount > 0;
      if (filterMode === 'downloaded' && !hasFiles) return false;
      if (filterMode === 'missing' && hasFiles) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'year':
          cmp = a.year - b.year;
          break;
        case 'path':
          cmp = a.path.localeCompare(b.path);
          break;
        case 'sizeOnDisk':
          cmp = (a.statistics?.sizeOnDisk || 0) - (b.statistics?.sizeOnDisk || 0);
          break;
        case 'episodeFileCount':
          cmp = (a.statistics?.episodeFileCount || 0) - (b.statistics?.episodeFileCount || 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [series, search, sortField, sortDir, filterMode]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSeries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSeries.map((s) => s.id)));
    }
  };

  const selectedSeries = useMemo(
    () => series?.filter((s) => selectedIds.has(s.id)) || [],
    [series, selectedIds]
  );

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-white"
    >
      {children}
      <ChevronUpDownIcon className="w-4 h-4" />
    </button>
  );

  const handlePathSave = async (newPath: string) => {
    if (!editingPath) return;
    await updateSonarrSeriesPath(activeInstance, editingPath.series.id, newPath);
    queryClient.invalidateQueries({ queryKey: ['sonarr', activeInstance, 'series'] });
  };

  const handleBulkMove = async (items: Array<{ id: number; newPath: string }>) => {
    // Trigger all moves - they'll run in parallel and show in Activity indicator
    const movePromises = items.map((item) =>
      updateSonarrSeriesPath(activeInstance, item.id, item.newPath)
    );
    await Promise.all(movePromises);
    queryClient.invalidateQueries({ queryKey: ['sonarr', activeInstance, 'series'] });
    setSelectedIds(new Set());
  };

  const handleResizeStart = useCallback((key: ColumnKey, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: columnWidths[key] };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const col = COLUMNS.find((c) => c.key === resizingRef.current!.key);
      const delta = e.clientX - resizingRef.current.startX;
      const newWidth = Math.max(col?.minWidth || 50, resizingRef.current.startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [resizingRef.current!.key]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  const toggleColumnVisibility = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        // Don't allow hiding all columns - keep at least title
        if (newSet.size > 1 || key === 'title') {
          newSet.delete(key);
        }
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const visibleColumnConfigs = COLUMNS.filter((c) => visibleColumns.has(c.key));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">TV Series</h1>

        {instances && instances.length > 1 && (
          <select
            value={activeInstance}
            onChange={(e) => {
              setSelectedInstance(e.target.value);
              setSelectedIds(new Set());
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
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-400">Show:</span>
        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          <button
            onClick={() => setFilterMode('downloaded')}
            className={`px-3 py-1.5 text-sm ${
              filterMode === 'downloaded'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Downloaded
          </button>
          <button
            onClick={() => setFilterMode('missing')}
            className={`px-3 py-1.5 text-sm border-x border-gray-600 ${
              filterMode === 'missing'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Missing
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-sm ${
              filterMode === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Search and bulk actions */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search series..."
            className="input pl-10"
          />
        </div>

        {/* Path display toggle */}
        <button
          onClick={() => setShowFullPath(!showFullPath)}
          className={`btn ${showFullPath ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          title={showFullPath ? 'Showing full path' : 'Showing parent directory only'}
        >
          <FolderIcon className="w-5 h-5" />
          {showFullPath ? 'Full Path' : 'Short Path'}
        </button>

        {/* Column visibility toggle */}
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <ViewColumnsIcon className="w-5 h-5" />
            Columns
            <ChevronDownIcon className="w-4 h-4" />
          </button>
          {showColumnMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColumnMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                <div className="p-2 space-y-1">
                  {COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumnVisibility(col.key)}
                        className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {selectedIds.size > 0 && (
          <BulkActions
            type="sonarr"
            instanceId={activeInstance}
            selectedItems={selectedSeries}
            qualityProfiles={qualityProfiles || []}
            onComplete={() => setSelectedIds(new Set())}
            onMoveClick={() => setShowBulkMove(true)}
          />
        )}
      </div>

      {/* Series table */}
      <div className="card overflow-hidden overflow-x-auto">
        {seriesLoading ? (
          <div className="p-8 text-center text-gray-400">Loading series...</div>
        ) : !filteredSeries.length ? (
          <div className="p-8 text-center text-gray-400">
            {search ? 'No series match your search' : 'No series found'}
          </div>
        ) : (
          <table className="w-full" style={{ minWidth: 'max-content' }}>
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredSeries.length && filteredSeries.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                  />
                </th>
                {visibleColumnConfigs.map((col) => (
                  <th
                    key={col.key}
                    className="p-3 relative select-none"
                    style={{ width: columnWidths[col.key], minWidth: col.minWidth }}
                  >
                    <div className="flex items-center justify-between pr-2">
                      {col.sortField ? (
                        <SortHeader field={col.sortField}>{col.label}</SortHeader>
                      ) : (
                        <span>{col.label}</span>
                      )}
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary-500/50 active:bg-primary-500"
                      onMouseDown={(e) => handleResizeStart(col.key, e)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredSeries.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-gray-700/30 ${selectedIds.has(s.id) ? 'bg-primary-900/20' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                    />
                  </td>
                  {visibleColumnConfigs.map((col) => (
                    <td
                      key={col.key}
                      className="p-3"
                      style={{ width: columnWidths[col.key], maxWidth: columnWidths[col.key] }}
                    >
                      {col.key === 'title' && <span className="font-medium truncate block">{s.title}</span>}
                      {col.key === 'year' && <span className="text-gray-400">{s.year}</span>}
                      {col.key === 'path' && (
                        <div className="flex items-center gap-2 group">
                          <FolderIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span
                            className="text-xs text-gray-400 font-mono truncate flex-1"
                            title={s.path}
                          >
                            {showFullPath ? s.path : getShortPath(s.path)}
                          </span>
                          <button
                            onClick={() => setEditingPath({ series: s })}
                            className="p-1 text-gray-500 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            title="Edit path"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {col.key === 'quality' && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-700">
                          {qualityProfileMap[s.qualityProfileId] || 'Unknown'}
                        </span>
                      )}
                      {col.key === 'episodes' && (
                        <span className="text-gray-400">
                          {s.statistics?.episodeFileCount || 0} / {s.statistics?.episodeCount || 0}
                        </span>
                      )}
                      {col.key === 'size' && (
                        <span className="text-gray-400">{formatBytes(s.statistics?.sizeOnDisk || 0)}</span>
                      )}
                      {col.key === 'monitored' && (
                        s.monitored ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-500" />
                        )
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredSeries.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {selectedIds.size > 0
            ? `${selectedIds.size} of ${filteredSeries.length} selected`
            : `${filteredSeries.length} series`}
        </div>
      )}

      {/* Path Edit Modal */}
      <PathEditModal
        isOpen={!!editingPath}
        title={editingPath?.series.title || ''}
        currentPath={editingPath?.series.path || ''}
        availablePaths={series?.map((s) => s.path) || []}
        onClose={() => setEditingPath(null)}
        onSave={handlePathSave}
      />

      {/* Bulk Path Edit Modal */}
      <BulkPathEditModal
        isOpen={showBulkMove}
        selectedItems={selectedSeries.map((s) => ({ id: s.id, title: s.title, path: s.path }))}
        availablePaths={series?.map((s) => s.path) || []}
        onClose={() => setShowBulkMove(false)}
        onMove={handleBulkMove}
      />
    </div>
  );
}
