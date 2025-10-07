#!/bin/bash

# Soladia Marketplace Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
PROJECT_NAME="soladia-marketplace"
REGISTRY="your-registry.com"
NAMESPACE="soladia"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    fi
    
    if ! command -v helm &> /dev/null; then
        missing_deps+=("helm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -t ${REGISTRY}/${PROJECT_NAME}-frontend:${VERSION} \
        -f docker/frontend.Dockerfile \
        frontend/
    
    # Build backend image
    log_info "Building backend image..."
    docker build -t ${REGISTRY}/${PROJECT_NAME}-backend:${VERSION} \
        -f docker/backend.Dockerfile \
        backend/
    
    log_success "Docker images built successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Run unit tests
    log_info "Running unit tests..."
    docker-compose -f docker-compose.test.yml up --abort-on-container-exit
    
    # Check test results
    if [ $? -ne 0 ]; then
        log_error "Tests failed"
        exit 1
    fi
    
    log_success "All tests passed"
}

# Push images to registry
push_images() {
    log_info "Pushing images to registry..."
    
    # Push frontend image
    docker push ${REGISTRY}/${PROJECT_NAME}-frontend:${VERSION}
    
    # Push backend image
    docker push ${REGISTRY}/${PROJECT_NAME}-backend:${VERSION}
    
    log_success "Images pushed to registry"
}

# Deploy to Kubernetes
deploy_k8s() {
    log_info "Deploying to Kubernetes..."
    
    # Update image tags in deployment files
    sed -i "s|IMAGE_TAG|${VERSION}|g" k8s/*.yaml
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/service.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/${PROJECT_NAME}-backend -n ${NAMESPACE}
    kubectl rollout status deployment/${PROJECT_NAME}-frontend -n ${NAMESPACE}
    
    log_success "Deployment completed"
}

# Deploy with Helm
deploy_helm() {
    log_info "Deploying with Helm..."
    
    # Update Helm values
    sed -i "s|imageTag: .*|imageTag: ${VERSION}|g" helm/soladia/values-${ENVIRONMENT}.yaml
    
    # Deploy with Helm
    helm upgrade --install ${PROJECT_NAME} helm/soladia \
        --namespace ${NAMESPACE} \
        --values helm/soladia/values-${ENVIRONMENT}.yaml \
        --wait
    
    log_success "Helm deployment completed"
}

# Run health checks
health_check() {
    log_info "Running health checks..."
    
    # Get service URL
    local service_url=$(kubectl get ingress ${PROJECT_NAME}-ingress -n ${NAMESPACE} -o jsonpath='{.spec.rules[0].host}')
    
    if [ -z "$service_url" ]; then
        log_error "Could not get service URL"
        return 1
    fi
    
    # Check frontend health
    local frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://${service_url}/)
    if [ "$frontend_health" != "200" ]; then
        log_error "Frontend health check failed: HTTP $frontend_health"
        return 1
    fi
    
    # Check backend health
    local backend_health=$(curl -s -o /dev/null -w "%{http_code}" http://${service_url}/api/health)
    if [ "$backend_health" != "200" ]; then
        log_error "Backend health check failed: HTTP $backend_health"
        return 1
    fi
    
    log_success "Health checks passed"
}

# Rollback deployment
rollback() {
    log_info "Rolling back deployment..."
    
    # Rollback Kubernetes deployment
    kubectl rollout undo deployment/${PROJECT_NAME}-backend -n ${NAMESPACE}
    kubectl rollout undo deployment/${PROJECT_NAME}-frontend -n ${NAMESPACE}
    
    # Wait for rollback to complete
    kubectl rollout status deployment/${PROJECT_NAME}-backend -n ${NAMESPACE}
    kubectl rollout status deployment/${PROJECT_NAME}-frontend -n ${NAMESPACE}
    
    log_success "Rollback completed"
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old images..."
    
    # Remove old images (keep last 5 versions)
    docker images ${REGISTRY}/${PROJECT_NAME}-frontend --format "table {{.Tag}}" | \
        grep -v "latest" | sort -V | head -n -5 | \
        xargs -I {} docker rmi ${REGISTRY}/${PROJECT_NAME}-frontend:{} || true
    
    docker images ${REGISTRY}/${PROJECT_NAME}-backend --format "table {{.Tag}}" | \
        grep -v "latest" | sort -V | head -n -5 | \
        xargs -I {} docker rmi ${REGISTRY}/${PROJECT_NAME}-backend:{} || true
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment to ${ENVIRONMENT} environment with version ${VERSION}"
    
    # Check dependencies
    check_dependencies
    
    # Build images
    build_images
    
    # Run tests
    run_tests
    
    # Push images
    push_images
    
    # Deploy based on environment
    case $ENVIRONMENT in
        "staging")
            deploy_k8s
            ;;
        "production")
            deploy_helm
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Run health checks
    if ! health_check; then
        log_error "Health checks failed, rolling back..."
        rollback
        exit 1
    fi
    
    # Cleanup old images
    cleanup
    
    log_success "Deployment to ${ENVIRONMENT} completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        main
        ;;
esac


