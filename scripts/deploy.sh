#!/bin/bash

# Soladia Marketplace Deployment Script
# This script handles deployment to different environments

set -e

echo "🚀 Soladia Marketplace Deployment Script"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT="staging"
BUILD_TYPE="production"
SKIP_TESTS=false
SKIP_BUILD=false
FORCE_DEPLOY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build-type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV    Deployment environment (staging|production)"
            echo "  -b, --build-type TYPE   Build type (development|production)"
            echo "  --skip-tests           Skip running tests"
            echo "  --skip-build           Skip build process"
            echo "  --force                Force deployment without confirmation"
            echo "  -h, --help             Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
fi

# Validate build type
if [[ "$BUILD_TYPE" != "development" && "$BUILD_TYPE" != "production" ]]; then
    print_error "Invalid build type: $BUILD_TYPE. Must be 'development' or 'production'"
    exit 1
fi

# Check if we're in the project root
check_project_root() {
    if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Check Git status
check_git_status() {
    print_status "Checking Git status..."
    
    # Check if we're on a clean working directory
    if ! git diff-index --quiet HEAD --; then
        print_error "Working directory is not clean. Please commit or stash your changes."
        exit 1
    fi
    
    # Check if we're on the correct branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$ENVIRONMENT" == "production" && "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
        print_error "Production deployments must be from main/master branch"
        exit 1
    fi
    
    print_success "Git status check passed"
}

# Run pre-deployment tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        print_warning "Skipping tests as requested"
        return
    fi
    
    print_status "Running pre-deployment tests..."
    
    # Run quality checks
    ./scripts/quality-check.sh
    
    print_success "All tests passed"
}

# Build the application
build_application() {
    if [[ "$SKIP_BUILD" == true ]]; then
        print_warning "Skipping build as requested"
        return
    fi
    
    print_status "Building application for $BUILD_TYPE..."
    
    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Build backend (if needed)
    print_status "Building backend..."
    cd backend
    # Backend doesn't need building for Python, but we can run checks
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    python3 -m pip check
    cd ..
    
    print_success "Build completed"
}

# Deploy to staging
deploy_staging() {
    print_status "Deploying to staging environment..."
    
    # Use Docker Compose for staging
    if command -v docker-compose &> /dev/null; then
        print_status "Starting staging deployment with Docker Compose..."
        docker-compose -f docker-compose.yml up -d --build
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 30
        
        # Health check
        print_status "Running health checks..."
        if curl -f http://localhost:8000/health; then
            print_success "Backend health check passed"
        else
            print_error "Backend health check failed"
            exit 1
        fi
        
        if curl -f http://localhost:4321/; then
            print_success "Frontend health check passed"
        else
            print_error "Frontend health check failed"
            exit 1
        fi
        
        print_success "Staging deployment completed"
    else
        print_error "Docker Compose not available. Please install Docker Compose."
        exit 1
    fi
}

# Deploy to production
deploy_production() {
    print_status "Deploying to production environment..."
    
    # Use production Docker Compose
    if command -v docker-compose &> /dev/null; then
        print_status "Starting production deployment with Docker Compose..."
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 60
        
        # Health check
        print_status "Running health checks..."
        if curl -f http://localhost:8000/health; then
            print_success "Backend health check passed"
        else
            print_error "Backend health check failed"
            exit 1
        fi
        
        if curl -f http://localhost:4321/; then
            print_success "Frontend health check passed"
        else
            print_error "Frontend health check failed"
            exit 1
        fi
        
        print_success "Production deployment completed"
    else
        print_error "Docker Compose not available. Please install Docker Compose."
        exit 1
    fi
}

# Post-deployment tasks
post_deployment() {
    print_status "Running post-deployment tasks..."
    
    # Start monitoring
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "Starting monitoring services..."
        docker-compose -f docker-compose.monitoring.yml up -d
    fi
    
    # Send deployment notification (if configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        print_status "Sending deployment notification..."
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Soladia Marketplace deployed to $ENVIRONMENT environment\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    print_success "Post-deployment tasks completed"
}

# Main deployment function
main() {
    echo "🎯 Soladia Marketplace Deployment"
    echo "================================="
    echo "Environment: $ENVIRONMENT"
    echo "Build Type: $BUILD_TYPE"
    echo "Skip Tests: $SKIP_TESTS"
    echo "Skip Build: $SKIP_BUILD"
    echo "Force Deploy: $FORCE_DEPLOY"
    echo ""
    
    # Confirmation (unless forced)
    if [[ "$FORCE_DEPLOY" != true ]]; then
        read -p "Do you want to continue with the deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deployment cancelled"
            exit 0
        fi
    fi
    
    check_project_root
    check_git_status
    run_tests
    build_application
    
    # Deploy based on environment
    case $ENVIRONMENT in
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
    esac
    
    post_deployment
    
    print_success "🎉 Deployment to $ENVIRONMENT completed successfully!"
    echo ""
    echo "Deployment Summary:"
    echo "- Environment: $ENVIRONMENT"
    echo "- Build Type: $BUILD_TYPE"
    echo "- Frontend: http://localhost:4321"
    echo "- Backend API: http://localhost:8000"
    echo "- Health Check: http://localhost:8000/health"
    echo ""
    echo "Next steps:"
    echo "1. Verify the deployment is working correctly"
    echo "2. Monitor logs: docker-compose logs -f"
    echo "3. Check monitoring dashboard (if enabled)"
    echo ""
}

# Run main function
main "$@"