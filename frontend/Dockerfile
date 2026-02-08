# installs ALL dependencies, including dev dependencies
FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

# installs ONLY production related dependencies
#   → for the final runtime image
FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

# copies the desired dependencies from development-dependencies-env
#   → required for production build
FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

# copies the desired dependencies from production-dependencies-env
#   → final image for production
# FROM node:20-alpine AS final

# final image for production: nginx serves the build output
FROM nginx:1.27-alpine AS final

# Nginx config (SPA fallback + optional /api reverse proxy)
# (liegt im Build-Context z.B. unter frontend/nginx/default.conf)
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# React build output -> default nginx web root
COPY --from=build-env /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# COPY ./package.json package-lock.json /app/
# COPY --from=production-dependencies-env /app/node_modules /app/node_modules
# COPY --from=build-env /app/build /app/build
# WORKDIR /app
# CMD ["npm", "run", "start"]