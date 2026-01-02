import { Router, Request, Response } from 'express';
import { proxyToPlex } from '../services/arrProxy.js';

const router = Router();

// Get Plex libraries
router.get('/:instanceId/libraries', async (req: Request, res: Response) => {
  const { instanceId } = req.params;
  const result = await proxyToPlex(instanceId, '/library/sections');

  if (result.success) {
    res.json(result.data);
  } else {
    res.status(result.status || 500).json({ error: result.error });
  }
});

// Get library contents
router.get('/:instanceId/libraries/:libraryId', async (req: Request, res: Response) => {
  const { instanceId, libraryId } = req.params;
  const result = await proxyToPlex(instanceId, `/library/sections/${libraryId}/all`);

  if (result.success) {
    res.json(result.data);
  } else {
    res.status(result.status || 500).json({ error: result.error });
  }
});

// Get item metadata
router.get('/:instanceId/metadata/:ratingKey', async (req: Request, res: Response) => {
  const { instanceId, ratingKey } = req.params;
  const result = await proxyToPlex(instanceId, `/library/metadata/${ratingKey}`);

  if (result.success) {
    res.json(result.data);
  } else {
    res.status(result.status || 500).json({ error: result.error });
  }
});

// Proxy all other requests to Plex
router.all('/:instanceId/*', async (req: Request, res: Response) => {
  const { instanceId } = req.params;
  const path = req.params[0] || '';

  const result = await proxyToPlex(instanceId, `/${path}`, req.method as 'GET', req.body);

  if (result.success) {
    res.status(result.status || 200).json(result.data);
  } else {
    res.status(result.status || 500).json({ error: result.error });
  }
});

export { router as plexRoutes };
