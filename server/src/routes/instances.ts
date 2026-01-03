import { Router, Request, Response } from 'express';
import { Instance, InstanceType } from '../models/Instance.js';
import { testConnection } from '../services/connectionTest.js';
import { z } from 'zod';

const router = Router();

// Validation schema
const instanceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['sonarr', 'radarr', 'plex']),
  url: z.string().url(),
  apiKey: z.string().min(1),
  isEnabled: z.boolean().optional().default(true),
});

// Get all instances
router.get('/', async (_req: Request, res: Response) => {
  try {
    const instances = await Instance.find().select('-apiKey').sort({ type: 1, name: 1 });
    res.json(instances);
  } catch (error) {
    console.error('Error fetching instances:', error);
    res.status(500).json({ error: 'Failed to fetch instances' });
  }
});

// Get instances by type
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (!['sonarr', 'radarr', 'plex'].includes(type)) {
      return res.status(400).json({ error: 'Invalid instance type' });
    }
    const instances = await Instance.find({ type }).select('-apiKey').sort({ name: 1 });
    res.json(instances);
  } catch (error) {
    console.error('Error fetching instances by type:', error);
    res.status(500).json({ error: 'Failed to fetch instances' });
  }
});

// Get single instance
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findById(req.params.id).select('-apiKey');
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    res.json(instance);
  } catch (error) {
    console.error('Error fetching instance:', error);
    res.status(500).json({ error: 'Failed to fetch instance' });
  }
});

// Create new instance
router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = instanceSchema.parse(req.body);
    const instance = new Instance(validated);
    await instance.save();

    const { apiKey: _, ...response } = instance.toObject();

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating instance:', error);
    res.status(500).json({ error: 'Failed to create instance' });
  }
});

// Update instance
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validated = instanceSchema.partial().parse(req.body);
    const instance = await Instance.findByIdAndUpdate(
      req.params.id,
      validated,
      { new: true }
    ).select('-apiKey');

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    res.json(instance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating instance:', error);
    res.status(500).json({ error: 'Failed to update instance' });
  }
});

// Delete instance
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByIdAndDelete(req.params.id);
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    res.json({ message: 'Instance deleted' });
  } catch (error) {
    console.error('Error deleting instance:', error);
    res.status(500).json({ error: 'Failed to delete instance' });
  }
});

// Test instance connection
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findById(req.params.id);
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const result = await testConnection(instance.type, instance.url, instance.apiKey);
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Test connection without saving (for new instance form)
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { type, url, apiKey } = req.body;
    if (!type || !url || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await testConnection(type as InstanceType, url, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

export { router as instanceRoutes };
