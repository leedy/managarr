# Managarr

A web application for managing Sonarr, Radarr, and Plex media library instances. Provides bulk operations, path management, quality profile comparison, and library analysis across multiple instances.

## Features

### Instance Management
- Add and manage multiple Sonarr, Radarr, and Plex instances
- Support for multiple libraries (e.g., 4K + 1080p)
- Health check and connection status monitoring

### Media Management
- Browse TV series and movies across all instances
- Bulk operations: edit quality profiles, delete, unmonitor
- Bulk path editing with automatic file moves
- Resizable columns and customizable views

### Monitoring
- **Dashboard** - Instance health status overview
- **Queue** - Combined download queue from all instances with auto-refresh
- **Activity** - Combined history/activity from all instances

### Analysis Tools
- **Quality Profiles** - Compare profiles across instances
- **Cutoff Unmet** - Find media below quality cutoff
- **Duplicates** - Identify media existing in multiple instances
- **Disk Space** - Storage analysis across instances
- **Compare** - Cross-instance library comparison

### Plex Integration
- Browse Plex libraries
- Compare Plex libraries against Sonarr/Radarr

## Quick Start (Docker)

### Using Pre-built Image

1. Create a `docker-compose.yml`:

```yaml
services:
  managarr:
    image: ghcr.io/leedy/managarr:latest
    container_name: managarr
    restart: unless-stopped
    ports:
      - "3005:3005"
    environment:
      NODE_ENV: production
      MONGODB_HOST: your-mongodb-ip
      MONGODB_PORT: 27017
      MONGODB_USER: your-username
      MONGODB_PASSWORD: your-password
      MONGODB_DATABASE: managarr
```

2. Run:
```bash
docker-compose up -d
```

3. Access at http://localhost:3005

### Portainer / Unraid

1. Create a new stack using **Web editor**
2. Paste the docker-compose.yml content above
3. Edit the MongoDB environment variables
4. Deploy

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB

### Setup

1. Clone the repository:
```bash
git clone https://github.com/leedy/managarr.git
cd managarr
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in project root:
```env
PORT=3005
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/managarr
CLIENT_URL=http://localhost:5179
VITE_PORT=5179
VITE_API_URL=http://localhost:3005
```

4. Start development servers:
```bash
npm run dev
```

This runs both the backend (Express on port 3005) and frontend (Vite on port 5179) concurrently.

### Build

```bash
npm run build
```

### Project Structure

```
managarr/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client services
│   │   └── types/          # TypeScript types
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   ├── models/         # Mongoose models
│   │   ├── config/         # Configuration
│   │   └── types/          # TypeScript types
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── package.json            # Root package.json
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3005` |
| `MONGODB_URI` | Full MongoDB connection string | - |
| `MONGODB_HOST` | MongoDB host (alternative to URI) | `localhost` |
| `MONGODB_PORT` | MongoDB port | `27017` |
| `MONGODB_USER` | MongoDB username | - |
| `MONGODB_PASSWORD` | MongoDB password | - |
| `MONGODB_DATABASE` | MongoDB database name | `managarr` |
| `CLIENT_URL` | Frontend URL for CORS (dev only) | `http://localhost:5179` |

**Note:** You can use either `MONGODB_URI` for a full connection string, or the individual `MONGODB_*` variables. If `MONGODB_URI` is set, it takes precedence.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Query
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB with Mongoose
- **Deployment**: Docker

## License

MIT
