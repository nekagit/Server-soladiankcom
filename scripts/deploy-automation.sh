#!/bin/bash

# Soladia Deployment Automation Script
# This script automates the deployment of the Soladia marketplace

set -e  # Exit on any error

# Configuration
PROJECT_NAME="soladia-marketplace"
DOCKER_REGISTRY="your-registry.com"
DOCKER_IMAGE_TAG="${1:-latest}"
ENVIRONMENT="${2:-production}"
KUBERNETES_NAMESPACE="soladia-${ENVIRONMENT}"
HELM_RELEASE_NAME="soladia"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    local tools=("docker" "kubectl" "helm" "git" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi
    
    # Check if helm is initialized
    if ! helm list &> /dev/null; then
        log_warning "Helm is not initialized, initializing..."
        helm init --wait
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -f frontend/Dockerfile.prod -t "${DOCKER_REGISTRY}/${PROJECT_NAME}-frontend:${DOCKER_IMAGE_TAG}" frontend/
    
    # Build backend image
    log_info "Building backend image..."
    docker build -f backend/Dockerfile.prod -t "${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${DOCKER_IMAGE_TAG}" backend/
    
    # Build mobile image (if needed)
    if [ -f "mobile/Dockerfile" ]; then
        log_info "Building mobile image..."
        docker build -f mobile/Dockerfile -t "${DOCKER_REGISTRY}/${PROJECT_NAME}-mobile:${DOCKER_IMAGE_TAG}" mobile/
    fi
    
    log_success "Docker images built successfully"
}

# Push images to registry
push_images() {
    log_info "Pushing images to registry..."
    
    # Push frontend image
    docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}-frontend:${DOCKER_IMAGE_TAG}"
    
    # Push backend image
    docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${DOCKER_IMAGE_TAG}"
    
    # Push mobile image (if exists)
    if docker image inspect "${DOCKER_REGISTRY}/${PROJECT_NAME}-mobile:${DOCKER_IMAGE_TAG}" &> /dev/null; then
        docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}-mobile:${DOCKER_IMAGE_TAG}"
    fi
    
    log_success "Images pushed to registry successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Frontend tests
    if [ -d "frontend" ]; then
        log_info "Running frontend tests..."
        cd frontend
        if [ -f "package.json" ]; then
            npm ci
            npm run test:ci || {
                log_error "Frontend tests failed"
                exit 1
            }
        fi
        cd ..
    fi
    
    # Backend tests
    if [ -d "backend" ]; then
        log_info "Running backend tests..."
        cd backend
        if [ -f "requirements.txt" ]; then
            python -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
            python -m pytest tests/ -v || {
                log_error "Backend tests failed"
                exit 1
            }
            deactivate
        fi
        cd ..
    fi
    
    # E2E tests
    if [ -f "playwright.config.ts" ]; then
        log_info "Running E2E tests..."
        npx playwright install
        npx playwright test || {
            log_error "E2E tests failed"
            exit 1
        }
    fi
    
    log_success "All tests passed"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace "${KUBERNETES_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes manifests
    if [ -d "k8s" ]; then
        log_info "Applying Kubernetes manifests..."
        
        # Update image tags in manifests
        find k8s -name "*.yaml" -exec sed -i "s|image: .*|image: ${DOCKER_REGISTRY}/${PROJECT_NAME}-frontend:${DOCKER_IMAGE_TAG}|g" {} \;
        find k8s -name "*.yaml" -exec sed -i "s|image: .*|image: ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${DOCKER_IMAGE_TAG}|g" {} \;
        
        # Apply manifests
        kubectl apply -f k8s/ -n "${KUBERNETES_NAMESPACE}"
    fi
    
    # Deploy with Helm (if chart exists)
    if [ -d "helm" ]; then
        log_info "Deploying with Helm..."
        
        # Update values.yaml with image tags
        if [ -f "helm/values.yaml" ]; then
            yq eval ".image.tag = \"${DOCKER_IMAGE_TAG}\"" -i helm/values.yaml
            yq eval ".image.repository = \"${DOCKER_REGISTRY}/${PROJECT_NAME}\"" -i helm/values.yaml
        fi
        
        # Deploy with Helm
        helm upgrade --install "${HELM_RELEASE_NAME}" helm/ \
            --namespace "${KUBERNETES_NAMESPACE}" \
            --set image.tag="${DOCKER_IMAGE_TAG}" \
            --set image.repository="${DOCKER_REGISTRY}/${PROJECT_NAME}" \
            --wait --timeout=10m
    fi
    
    log_success "Deployment to Kubernetes completed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    kubectl wait --for=condition=ready pod -l app=postgres -n "${KUBERNETES_NAMESPACE}" --timeout=300s
    
    # Run migrations
    kubectl exec -n "${KUBERNETES_NAMESPACE}" deployment/soladia-backend -- python -m alembic upgrade head
    
    log_success "Database migrations completed"
}

