# Managarr - Application Plan

## Overview
A web application for managing Sonarr and Radarr instances, providing bulk operations, quality management, library comparison, and monitoring capabilities for home theater media management.

## Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (with Mongoose ODM)
- **Deployment**: Standalone Node (Docker added later for production)

## Project Structure
```
managarr/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client services
│   │   ├── stores/         # State management (Zustand)
│   │   └── types/          # TypeScript types
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API route definitions
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── package.json            # Root package.json for scripts
```

## Core Features

### 1. Instance Management
- Add/edit/remove Sonarr, Radarr, and Plex instances
- Store API keys/tokens securely
- Health check and connection status
- Support for multiple instances (e.g., 4K + 1080p libraries)

### 2. Bulk Operations
- Mass edit quality profiles across media
- Bulk delete/unmonitor series or movies
- Batch rename operations
- Bulk tag management
- Search and filter with bulk actions

### 3. Quality Management
- View quality profiles across instances
- Identify media below target quality
- Automatic upgrade path visualization
- Disk space analysis by quality tier
- Cutoff unmet reports

### 4. Sync & Compare
- Compare libraries between instances
- Find duplicates (same media in multiple instances)
- Sync quality profiles between instances
- Export/import settings
- Missing media cross-reference
- Untracked files detection (files on disk not managed by Sonarr/Radarr)

### 5. Monitoring & Alerts
- Dashboard with health status
- Download queue aggregation
- Disk space monitoring
- Missing media reports
- Activity history
- Scheduled health checks (stored in MongoDB)

### 6. Plex Integration
- Plex library inspection (movies, TV shows)
- Compare Plex libraries against Sonarr/Radarr
- Find items in Plex not tracked by *arr apps
- Find items in *arr apps missing from Plex
- Library metadata details

## Database Schema (MongoDB)

### Collections:
- `instances` - Sonarr/Radarr connection configs
- `healthChecks` - Historical health check data
- `syncTasks` - Scheduled sync operations
- `settings` - App configuration

## API Design

### Endpoints:
```
/api/instances          - CRUD for *arr instances
/api/sonarr/:id/*       - Proxy to Sonarr API
/api/radarr/:id/*       - Proxy to Radarr API
/api/bulk/*             - Bulk operation endpoints
/api/compare/*          - Library comparison
/api/health/*           - Health check endpoints
/api/dashboard          - Aggregated dashboard data
```

## Implementation Phases

### Phase 1: Foundation ✅
- [x] Project scaffolding (monorepo setup)
- [x] Backend: Express server with TypeScript
- [x] Frontend: React + Vite + TailwindCSS setup
- [x] MongoDB connection and models
- [x] Instance management (add/edit/remove Sonarr/Radarr/Plex)
- [x] Basic API proxy to *arr instances and Plex

### Phase 2: Core Features ✅
- [x] Dashboard with instance health status
- [x] Media browser (list series/movies from instances)
- [x] Bulk selection UI component
- [x] Bulk edit quality profile
- [x] Bulk delete/unmonitor operations

### Phase 3: Quality & Comparison ✅
- [x] Quality profile viewer
- [x] Cutoff unmet report
- [x] Disk space analysis
- [x] Library comparison between instances
- [x] Duplicate detection
- [x] Untracked files detection (find files on disk not in Sonarr/Radarr)
- [x] Plex library browser
- [x] Plex vs *arr comparison (find mismatches)

### Phase 4: Monitoring & Polish ✅
- [x] Download queue aggregation
- [x] Activity history
- [ ] Settings page
- [x] UI polish and responsive design

### Phase 5: Production Ready
- [x] Docker + docker-compose configuration
- [ ] Documentation
- [x] Environment configuration

## Design Decisions
- **Real-time updates**: WebSockets (Socket.IO) for live download queue and status updates
- **Notifications**: In-app only (no external notifications)
- **UI Theme**: Dark mode by default (with light mode toggle)

## Key Dependencies

### Backend:
- express, cors, helmet
- mongoose
- axios (for *arr API calls)
- socket.io (WebSocket server)
- node-cron (scheduled tasks)
- zod (validation)

### Frontend:
- react, react-router-dom
- @tanstack/react-query (data fetching)
- zustand (state management)
- socket.io-client (WebSocket client)
- tailwindcss, @headlessui/react
- axios
- recharts (charts/graphs)

---

## Progress Notes

### Phase 3 Completion Notes
Phase 3 implementation added:

**Cutoff Unmet Page (/cutoff):**
- Toggle between Movies / TV Series
- Fetches cutoff unmet data from all Radarr/Sonarr instances
- Shows stats cards with total count and per-instance breakdowns
- Table displaying: Title, Episode (for series), Year, Current Quality, Instance, Path

**Duplicates Page (/duplicates):**
- Toggle between Movies / TV Series
- Fetches all media from all instances and groups by TMDB ID (movies) / TVDB ID (series), with title+year fallback
- Shows only items existing in 2+ instances
- Stats cards showing: duplicate count, duplicate storage used, instance count
- Table displaying: Title (with paths), Year, External ID, Instances, Total Size
- Sorted by total size (largest duplicates first)

### Phase 4 Completion Notes
- Download queue page with auto-refresh and import blocked reasons
- Activity history page with combined history from all instances
- UI polish: responsive design with mobile hamburger menu, loading states

### Phase 5 Completion Notes
**Docker Setup:**
- Multi-stage Dockerfile builds both client and server
- Express serves static client files in production mode
- docker-compose.yml includes app + MongoDB with persistent storage

**Usage:**
```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f managarr

# Stop
docker-compose down

# Stop and remove data
docker-compose down -v
```

Access at http://localhost:3005
