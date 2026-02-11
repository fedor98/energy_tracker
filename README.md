# Energy Tracker

A simple energy consumption tracking application with React frontend and FastAPI backend.

## Quick Start

### Development Mode (2 Containers)

For local development with hot reload:

```bash
# Start development services
docker-compose --profile dev up

# Or with build (after code changes)
docker-compose --profile dev up --build
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (internally accessible)

**Features:**
- Hot reload for frontend code changes
- FastAPI auto-reload for backend changes
- Separate containers for easier debugging

---

### Production Mode (1 Container)

For deployment with optimized performance:

```bash
# Build and start production container
docker-compose --profile prod up --build

# Or start without rebuilding
docker-compose --profile prod up
```

**Access the app:**
- Application: http://localhost:8080

**Features:**
- Single container with nginx + Python + React
- nginx serves static files efficiently
- SQLite database persisted in `./backend/data/`

---

## Architecture Overview

### Development (2 Containers)
```
┌─────────────────┐         ┌─────────────────┐
│  frontend-dev   │         │    backend      │
│   (Vite dev)    │ ───────▶│  (FastAPI)      │
│   Port: 5173    │         │   Port: 8000    │
└─────────────────┘         └─────────────────┘
```

### Production (1 Container)
```
┌─────────────────────────────────────┐
│         Energy-Tracker-app          │
│  ┌─────────────┐  ┌──────────────┐  │
│  │    nginx    │  │    Python    │  │
│  │  (Port 80)  │──│  (Port 8000) │  │
│  │  Static +   │  │   FastAPI    │  │
│  │  API Proxy  │  │              │  │
│  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────┘
```


### Ports

| Environment | Container     | Host Port | Description               |
|-------------|---------------|-----------|---------------------------|
| Dev         | frontend-dev  | 5173      | Vite dev server           |
| Dev         | backend-dev   | –         | Internal only (port 8000) |
| Prod        | app           | 8080      | nginx (port 80)           |

### Advantages of the single-container setup

✅ Simpler deployment (only one image)  
✅ No internal Docker network complexity  
✅ nginx optimized for static files  
✅ Compression + caching out of the box  
✅ Easier for small self-hosting setups (e.g. on a Raspberry Pi)

---

## Directory Structure

```
.
├── backend/              # FastAPI backend
│   ├── main.py           # Entry point
│   ├── routes.py         # API endpoints
│   ├── db.py             # Database operations
│   ├── data/             # SQLite database (persistent)
│   └── Dockerfile        # Dev-only Dockerfile
│
├── frontend/             # React + Vite frontend
│   ├── app/              # Application code
│   ├── Dockerfile        # Dev-only Dockerfile
│   └── ...
│
├── production/           # Production configuration
│   ├── Dockerfile        # Single-container build
│   ├── nginx.conf        # Web server config
│   └── supervisord.conf  # Process manager for nginx + FastAPI
│
└── docker-compose.yml   # Dev and Prod orchestration
```

---

## Technology Stack

- **Frontend:** React Router v7, Vite, TypeScript, TailwindCSS, Chart.js
- **Backend:** FastAPI, Python 3.12, SQLite
- **Dev Server:** Vite (hot reload)
- **Production:** nginx, Python, supervisord
