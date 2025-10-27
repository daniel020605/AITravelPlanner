# Docker Deployment Updates

This document summarizes the updates made to improve Docker deployment and Alibaba Cloud Container Registry integration.

## Files Updated

### 1. GitHub Actions Workflow (.github/workflows/docker-publish.yml)

Enhanced the existing workflow with:
- Support for Git tags and semantic versioning
- Improved tagging strategy with branch, PR, semver, and SHA tags
- Better error handling and documentation
- Multi-platform build support (linux/amd64)
- Docker layer caching for faster builds
- More detailed configuration instructions

### 2. Dockerfile

Improved the Dockerfile with:
- Better layer caching by installing dependencies first
- Proper user permissions for security
- Health check endpoint
- Explicit production dependency installation

### 3. Nginx Configuration (docker/nginx.conf)

Enhanced the nginx configuration with:
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Gzip compression for better performance
- Improved caching strategies for static assets
- Better error handling
- Security improvements (hidden nginx version, etc.)

### 4. Docker Compose (docker-compose.yml)

Added a docker-compose file for local testing:
- Simple configuration for local development
- Port mapping for easy access
- Basic networking setup

## New Documentation

### DOCKER_DEPLOYMENT.md

Created comprehensive documentation covering:
- Setting up Alibaba Cloud Container Registry
- Configuring GitHub Actions secrets and variables
- Manual deployment instructions
- Deployment to ECS and ACK
- Troubleshooting guide
- Security considerations

## Deployment Process

### Automated Deployment (GitHub Actions)

1. Push code to main branch or create a Git tag
2. GitHub Actions workflow automatically triggers
3. Docker image is built with appropriate tags
4. Image is pushed to Alibaba Cloud Container Registry
5. Tags include: latest, branch name, Git SHA, and semantic version (if applicable)

### Manual Deployment

1. Build the Docker image:
   ```bash
   docker build -t ai-travel-planner .
   ```

2. Tag for Alibaba Cloud Container Registry:
   ```bash
   docker tag ai-travel-planner registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
   ```

3. Push to ACR:
   ```bash
   docker login registry.cn-hangzhou.aliyuncs.com
   docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
   ```

## Configuration Requirements

### GitHub Repository Settings

Set the following **Secrets**:
- `ALIYUN_REGISTRY_USERNAME`: ACR username
- `ALIYUN_REGISTRY_PASSWORD`: ACR password or token

Set the following **Variables**:
- `ACR_REGISTRY`: ACR registry endpoint (e.g., registry.cn-hangzhou.aliyuncs.com)
- `ACR_NAMESPACE`: ACR namespace
- `ACR_IMAGE_NAME`: (Optional) Image name, defaults to ai-travel-planner

## Security Enhancements

1. Non-root user for nginx process
2. Security headers in nginx configuration
3. Proper file permissions
4. Health checks for container monitoring
5. Gzip compression with proper content types

## Performance Improvements

1. Docker layer caching
2. Gzip compression for static assets
3. Optimized caching headers
4. Multi-platform build support

## Testing

To test locally:
```bash
docker-compose up --build
```

Then access the application at http://localhost:8080

## Tagging Strategy

The workflow automatically generates tags based on:
- `latest` for the default branch
- Git branch names
- Git tags (semantic versioning)
- Git commit SHA (short format)
- Pull request numbers

This provides flexibility for deployment, rollback, and version management.