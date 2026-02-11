# =============================================================================
# Production Dockerfile: Single Container with nginx + Python + React
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build React Frontend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime
# Combines: nginx + Python + Built Frontend
# -----------------------------------------------------------------------------
FROM python:3.12-slim-bookworm

# Install nginx and supervisord
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Setup Python Backend
# -----------------------------------------------------------------------------
WORKDIR /app

# Install Python dependencies
RUN pip install --no-cache-dir fastapi uvicorn pydantic

# Copy backend code
COPY backend/ .

# Create data directory for SQLite
RUN mkdir -p /app/data

# -----------------------------------------------------------------------------
# Setup nginx
# -----------------------------------------------------------------------------
# Remove default nginx config
RUN rm /etc/nginx/sites-enabled/default

# Copy custom nginx config
COPY production/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app (react-router builds to 'build/client')
COPY --from=frontend-builder /app/build/client /usr/share/nginx/html

# -----------------------------------------------------------------------------
# Setup Supervisor (process manager)
# -----------------------------------------------------------------------------
COPY production/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# -----------------------------------------------------------------------------
# Expose port and start
# -----------------------------------------------------------------------------
EXPOSE 80

# Start both nginx and FastAPI via supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
