import { Router, Request, Response } from 'express';
import { Settings, getSetting, setSetting, SETTING_KEYS } from '../models/Settings.js';

const router = Router();

// Get all settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await Settings.find();
    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get a specific setting
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOne({ key });
    if (!setting) {
      return res.json({ key, value: null });
    }
    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update a setting
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await setSetting(key, value);
    res.json({ key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get excluded Plex libraries
router.get('/plex/excluded-libraries', async (_req: Request, res: Response) => {
  try {
    const excluded = await getSetting<string[]>(SETTING_KEYS.EXCLUDED_PLEX_LIBRARIES, []);
    res.json(excluded);
  } catch (error) {
    console.error('Error fetching excluded libraries:', error);
    res.status(500).json({ error: 'Failed to fetch excluded libraries' });
  }
});

// Update excluded Plex libraries
router.put('/plex/excluded-libraries', async (req: Request, res: Response) => {
  try {
    const { libraries } = req.body;

    if (!Array.isArray(libraries)) {
      return res.status(400).json({ error: 'Libraries must be an array' });
    }

    await setSetting(SETTING_KEYS.EXCLUDED_PLEX_LIBRARIES, libraries);
    res.json({ libraries });
  } catch (error) {
    console.error('Error updating excluded libraries:', error);
    res.status(500).json({ error: 'Failed to update excluded libraries' });
  }
});

export { router as settingsRoutes };
