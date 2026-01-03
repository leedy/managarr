import axios from 'axios';
import type {
  Instance,
  InstanceHealth,
  InstanceType,
  ConnectionTestResult,
  SonarrSeries,
  SonarrQualityProfile,
  RadarrMovie,
  RadarrQualityProfile,
  SonarrCutoffUnmetResponse,
  RadarrCutoffUnmetResponse,
  QueueResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Instances
export async function getInstances(): Promise<Instance[]> {
  const response = await api.get('/instances');
  return response.data;
}

export async function getInstancesByType(type: InstanceType): Promise<Instance[]> {
  const response = await api.get(`/instances/type/${type}`);
  return response.data;
}

export async function getInstance(id: string): Promise<Instance> {
  const response = await api.get(`/instances/${id}`);
  return response.data;
}

export async function createInstance(data: {
  name: string;
  type: InstanceType;
  url: string;
  apiKey: string;
  isEnabled?: boolean;
}): Promise<Instance> {
  const response = await api.post('/instances', data);
  return response.data;
}

export async function updateInstance(
  id: string,
  data: Partial<{
    name: string;
    type: InstanceType;
    url: string;
    apiKey: string;
    isEnabled: boolean;
  }>
): Promise<Instance> {
  const response = await api.put(`/instances/${id}`, data);
  return response.data;
}

export async function deleteInstance(id: string): Promise<void> {
  await api.delete(`/instances/${id}`);
}

export async function testInstanceConnection(id: string): Promise<ConnectionTestResult> {
  const response = await api.post(`/instances/${id}/test`);
  return response.data;
}

export async function testConnection(
  type: InstanceType,
  url: string,
  apiKey: string
): Promise<ConnectionTestResult> {
  const response = await api.post('/instances/test', { type, url, apiKey });
  return response.data;
}

// Health
export async function getHealthStatus(): Promise<InstanceHealth[]> {
  const response = await api.get('/health');
  return response.data;
}

export async function getInstanceHealth(id: string): Promise<InstanceHealth> {
  const response = await api.get(`/health/${id}`);
  return response.data;
}

// Sonarr
export async function getSonarrSeries(instanceId: string): Promise<SonarrSeries[]> {
  const response = await api.get(`/sonarr/${instanceId}/series`);
  return response.data;
}

export async function getSonarrQualityProfiles(instanceId: string): Promise<SonarrQualityProfile[]> {
  const response = await api.get(`/sonarr/${instanceId}/qualityprofile`);
  return response.data;
}

export async function updateSonarrSeries(
  instanceId: string,
  series: SonarrSeries,
  moveFiles: boolean = false
): Promise<SonarrSeries> {
  const response = await api.put(
    `/sonarr/${instanceId}/series/${series.id}${moveFiles ? '?moveFiles=true' : ''}`,
    series
  );
  return response.data;
}

export async function updateSonarrSeriesPath(
  instanceId: string,
  seriesId: number,
  newPath: string
): Promise<SonarrSeries> {
  // First get the current series data
  const currentResponse = await api.get(`/sonarr/${instanceId}/series/${seriesId}`);
  const series = currentResponse.data;

  // Update the path and send with moveFiles=true
  series.path = newPath;
  const response = await api.put(
    `/sonarr/${instanceId}/series/${seriesId}?moveFiles=true`,
    series
  );
  return response.data;
}

export async function deleteSonarrSeries(
  instanceId: string,
  seriesId: number,
  deleteFiles: boolean = false
): Promise<void> {
  await api.delete(`/sonarr/${instanceId}/series/${seriesId}?deleteFiles=${deleteFiles}`);
}

// Radarr
export async function getRadarrMovies(instanceId: string): Promise<RadarrMovie[]> {
  const response = await api.get(`/radarr/${instanceId}/movie`);
  return response.data;
}

export async function getRadarrQualityProfiles(instanceId: string): Promise<RadarrQualityProfile[]> {
  const response = await api.get(`/radarr/${instanceId}/qualityprofile`);
  return response.data;
}

export async function updateRadarrMovie(
  instanceId: string,
  movie: RadarrMovie,
  moveFiles: boolean = false
): Promise<RadarrMovie> {
  const response = await api.put(
    `/radarr/${instanceId}/movie/${movie.id}${moveFiles ? '?moveFiles=true' : ''}`,
    movie
  );
  return response.data;
}

export async function updateRadarrMoviePath(
  instanceId: string,
  movieId: number,
  newPath: string
): Promise<RadarrMovie> {
  // First get the current movie data
  const currentResponse = await api.get(`/radarr/${instanceId}/movie/${movieId}`);
  const movie = currentResponse.data;

  // Update the path and send with moveFiles=true
  movie.path = newPath;
  const response = await api.put(
    `/radarr/${instanceId}/movie/${movieId}?moveFiles=true`,
    movie
  );
  return response.data;
}

export async function deleteRadarrMovie(
  instanceId: string,
  movieId: number,
  deleteFiles: boolean = false
): Promise<void> {
  await api.delete(`/radarr/${instanceId}/movie/${movieId}?deleteFiles=${deleteFiles}`);
}

// Settings
export async function getSettings(): Promise<Record<string, unknown>> {
  const response = await api.get('/settings');
  return response.data;
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const response = await api.get(`/settings/${key}`);
  return response.data.value;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await api.put(`/settings/${key}`, { value });
}

export async function getExcludedPlexLibraries(): Promise<string[]> {
  const response = await api.get('/settings/plex/excluded-libraries');
  return response.data;
}

export async function setExcludedPlexLibraries(libraries: string[]): Promise<void> {
  await api.put('/settings/plex/excluded-libraries', { libraries });
}

// TMDB
export async function getTmdbApiKey(): Promise<string> {
  const response = await api.get('/settings/tmdb/api-key');
  return response.data.apiKey;
}

export async function setTmdbApiKey(apiKey: string): Promise<void> {
  await api.put('/settings/tmdb/api-key', { apiKey });
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
}

export interface TmdbFindResult {
  movie_results: TmdbMovieDetails[];
  tv_results: TmdbTvDetails[];
}

export async function getTmdbMovie(tmdbId: number): Promise<TmdbMovieDetails> {
  const response = await api.get(`/tmdb/movie/${tmdbId}`);
  return response.data;
}

export async function getTmdbTv(tmdbId: number): Promise<TmdbTvDetails> {
  const response = await api.get(`/tmdb/tv/${tmdbId}`);
  return response.data;
}

export async function findByExternalId(
  externalId: string,
  source: 'tvdb_id' | 'imdb_id'
): Promise<TmdbFindResult> {
  const response = await api.get(`/tmdb/find/${externalId}?source=${source}`);
  return response.data;
}

// Cutoff Unmet
export async function getSonarrCutoffUnmet(
  instanceId: string,
  pageSize: number = 1000
): Promise<SonarrCutoffUnmetResponse> {
  const response = await api.get(
    `/sonarr/${instanceId}/wanted/cutoff?pageSize=${pageSize}&includeSeries=true&includeEpisodeFile=true`
  );
  return response.data;
}

export async function getRadarrCutoffUnmet(
  instanceId: string,
  pageSize: number = 1000
): Promise<RadarrCutoffUnmetResponse> {
  const response = await api.get(
    `/radarr/${instanceId}/wanted/cutoff?pageSize=${pageSize}`
  );
  return response.data;
}

// Queue
export async function getSonarrQueue(
  instanceId: string,
  pageSize: number = 100
): Promise<QueueResponse> {
  const response = await api.get(
    `/sonarr/${instanceId}/queue?pageSize=${pageSize}&includeEpisode=true&includeSeries=true`
  );
  return response.data;
}

export async function getRadarrQueue(
  instanceId: string,
  pageSize: number = 100
): Promise<QueueResponse> {
  const response = await api.get(
    `/radarr/${instanceId}/queue?pageSize=${pageSize}&includeMovie=true`
  );
  return response.data;
}
