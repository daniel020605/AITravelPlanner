# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source code
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY tailwind.config.js postcss.config.js eslint.config.js ./ 

# Build the application
RUN npm run build

# Production stage
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

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

# Run nginx
USER nginx
CMD ["nginx", "-g", "daemon off;"]