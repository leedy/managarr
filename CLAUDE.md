# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Managarr is a web application for managing Sonarr, Radarr, and Plex media library instances. It provides bulk operations, path management, quality profile comparison, and library analysis across multiple instances.

## Commands

```bash
# Development (runs both server and client concurrently)
npm run dev

# Run server only (Express backend with hot reload)
npm run dev:server

# Run client only (Vite dev server)
npm run dev:client

# Build both workspaces
npm run build

# Lint both workspaces
npm run lint
```

## Architecture

### Monorepo Structure
- Uses npm workspaces with `server/` and `client/` packages
- Root `package.json` orchestrates both via `concurrently`
- Shared `.env` file in project root (loaded by server, proxied to client via Vite)

### Backend (server/)
- **Express + TypeScript** with `tsx` for development hot reload
- **MongoDB/Mongoose** for persistence (instances, settings)
- **API Proxy Pattern**: All Sonarr/Radarr/Plex API calls go through the backend proxy
  - `server/src/services/arrProxy.ts` - Core proxy functions (`proxyToArr`, `proxyToPlex`)
  - Routes in `server/src/routes/` expose `/api/sonarr/:instanceId/*`, `/api/radarr/:instanceId/*`, `/api/plex/:instanceId/*`
  - Wildcard routes forward any endpoint (e.g., `/wanted/cutoff`, `/queue`, `/history`)
  - Query parameters (like `?moveFiles=true`, `?includeEpisode=true`) must be forwarded through the proxy
- **TMDB Proxy** (`server/src/routes/tmdb.ts`) - Proxies TMDB API for poster images

### Frontend (client/)
- **React 18 + TypeScript + Vite**
- **TailwindCSS** for styling (dark theme default)
- **React Query** (`@tanstack/react-query`) for data fetching and cache management
- **React Router** for navigation
- **Heroicons** for icons

### Key Data Flow
1. Client calls `client/src/services/api.ts` functions
2. API functions make requests to `/api/*` (proxied to Express server in dev via Vite)
3. Server routes use `proxyToArr`/`proxyToPlex` to forward requests to actual Sonarr/Radarr/Plex APIs
4. API keys stored in MongoDB `Instance` model, injected as headers by proxy

### Important Patterns

**Path editing with file moves**: When updating media paths, use `?moveFiles=true` query param to trigger physical file moves in Sonarr/Radarr

**Bulk operations**: `BulkActions` component handles multi-select operations; `BulkPathEditModal` for bulk path changes

**Activity tracking**: `ActivityIndicator` polls `/command` endpoints to track ongoing move operations

**Column configuration**: Media pages support resizable columns, visibility toggles, and short/full path display

**Multi-instance aggregation**: Pages like Queue, Activity, CutoffUnmet, and Duplicates fetch from all instances and combine results. Pattern:
```typescript
for (const instance of instances) {
  const response = await getInstanceData(instance._id);
  items.push(...response.records.map(record => ({ ...record, instanceName: instance.name })));
}
```

**Reusable UI components**:
- `LoadingSpinner` - Animated loading indicator with optional text
- `EmptyState` - Empty state display with icon, title, description

**Responsive layout**: `Layout.tsx` uses mobile-first design with collapsible sidebar (hamburger menu on mobile, fixed sidebar on lg+)

**TMDB poster integration**: `PosterHover` component fetches poster via `/api/tmdb/*` endpoints using TMDB ID (movies) or TVDB ID (series via find endpoint)

## Environment Variables

Copy `.env.example` to `.env`:
- `PORT` - Server port (default: 3005)
- `MONGODB_URI` - MongoDB connection string
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:5179)
- `VITE_PORT` - Vite dev server port

## Page Structure

| Page | Purpose |
|------|---------|
| Dashboard | Instance health status overview |
| Queue | Combined download queue from all instances (auto-refresh) |
| Activity | Combined history/activity from all instances |
| TV Series / Movies | Media browser with bulk operations |
| Plex | Plex library browser |
| Quality Profiles | Compare profiles across instances |
| Disk Space | Storage analysis |
| Compare | Cross-instance library comparison |
| Cutoff Unmet | Media below quality cutoff |
| Duplicates | Media in multiple instances |
