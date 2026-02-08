# Docker Development Setup

This document describes how the frontend and backend containers communicate in development mode.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  http://localhost:5173                                      │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Container (frontend-dev)                          │
│  Vite Dev Server on port 5173                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Vite Proxy Configuration                           │    │
│  │  - Intercepts: /api/*                               │    │
│  │  - Forwards to: http://backend:8000                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────┬───────────────────────────────────────────────┘
              │ Docker Network (internal)
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend Container (backend)                                │
│  FastAPI on port 8000                                       │
│  - Listens on: 0.0.0.0:8000                                 │
│  - Exposed to: Docker network only (not host)               │
└─────────────────────────────────────────────────────────────┘
```

## How Communication Works

### 1. From Browser to Frontend
- Browser makes request to `http://localhost:5173`
- Vite dev server handles the request
- React app is served with hot reload support

### 2. API Calls from Frontend
- Your React code calls: `fetch('/api/config')`
- **Relative URL** - no host needed
- Vite intercepts the request via proxy

### 3. Vite Proxy (Development Only)
In `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://backend:8000',  // Backend service name
      changeOrigin: true,
    }
  },
  host: '0.0.0.0',  // Required for Docker
  port: 5173,
}
```

**What happens:**
- Request: `GET /api/config`
- Vite proxies to: `http://backend:8000/api/config`
- Response flows back through Vite to browser

### 4. Docker Network Resolution
- `backend` is the **service name** from `docker-compose.yml`
- Docker's internal DNS resolves `backend` → container IP
- Backend port 8000 is exposed but **not published** to host
- Only accessible within Docker network

## Required Configuration

### ✅ Frontend (Vite)

**File:** `vite.config.ts`
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      }
    },
    host: '0.0.0.0',
    port: 5173,
  }
});
```

**Key points:**
- `target: 'http://backend:8000'` - Uses Docker service name
- `host: '0.0.0.0'` - Binds to all interfaces (required for Docker)
- Relative URLs in code: `/api/*` not `http://backend:8000/api/*`

### ✅ Docker Compose

**File:** `docker-compose.yml`
```yaml
frontend-dev:
  build:
    target: dev  # Uses the dev stage from Dockerfile
  ports:
    - "5173:5173"  # Only Vite port exposed
  environment:
    - CHOKIDAR_USEPOLLING=true  # For hot reload in Docker
  depends_on:
    - backend  # Ensures backend starts first

backend:
  expose:
    - "8000"  # Only internal, not published to host
  # No ports mapping - backend is accessed via Docker network only
```

### ✅ Backend (FastAPI)

**File:** `backend/Dockerfile`
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Key points:**
- `--host 0.0.0.0` - Required to accept connections from outside the container
- Routes mounted at `/api` prefix in FastAPI

## Testing the Setup

### 1. Start the services
```bash
docker-compose up frontend-dev backend
```

### 2. Verify in browser
- Open: http://localhost:5173
- Frontend should load

### 3. Test API communication
In browser console:
```javascript
fetch('/api/config')
  .then(r => r.json())
  .then(data => console.log(data))
```

Should return data from backend (no CORS errors!)

### 4. Check Docker network (optional)
```bash
# List containers and their IPs
docker network ls
docker network inspect energy_consumption_default

# Test backend directly from frontend container
docker-compose exec frontend-dev wget -qO- http://backend:8000/api/config
```

## Common Issues

### ❌ "Cannot connect to backend"
**Cause:** Backend not running or wrong port
**Fix:** Check `docker-compose ps`, ensure backend is healthy

### ❌ "Connection refused" on API calls
**Cause:** Backend binding to localhost instead of 0.0.0.0
**Fix:** Ensure FastAPI uses `--host 0.0.0.0`

### ❌ CORS errors in browser
**Cause:** Trying to access backend directly instead of through proxy
**Fix:** Use relative URLs `/api/*` not `http://localhost:8000/api/*`

### ❌ Hot reload not working
**Cause:** File changes not detected in Docker volume
**Fix:** `CHOKIDAR_USEPOLLING=true` is set in docker-compose.yml

## Quick Reference

| Component | Internal Address | External Access |
|-----------|------------------|-----------------|
| Frontend Dev | `frontend-dev:5173` | `http://localhost:5173` |
| Backend | `backend:8000` | Not accessible (internal only) |
| API via Proxy | `http://localhost:5173/api/*` | Same as above |

## Key Takeaway

**Always use relative URLs in your React code:**
```typescript
// ✅ Good - works in dev and production
const data = await fetch('/api/config');

// ❌ Bad - bypasses proxy, causes CORS issues
const data = await fetch('http://localhost:8000/api/config');
```

The Vite proxy handles routing to the backend automatically, and Nginx does the same in production.
