import { Router, Request, Response } from 'express';
import { proxyToArr } from '../services/arrProxy.js';

const router = Router();

// Proxy all requests to Radarr instance
// Routes: /api/radarr/:instanceId/*
router.all('/:instanceId/*', async (req: Request, res: Response) => {
  const { instanceId } = req.params;
  let path = req.params[0] || '';

  // Include query string parameters
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  if (queryString) {
    path += `?${queryString}`;
  }

  const result = await proxyToArr(instanceId, path, req.method as 'GET', req.body);

  if (result.success) {
    res.status(result.status || 200).json(result.data);
  } else {
    res.status(result.status || 500).json({ error: result.error });
  }
});

// Get movies list
router.get('/:instanceId', async (req: Request, res: Response) => {
  const { instanceId } = req.params;
  const result = await proxyToArr(instanceId, '/movie');

  if (result.success) {
    res.json(result.data);
  } else {
    res.status(result.status || 500).json({ error: result.error });
  }
});

export { router as radarrRoutes };
