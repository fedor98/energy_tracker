# Multi-stage Dockerfile for React + Vite application
# Supports both development (hot reload) and production (nginx) modes

# =============================================================================
# Stage 1: Development dependencies
# Installs ALL dependencies including dev dependencies needed for building
# =============================================================================
FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

# =============================================================================
# Stage 2: Production dependencies
# Installs ONLY production dependencies for the final runtime image
# =============================================================================
FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

# =============================================================================
# Stage 3: Build environment
# Compiles the React application using development dependencies
# =============================================================================
FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

# =============================================================================
# Stage 4: Development server
# Runs Vite dev server with hot reload for local development
# Note: Uses port 5173 (standard Vite port), not 80
# =============================================================================
FROM node:20-alpine AS dev
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
# Expose Vite default dev server port
EXPOSE 5173
# Start Vite dev server with hot reload enabled
CMD ["npm", "run", "dev"]

# =============================================================================
# Stage 5: Production server
# Serves the built application using nginx
# Includes reverse proxy to backend API at /api/*
# =============================================================================
FROM nginx:1.27-alpine AS final

# Copy custom nginx configuration with SPA routing and API proxy
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built React app to nginx web root
COPY --from=build-env /app/build /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Run nginx in foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
