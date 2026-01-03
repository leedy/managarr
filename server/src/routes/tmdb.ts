import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getSetting, SETTING_KEYS } from '../models/Settings.js';

const router = Router();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function getApiKey(): Promise<string | null> {
  const apiKey = await getSetting<string>(SETTING_KEYS.TMDB_API_KEY, '');
  return apiKey || null;
}

// Get movie details by TMDB ID
router.get('/movie/:tmdbId', async (req: Request, res: Response) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const { tmdbId } = req.params;
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: { api_key: apiKey },
    });

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    console.error('Error fetching movie from TMDB:', error);
    res.status(500).json({ error: 'Failed to fetch movie from TMDB' });
  }
});

// Get TV show details by TMDB ID
router.get('/tv/:tmdbId', async (req: Request, res: Response) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const { tmdbId } = req.params;
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}`, {
      params: { api_key: apiKey },
    });

    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return res.status(404).json({ error: 'TV show not found' });
    }
    console.error('Error fetching TV show from TMDB:', error);
    res.status(500).json({ error: 'Failed to fetch TV show from TMDB' });
  }
});

// Find by external ID (TVDB, IMDB)
router.get('/find/:externalId', async (req: Request, res: Response) => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const { externalId } = req.params;
    const { source } = req.query;

    if (!source || !['tvdb_id', 'imdb_id'].includes(source as string)) {
      return res.status(400).json({ error: 'source query param must be tvdb_id or imdb_id' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/find/${externalId}`, {
      params: {
        api_key: apiKey,
        external_source: source,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error finding by external ID from TMDB:', error);
    res.status(500).json({ error: 'Failed to find by external ID from TMDB' });
  }
});

export { router as tmdbRoutes };