# Health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Get service URLs
    local frontend_url
    local backend_url
    
    if kubectl get service soladia-frontend -n "${KUBERNETES_NAMESPACE}" &> /dev/null; then
        frontend_url=$(kubectl get service soladia-frontend -n "${KUBERNETES_NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        if [ -z "$frontend_url" ]; then
            frontend_url="localhost:$(kubectl get service soladia-frontend -n "${KUBERNETES_NAMESPACE}" -o jsonpath='{.spec.ports[0].nodePort}')"
        fi
    fi
    
    if kubectl get service soladia-backend -n "${KUBERNETES_NAMESPACE}" &> /dev/null; then
        backend_url=$(kubectl get service soladia-backend -n "${KUBERNETES_NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        if [ -z "$backend_url" ]; then
            backend_url="localhost:$(kubectl get service soladia-backend -n "${KUBERNETES_NAMESPACE}" -o jsonpath='{.spec.ports[0].nodePort}')"
        fi
    fi
    
    # Check backend health
    if [ -n "$backend_url" ]; then
        log_info "Checking backend health..."
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -f "http://${backend_url}/health" &> /dev/null; then
                log_success "Backend health check passed"
                break
            else
                log_info "Backend health check attempt $attempt/$max_attempts failed, retrying in 10s..."
                sleep 10
                ((attempt++))
            fi
        done
        
        if [ $attempt -gt $max_attempts ]; then
            log_error "Backend health check failed after $max_attempts attempts"
            exit 1
        fi
    fi
    
    # Check frontend health
    if [ -n "$frontend_url" ]; then
        log_info "Checking frontend health..."
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -f "http://${frontend_url}" &> /dev/null; then
                log_success "Frontend health check passed"
                break
            else
                log_info "Frontend health check attempt $attempt/$max_attempts failed, retrying in 10s..."
                sleep 10
                ((attempt++))
            fi
        done
        
        if [ $attempt -gt $max_attempts ]; then
            log_error "Frontend health check failed after $max_attempts attempts"
            exit 1
        fi
    fi
    
    log_success "All health checks passed"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    if helm list -n "${KUBERNETES_NAMESPACE}" | grep -q "${HELM_RELEASE_NAME}"; then
        helm rollback "${HELM_RELEASE_NAME}" -n "${KUBERNETES_NAMESPACE}"
        log_success "Helm rollback completed"
    else
        log_warning "No Helm release found, skipping Helm rollback"
    fi
    
    # Rollback Kubernetes deployments
    kubectl rollout undo deployment/soladia-frontend -n "${KUBERNETES_NAMESPACE}" || true
    kubectl rollout undo deployment/soladia-backend -n "${KUBERNETES_NAMESPACE}" || true
    
    log_success "Rollback completed"
}

# Cleanup old resources
cleanup_old_resources() {
    log_info "Cleaning up old resources..."
    
    # Remove old images from registry (keep last 5 tags)
    # This would be registry-specific implementation
    
    # Clean up old Kubernetes resources
    kubectl delete pods --field-selector=status.phase=Succeeded -n "${KUBERNETES_NAMESPACE}" || true
    kubectl delete pods --field-selector=status.phase=Failed -n "${KUBERNETES_NAMESPACE}" || true
    
    log_success "Cleanup completed"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Soladia Deployment ${status}: ${message}\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    # Email notification
    if [ -n "$EMAIL_RECIPIENTS" ] && [ -n "$SMTP_SERVER" ]; then
        echo "Soladia Deployment ${status}: ${message}" | \
            mail -s "Soladia Deployment ${status}" "$EMAIL_RECIPIENTS" || true
    fi
}

# Main deployment function
main() {
    log_info "Starting Soladia deployment automation..."
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Image tag: ${DOCKER_IMAGE_TAG}"
    log_info "Namespace: ${KUBERNETES_NAMESPACE}"
    
    # Set up error handling
    trap 'log_error "Deployment failed, rolling back..."; rollback_deployment; send_notifications "FAILED" "Deployment failed and was rolled back"; exit 1' ERR
    
    # Run deployment steps
    check_prerequisites
    run_tests
    build_images
    push_images
    deploy_to_kubernetes
    run_migrations
    run_health_checks
    cleanup_old_resources
    
    # Send success notification
    send_notifications "SUCCESS" "Deployment completed successfully"
    
    log_success "Soladia deployment completed successfully!"
    log_info "Frontend URL: http://${frontend_url:-'not available'}"
    log_info "Backend URL: http://${backend_url:-'not available'}"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback_deployment
        send_notifications "ROLLBACK" "Deployment was rolled back"
        ;;
    "health")
        run_health_checks
        ;;
    "cleanup")
        cleanup_old_resources
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|cleanup} [image_tag] [environment]"
        echo "  deploy   - Deploy the application (default)"
        echo "  rollback - Rollback the deployment"
        echo "  health   - Run health checks"
        echo "  cleanup  - Cleanup old resources"
        exit 1
        ;;
esac
