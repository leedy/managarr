export type InstanceType = 'sonarr' | 'radarr' | 'plex';

export interface Instance {
  _id: string;
  name: string;
  type: InstanceType;
  url: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceHealth {
  id: string;
  name: string;
  type: string;
  isEnabled: boolean;
  status: 'online' | 'offline' | 'disabled';
  version?: string;
  message?: string;
  checkedAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  version?: string;
  error?: string;
}

// Sonarr Types
export interface SonarrSeries {
  id: number;
  title: string;
  sortTitle: string;
  status: string;
  overview?: string;
  network?: string;
  year: number;
  path: string;
  qualityProfileId: number;
  seasonFolder: boolean;
  monitored: boolean;
  runtime: number;
  tvdbId?: number;
  imdbId?: string;
  certification?: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings?: { votes: number; value: number };
  images: Array<{ coverType: string; url: string; remoteUrl?: string }>;
  statistics: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
}

export interface SonarrQualityProfile {
  id: number;
  name: string;
}

// Radarr Types
export interface RadarrMovieFile {
  id: number;
  relativePath: string;
  path: string;
  size: number;
  quality: { quality: { id: number; name: string } };
}

export interface RadarrMovie {
  id: number;
  title: string;
  sortTitle: string;
  status: string;
  overview?: string;
  studio?: string;
  year: number;
  path: string;
  qualityProfileId: number;
  monitored: boolean;
  runtime: number;
  tmdbId?: number;
  imdbId?: string;
  certification?: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings?: { votes: number; value: number };
  hasFile: boolean;
  sizeOnDisk: number;
  images: Array<{ coverType: string; url: string; remoteUrl?: string }>;
  movieFile?: RadarrMovieFile;
}

export interface RadarrQualityProfile {
  id: number;
  name: string;
}

// Cutoff Unmet Types
export interface SonarrCutoffUnmetRecord {
  id: number;
  seriesId: number;
  tvdbId?: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate?: string;
  airDateUtc?: string;
  hasFile: boolean;
  monitored: boolean;
  series: {
    id: number;
    title: string;
    year: number;
    path: string;
    tvdbId?: number;
  };
  episodeFile?: {
    id: number;
    relativePath: string;
    quality: {
      quality: { id: number; name: string };
    };
  };
}

export interface SonarrCutoffUnmetResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: SonarrCutoffUnmetRecord[];
}

export interface RadarrCutoffUnmetRecord {
  id: number;
  title: string;
  sortTitle: string;
  year: number;
  path: string;
  tmdbId?: number;
  imdbId?: string;
  monitored: boolean;
  hasFile: boolean;
  sizeOnDisk: number;
  movieFile?: {
    id: number;
    relativePath: string;
    quality: {
      quality: { id: number; name: string };
    };
  };
}

export interface RadarrCutoffUnmetResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: RadarrCutoffUnmetRecord[];
}
