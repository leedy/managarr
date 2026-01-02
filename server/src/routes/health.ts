import { Router, Request, Response } from 'express';
import { Instance } from '../models/Instance.js';
import { testConnection } from '../services/connectionTest.js';

const router = Router();

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

// Get health status of all instances
router.get('/', async (_req: Request, res: Response) => {
  try {
    const instances = await Instance.find();
    const healthResults: InstanceHealth[] = [];

    for (const instance of instances) {
      if (!instance.isEnabled) {
        healthResults.push({
          id: instance._id.toString(),
          name: instance.name,
          type: instance.type,
          isEnabled: false,
          status: 'disabled',
          checkedAt: new Date().toISOString(),
        });
        continue;
      }

      const result = await testConnection(instance.type, instance.url, instance.apiKey);
      healthResults.push({
        id: instance._id.toString(),
        name: instance.name,
        type: instance.type,
        isEnabled: true,
        status: result.success ? 'online' : 'offline',
        version: result.version,
        message: result.message,
        checkedAt: new Date().toISOString(),
      });
    }

    res.json(healthResults);
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ error: 'Failed to check instance health' });
  }
});

// Get health of a specific instance
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findById(req.params.id);
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    if (!instance.isEnabled) {
      return res.json({
        id: instance._id.toString(),
        name: instance.name,
        type: instance.type,
        isEnabled: false,
        status: 'disabled',
        checkedAt: new Date().toISOString(),
      });
    }

    const result = await testConnection(instance.type, instance.url, instance.apiKey);
    res.json({
      id: instance._id.toString(),
      name: instance.name,
      type: instance.type,
      isEnabled: true,
      status: result.success ? 'online' : 'offline',
      version: result.version,
      message: result.message,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking instance health:', error);
    res.status(500).json({ error: 'Failed to check instance health' });
  }
});

export { router as healthRoutes };
