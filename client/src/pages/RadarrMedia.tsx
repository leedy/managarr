import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInstancesByType, getRadarrMovies, getRadarrQualityProfiles, updateRadarrMoviePath } from '../services/api';
import type { RadarrMovie } from '../types';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronUpDownIcon,
  PencilIcon,
  FolderIcon,
  ViewColumnsIcon,
  ChevronDownIcon,
  TableCellsIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import BulkActions from '../components/BulkActions';
import PathEditModal from '../components/PathEditModal';
import BulkPathEditModal from '../components/BulkPathEditModal';
import PosterHover from '../components/PosterHover';
import PosterCard from '../components/PosterCard';

type SortField = 'title' | 'year' | 'path' | 'file' | 'quality' | 'sizeOnDisk' | 'hasFile' | 'monitored' | 'added';
type SortDir = 'asc' | 'desc';
type FilterMode = 'downloaded' | 'missing' | 'iso' | 'all';
type ColumnKey = 'title' | 'year' | 'path' | 'file' | 'quality' | 'size' | 'hasFile' | 'monitored';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  sortField: SortField;
  defaultWidth: number;
  minWidth: number;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'title', label: 'Title', sortField: 'title', defaultWidth: 200, minWidth: 100 },
  { key: 'year', label: 'Year', sortField: 'year', defaultWidth: 80, minWidth: 60 },
  { key: 'path', label: 'Path', sortField: 'path', defaultWidth: 300, minWidth: 150 },
  { key: 'file', label: 'File', sortField: 'file', defaultWidth: 250, minWidth: 100 },
  { key: 'quality', label: 'Quality', sortField: 'quality', defaultWidth: 120, minWidth: 80 },
  { key: 'size', label: 'Size', sortField: 'sizeOnDisk', defaultWidth: 100, minWidth: 70 },
  { key: 'hasFile', label: 'Has File', sortField: 'hasFile', defaultWidth: 90, minWidth: 70 },
  { key: 'monitored', label: 'Monitored', sortField: 'monitored', defaultWidth: 90, minWidth: 70 },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function RadarrMedia() {
  const queryClient = useQueryClient();
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('downloaded');
  const [editingPath, setEditingPath] = useState<{ movie: RadarrMovie } | null>(null);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(
    () => COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: col.defaultWidth }), {} as Record<ColumnKey, number>)
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(COLUMNS.filter((c) => c.key !== 'file').map((c) => c.key))
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFullPath, setShowFullPath] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [pathFilter, setPathFilter] = useState<string>('');
  const resizingRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

  // Get parent directory (short path) from full path
  const getShortPath = (fullPath: string) => {
    const parts = fullPath.split('/').filter(Boolean);
    if (parts.length <= 1) return fullPath;
    return '/' + parts.slice(0, -1).join('/');
  };

  // Fetch Radarr instances
  const { data: instances } = useQuery({
    queryKey: ['instances', 'radarr'],
    queryFn: () => getInstancesByType('radarr'),
  });

  // Auto-select first instance
  const activeInstance = selectedInstance || instances?.[0]?._id || '';

  // Fetch movies for selected instance
  const { data: movies, isLoading: moviesLoading } = useQuery({
    queryKey: ['radarr', activeInstance, 'movies'],
    queryFn: () => getRadarrMovies(activeInstance),
    enabled: !!activeInstance,
  });

  // Fetch quality profiles
  const { data: qualityProfiles } = useQuery({
    queryKey: ['radarr', activeInstance, 'qualityprofiles'],
    queryFn: () => getRadarrQualityProfiles(activeInstance),
    enabled: !!activeInstance,
  });

  const qualityProfileMap = useMemo(() => {
    const map: Record<number, string> = {};
    qualityProfiles?.forEach((p) => (map[p.id] = p.name));
    return map;
  }, [qualityProfiles]);

  // Get unique paths for filter dropdown
  const uniquePaths = useMemo(() => {
    if (!movies) return [];
    const paths = new Set<string>();
    movies.forEach((m) => paths.add(getShortPath(m.path)));
    return Array.from(paths).sort();
  }, [movies]);

  // Filter and sort movies
  const filteredMovies = useMemo(() => {
    if (!movies) return [];

    let result = movies.filter((m) => {
      // Text search
      if (!m.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Path filter
      if (pathFilter && getShortPath(m.path) !== pathFilter) {
        return false;
      }
      // Filter mode
      if (filterMode === 'downloaded' && !m.hasFile) return false;
      if (filterMode === 'missing' && m.hasFile) return false;
      if (filterMode === 'iso') {
        if (!m.hasFile || !m.movieFile?.relativePath) return false;
        if (!m.movieFile.relativePath.toLowerCase().endsWith('.iso')) return false;
      }
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
        case 'file':
          cmp = (a.movieFile?.relativePath || '').localeCompare(b.movieFile?.relativePath || '');
          break;
        case 'quality':
          cmp = (qualityProfileMap[a.qualityProfileId] || '').localeCompare(qualityProfileMap[b.qualityProfileId] || '');
          break;
        case 'sizeOnDisk':
          cmp = a.sizeOnDisk - b.sizeOnDisk;
          break;
        case 'hasFile':
          cmp = (a.hasFile ? 1 : 0) - (b.hasFile ? 1 : 0);
          break;
        case 'monitored':
          cmp = (a.monitored ? 1 : 0) - (b.monitored ? 1 : 0);
          break;
        case 'added':
          cmp = new Date(a.added).getTime() - new Date(b.added).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [movies, search, sortField, sortDir, filterMode, pathFilter, qualityProfileMap]);

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
    if (selectedIds.size === filteredMovies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMovies.map((m) => m.id)));
    }
  };

  const selectedMovies = useMemo(
    () => movies?.filter((m) => selectedIds.has(m.id)) || [],
    [movies, selectedIds]
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
    await updateRadarrMoviePath(activeInstance, editingPath.movie.id, newPath);
    queryClient.invalidateQueries({ queryKey: ['radarr', activeInstance, 'movies'] });
  };

  const handleBulkMove = async (items: Array<{ id: number; newPath: string }>) => {
    // Trigger all moves - they'll run in parallel and show in Activity indicator
    const movePromises = items.map((item) =>
      updateRadarrMoviePath(activeInstance, item.id, item.newPath)
    );
    await Promise.all(movePromises);
    queryClient.invalidateQueries({ queryKey: ['radarr', activeInstance, 'movies'] });
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
        <h1 className="text-2xl font-bold">Movies</h1>

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
            onClick={() => setFilterMode('iso')}
            className={`px-3 py-1.5 text-sm border-r border-gray-600 ${
              filterMode === 'iso'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Show movies with .iso files"
          >
            ISO Files
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
        {/* Path filter dropdown */}
        <select
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          className="input w-auto min-w-[200px]"
        >
          <option value="">All Paths</option>
          {uniquePaths.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>

        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search movies..."
            className="input pl-10"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-600">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 ${
              viewMode === 'table'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Table view"
          >
            <TableCellsIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 border-l border-gray-600 ${
              viewMode === 'grid'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Grid view"
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>
        </div>

        {/* Path display toggle - only show in table view */}
        {viewMode === 'table' && (
          <button
            onClick={() => setShowFullPath(!showFullPath)}
            className={`btn ${showFullPath ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
            title={showFullPath ? 'Showing full path' : 'Showing parent directory only'}
          >
            <FolderIcon className="w-5 h-5" />
            {showFullPath ? 'Full Path' : 'Short Path'}
          </button>
        )}

        {/* Column visibility toggle - only show in table view */}
        {viewMode === 'table' && (
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
        )}

        {selectedIds.size > 0 && (
          <BulkActions
            type="radarr"
            instanceId={activeInstance}
            selectedItems={selectedMovies}
            qualityProfiles={qualityProfiles || []}
            onComplete={() => setSelectedIds(new Set())}
            onMoveClick={() => setShowBulkMove(true)}
          />
        )}
      </div>

      {/* Movies display */}
      {moviesLoading ? (
        <div className="card p-8 text-center text-gray-400">Loading movies...</div>
      ) : !filteredMovies.length ? (
        <div className="card p-8 text-center text-gray-400">
          {search ? 'No movies match your search' : 'No movies found'}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMovies.map((m) => (
            <PosterCard
              key={m.id}
              tmdbId={m.tmdbId}
              type="movie"
              title={m.title}
              year={m.year}
              selected={selectedIds.has(m.id)}
              onSelect={() => toggleSelect(m.id)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full" style={{ minWidth: 'max-content' }}>
            <thead className="bg-gray-700/50 text-left text-sm text-gray-400">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredMovies.length && filteredMovies.length > 0}
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
                      <SortHeader field={col.sortField}>{col.label}</SortHeader>
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
              {filteredMovies.map((m) => (
                <tr
                  key={m.id}
                  className={`hover:bg-gray-700/30 ${selectedIds.has(m.id) ? 'bg-primary-900/20' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                    />
                  </td>
                  {visibleColumnConfigs.map((col) => (
                    <td
                      key={col.key}
                      className="p-3"
                      style={{ width: columnWidths[col.key], maxWidth: columnWidths[col.key] }}
                    >
                      {col.key === 'title' && (
                        <PosterHover tmdbId={m.tmdbId} type="movie">
                          <span className="font-medium truncate block">{m.title}</span>
                        </PosterHover>
                      )}
                      {col.key === 'year' && <span className="text-gray-400">{m.year}</span>}
                      {col.key === 'path' && (
                        <div className="flex items-center gap-2 group">
                          <FolderIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span
                            className="text-xs text-gray-400 font-mono truncate flex-1"
                            title={m.path}
                          >
                            {showFullPath ? m.path : getShortPath(m.path)}
                          </span>
                          <button
                            onClick={() => setEditingPath({ movie: m })}
                            className="p-1 text-gray-500 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            title="Edit path"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {col.key === 'file' && (
                        <span
                          className={`text-xs font-mono truncate block ${
                            m.movieFile?.relativePath?.toLowerCase().endsWith('.iso')
                              ? 'text-yellow-400'
                              : 'text-gray-400'
                          }`}
                          title={m.movieFile?.relativePath || 'No file'}
                        >
                          {m.movieFile?.relativePath || '-'}
                        </span>
                      )}
                      {col.key === 'quality' && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-700">
                          {qualityProfileMap[m.qualityProfileId] || 'Unknown'}
                        </span>
                      )}
                      {col.key === 'size' && (
                        <span className="text-gray-400">{formatBytes(m.sizeOnDisk)}</span>
                      )}
                      {col.key === 'hasFile' && (
                        m.hasFile ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-500" />
                        )
                      )}
                      {col.key === 'monitored' && (
                        m.monitored ? (
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
        </div>
      )}

      {filteredMovies.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          {selectedIds.size > 0
            ? `${selectedIds.size} of ${filteredMovies.length} selected`
            : `${filteredMovies.length} movies`}
        </div>
      )}

      {/* Path Edit Modal */}
      <PathEditModal
        isOpen={!!editingPath}
        title={editingPath?.movie.title || ''}
        currentPath={editingPath?.movie.path || ''}
        availablePaths={movies?.map((m) => m.path) || []}
        onClose={() => setEditingPath(null)}
        onSave={handlePathSave}
      />

      {/* Bulk Path Edit Modal */}
      <BulkPathEditModal
        isOpen={showBulkMove}
        selectedItems={selectedMovies.map((m) => ({ id: m.id, title: m.title, path: m.path }))}
        availablePaths={movies?.map((m) => m.path) || []}
        onClose={() => setShowBulkMove(false)}
        onMove={handleBulkMove}
      />
    </div>
  );
}
