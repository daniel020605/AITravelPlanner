# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY ai-travel-planner/package.json ai-travel-planner/package-lock.json ./

# Install all dependencies (vite lives in devDependencies)
RUN npm ci

# Copy source code
COPY ai-travel-planner/tsconfig.json ai-travel-planner/tsconfig.app.json ai-travel-planner/tsconfig.node.json ai-travel-planner/vite.config.ts ./
COPY ai-travel-planner/index.html ./index.html
COPY ai-travel-planner/src ./src
COPY ai-travel-planner/public ./public
COPY ai-travel-planner/tailwind.config.js ai-travel-planner/postcss.config.js ai-travel-planner/eslint.config.js ./ 

# Build the application
RUN npm run build

# Production stage
FROM nginx:1.27-alpine

# Ensure runtime uses production settings
ENV NODE_ENV=production

# Install runtime tools required by health checks and debugging
RUN apk add --no-cache curl bash

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY ai-travel-planner/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
