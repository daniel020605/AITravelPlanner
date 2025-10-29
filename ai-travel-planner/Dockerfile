# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build

WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install all dependencies including dev dependencies for build
RUN npm ci

# Copy all source code after installing dependencies
COPY . .

# Build the application using npx to ensure vite is found
RUN npx vite build

# Production stage
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Install runtime tools required by health checks, interactive shells, and runtime config templating
RUN apk add --no-cache curl bash gettext

# Disable default user directive to avoid warnings when running non-root
RUN sed -i 's/^user[[:space:]][[:alnum:]_]*;//' /etc/nginx/nginx.conf

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy runtime config entrypoint script
COPY docker/entrypoint/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

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
