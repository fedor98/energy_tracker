# Frontend Migration - Setup Guide

## Overview

This guide explains the Docker setup for running the React frontend in both **development** (hot reload) and **production** (nginx) modes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        HOST MACHINE                          │
│  ┌──────────────────────┐    ┌──────────────────────┐       │
│  │  Port 5173           │    │  Port 8080           │       │
│  │  (Development)       │    │  (Production)        │       │
│  └──────────┬───────────┘    └──────────┬───────────┘       │
└─────────────┼───────────────────────────┼───────────────────┘
              │                           │
      ┌───────▼────────┐         ┌────────▼────────┐
      │ frontend-dev   │         │ frontend-prod   │
      │ (Vite:5173)    │         │ (Nginx:80)      │
      └───────┬────────┘         └────────┬────────┘
              │                           │
              │         ┌─────────────────┘
              │         │
      ┌───────▼─────────▼────────┐
      │      backend             │
      │   (FastAPI:8000)         │
      └──────────────────────────┘
```

## Services

### Development Mode (`frontend-dev`)
- **Port:** 5173 → http://localhost:5173
- **Features:**
  - Hot module replacement (HMR)
  - Source maps for debugging
  - API proxy to backend (no CORS issues)
  - Volume-mounted source code for live editing

### Production Mode (`frontend-prod`)
- **Port:** 8080 → http://localhost:8080
- **Features:**
  - Optimized build (minified, tree-shaken)
  - Nginx static file serving with caching
  - API reverse proxy at `/api/*`
  - SPA routing support (React Router)

## Quick Start

### Development Mode (Recommended for development)

```bash
# Start only the services needed for development
docker-compose up frontend-dev backend

# Access the app:
# Frontend: http://localhost:5173
# API: http://localhost:5173/api/config (proxied to backend)
```

### Production Mode (Testing production build locally)

```bash
# Build and start production services
docker-compose up frontend-prod backend

# Access the app:
# Frontend: http://localhost:8080
# API: http://localhost:8080/api/config (proxied to backend)
```

### Both Modes (For testing)

```bash
# Start all services
docker-compose up

# Access:
# Development: http://localhost:5173
# Production:  http://localhost:8080
```

## API Integration

### From Frontend Code

Use relative URLs - they work in both dev and prod:

```typescript
// This works in both environments
const response = await fetch('/api/config');
const data = await response.json();
```

### How It Works

**Development (Vite dev server):**
- Request to `/api/config`
- Vite proxy forwards to `http://backend:8000/api/config`
- Response returned to browser

**Production (Nginx):**
- Request to `/api/config`
- Nginx `location /api/` proxies to `http://backend:8000/api/config`
- Response returned to browser

## File Structure

```
frontend/
├── Dockerfile              # Multi-stage build (dev + prod targets)
├── vite.config.ts          # Vite config with API proxy
├── nginx/
│   └── default.conf        # Nginx config with SPA routing + API proxy
└── ... (React app files)
```

## Troubleshooting

### Changes not showing in development?
- Check browser console for errors
- Verify `CHOKIDAR_USEPOLLING=true` is set in docker-compose.yml
- Try restarting: `docker-compose restart frontend-dev`

### API requests failing?
- Check backend is running: `docker-compose ps`
- Verify backend responds directly: `curl http://localhost:8000/api/config`
- Check nginx logs: `docker-compose logs frontend-prod`

### Port already in use?
- Change the host port in docker-compose.yml:
  ```yaml
  ports:
    - "3000:5173"  # Use port 3000 instead of 5173
  ```

## Configuration Summary

| Service | Target | Host Port | Container Port | Purpose |
|---------|--------|-----------|----------------|---------|
| frontend-dev | dev | 5173 | 5173 | Vite dev server with HMR |
| frontend-prod | final | 8080 | 80 | Nginx serving built app |
| backend | - | (internal only) | 8000 | FastAPI backend |

## Next Steps

1. Test the setup: `docker-compose up frontend-dev backend`
2. Open http://localhost:5173 in your browser
3. Try fetching data from `/api/config` in your React components
4. When ready to deploy, build the production image: `docker-compose build frontend-prod`
