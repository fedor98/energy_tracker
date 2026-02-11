# =============================================================================
# Dockerfile for Frontend Development ONLY
# Production build is now handled in production/Dockerfile
# =============================================================================

# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM node:20-alpine AS dependencies
COPY package*.json /app/
WORKDIR /app
RUN npm ci

# =============================================================================
# Stage 2: Development server
# Runs Vite dev server with hot reload for local development
# =============================================================================
FROM node:20-alpine AS dev
COPY . /app/
COPY --from=dependencies /app/node_modules /app/node_modules
WORKDIR /app

# Expose Vite default dev server port
EXPOSE 5173
# Start Vite dev server with hot reload enabled
CMD ["npm", "run", "dev"]
