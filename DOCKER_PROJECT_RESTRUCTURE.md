# Docker Project Restructure

This document explains the changes made to restructure the project for proper Docker deployment from the Git repository root.

## Problem

The original project structure had the following issues:
1. Dockerfile was located in a subdirectory (`ai-travel-planner/`) rather than the Git repository root
2. GitHub Actions workflow was in a subdirectory and couldn't be triggered properly
3. Docker build context paths were incorrect for the repository structure

## Solution

Files have been restructured as follows:

### Files Moved to Repository Root

1. **Dockerfile** - Moved from `ai-travel-planner/Dockerfile` to repository root
2. **docker-compose.yml** - Moved from `ai-travel-planner/docker-compose.yml` to repository root
3. **GitHub Actions Workflow** - Created `.github/workflows/docker-publish.yml` in repository root

### Path Updates

All file paths in the Dockerfile have been updated to reflect the new build context:
- `ai-travel-planner/package.json` instead of `package.json`
- `ai-travel-planner/src` instead of `src`
- `ai-travel-planner/public` instead of `public`
- And so on for all copied files

## New Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── docker-publish.yml
├── ai-travel-planner/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ... (other project files)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## GitHub Actions Configuration

The workflow will now properly trigger on:
- Pushes to the main branch
- Git tags (for versioned releases)
- Pull requests to main branch
- Manual workflow dispatch

## Required GitHub Configuration

Set the following **Repository Variables** in GitHub:
- `ACR_REGISTRY`: Your Alibaba Cloud Container Registry endpoint
- `ACR_NAMESPACE`: Your ACR namespace
- `ACR_IMAGE_NAME`: (Optional) Image name, defaults to `ai-travel-planner`

Set the following **Repository Secrets** in GitHub:
- `ALIYUN_REGISTRY_USERNAME`: Your ACR username
- `ALIYUN_REGISTRY_PASSWORD`: Your ACR password or access token

## Local Testing

To test locally with docker-compose:
```bash
docker-compose up --build
```

The application will be available at http://localhost:8080

## Docker Build

To build the Docker image manually:
```bash
docker build -t ai-travel-planner .
```

## Benefits

1. **Proper GitHub Actions Integration**: Workflow now triggers correctly
2. **Correct Docker Build Context**: All paths are relative to repository root
3. **Simplified Deployment**: No path confusion for CI/CD
4. **Maintained Project Structure**: Original project organization preserved
5. **Backward Compatibility**: Existing development workflow unchanged

## Notes

- The original files in the `ai-travel-planner/` directory have been preserved
- Development can continue as before within the `ai-travel-planner/` directory
- Only deployment-related files have been moved to the repository root
- The Docker build process now correctly references all project files