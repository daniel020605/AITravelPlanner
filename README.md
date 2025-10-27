# AITravelPlanner

This repository contains the AI Travel Planner project, a modern web application for intelligent travel planning.

## Project Structure

The main project is located in the [ai-travel-planner](ai-travel-planner) directory.

## Docker Deployment

This repository is configured for Docker deployment with the following files at the root level:
- [Dockerfile](Dockerfile) - Multi-stage Docker build configuration
- [docker-compose.yml](docker-compose.yml) - Docker Compose for local testing
- [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml) - GitHub Actions workflow for building and pushing to Alibaba Cloud Container Registry

## Quick Start

1. **Development**: Navigate to the [ai-travel-planner](ai-travel-planner) directory and follow the README there
2. **Docker Build**: From this root directory, run `docker build -t ai-travel-planner .`
3. **Local Testing**: Run `docker-compose up --build` to test locally
4. **Deployment**: The GitHub Actions workflow automatically builds and pushes to ACR on pushes to main branch

## Configuration

For GitHub Actions deployment to Alibaba Cloud Container Registry, set the following repository variables:
- `ACR_REGISTRY`: Your ACR endpoint (e.g., registry.cn-hangzhou.aliyuncs.com)
- `ACR_NAMESPACE`: Your ACR namespace
- `ACR_IMAGE_NAME`: (Optional) Defaults to ai-travel-planner

And the following repository secrets:
- `ALIYUN_REGISTRY_USERNAME`: Your ACR username
- `ALIYUN_REGISTRY_PASSWORD`: Your ACR password or token