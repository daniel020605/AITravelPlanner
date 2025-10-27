# Docker Deployment to Alibaba Cloud Container Registry (ACR)

This document explains how to build and deploy the AI Travel Planner application to Alibaba Cloud Container Registry using GitHub Actions.

## Prerequisites

1. An Alibaba Cloud account
2. An Alibaba Cloud Container Registry instance
3. A namespace in your ACR instance
4. Access credentials (username and password/token)

## Setting Up Alibaba Cloud Container Registry

### 1. Create ACR Instance
1. Log in to the [Alibaba Cloud Console](https://home.console.aliyun.com/)
2. Navigate to Container Registry (CR)
3. Create a new instance or use an existing one
4. Note the registry endpoint (e.g., `registry.cn-hangzhou.aliyuncs.com`)

### 2. Create Namespace
1. In the ACR console, go to "Namespaces"
2. Create a new namespace for your project (e.g., `ai-travel-planner`)

### 3. Create Access Credentials
1. In the ACR console, go to "Access Credentials"
2. Create a permanent password or use a temporary token
3. Note the username and password

## GitHub Actions Configuration

### 1. Repository Secrets
Set the following secrets in your GitHub repository:
1. Go to your repository Settings > Secrets and variables > Actions
2. Add the following secrets:
   - `ALIYUN_REGISTRY_USERNAME`: Your ACR username
   - `ALIYUN_REGISTRY_PASSWORD`: Your ACR password or token

### 2. Repository Variables
Set the following variables in your GitHub repository:
1. Go to your repository Settings > Secrets and variables > Actions
2. Add the following variables:
   - `ACR_REGISTRY`: Your ACR registry endpoint (e.g., `registry.cn-hangzhou.aliyuncs.com`)
   - `ACR_NAMESPACE`: Your ACR namespace (e.g., `ai-travel-planner`)
   - `ACR_IMAGE_NAME`: Optional, defaults to `ai-travel-planner`

## Workflow Details

The GitHub Actions workflow (`.github/workflows/docker-publish.yml`) performs the following steps:

1. **Build Trigger**: Runs on push to main branch, tags, pull requests, or manual trigger
2. **Environment Setup**: Sets up Docker Buildx and QEMU for multi-platform builds
3. **Metadata Generation**: Creates Docker image tags based on Git refs and semver
4. **Authentication**: Logs into Alibaba Cloud Container Registry
5. **Build and Push**: Builds the Docker image and pushes it to ACR

### Image Tagging Strategy

The workflow automatically generates tags based on:
- Git branch names
- Git tags (semantic versioning)
- Git commit SHA
- `latest` tag for the default branch

## Manual Deployment

If you want to build and push the Docker image manually:

### Build the Image
```bash
docker build -t ai-travel-planner .
```

### Tag for ACR
```bash
docker tag ai-travel-planner registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

### Push to ACR
```bash
# Login to ACR
docker login registry.cn-hangzhou.aliyuncs.com

# Push the image
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

## Deploying to Alibaba Cloud ECS or ACK

### Using ECS
1. Create an ECS instance
2. Install Docker on the ECS instance
3. Pull and run the image:
   ```bash
   docker login registry.cn-hangzhou.aliyuncs.com
   docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
   docker run -d -p 80:80 registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
   ```

### Using ACK (Alibaba Cloud Kubernetes Service)
1. Create an ACK cluster
2. Create a Kubernetes deployment:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: ai-travel-planner
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: ai-travel-planner
     template:
       metadata:
         labels:
           app: ai-travel-planner
       spec:
         containers:
         - name: ai-travel-planner
           image: registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
           ports:
           - containerPort: 80
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: ai-travel-planner-service
   spec:
     selector:
       app: ai-travel-planner
     ports:
     - protocol: TCP
       port: 80
       targetPort: 80
     type: LoadBalancer
   ```

## Troubleshooting

### Common Issues

1. **Authentication Failed**: 
   - Verify your ACR credentials are correct
   - Ensure the user has push permissions to the namespace

2. **Build Failures**:
   - Check the Dockerfile syntax
   - Ensure all dependencies are correctly specified

3. **Push Failures**:
   - Verify the registry endpoint and namespace are correct
   - Check if you have sufficient quota in your ACR instance

### Debugging Steps

1. Run the workflow with `workflow_dispatch` to test manually
2. Check the GitHub Actions logs for detailed error messages
3. Test the Docker build locally before pushing

## Security Considerations

1. Use temporary tokens instead of permanent passwords when possible
2. Restrict permissions for the ACR user to only what's needed
3. Regularly rotate credentials
4. Use private repositories for sensitive applications