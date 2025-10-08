#!/bin/bash

# Soladia Marketplace Development Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up Soladia Marketplace Development Environment..."

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

# Check if required tools are installed
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [[ $(echo "$NODE_VERSION 18.0.0" | tr " " "\n" | sort -V | head -n1) != "18.0.0" ]]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python >= 3.11"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    if [[ $(echo "$PYTHON_VERSION 3.11.0" | tr " " "\n" | sort -V | head -n1) != "3.11.0" ]]; then
        print_error "Python version $PYTHON_VERSION is too old. Please install Python >= 3.11"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Some features may not work without Docker."
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git"
        exit 1
    fi
    
    print_success "System requirements check completed"
}

# Install root dependencies
install_root_dependencies() {
    print_status "Installing root dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the project root?"
        exit 1
    fi
    
    npm install
    print_success "Root dependencies installed"
}

# Install frontend dependencies
install_frontend_dependencies() {
    print_status "Installing frontend dependencies..."
    
    cd frontend
    
    if [ ! -f "package.json" ]; then
        print_error "Frontend package.json not found"
        exit 1
    fi
    
    npm install
    print_success "Frontend dependencies installed"
    
    cd ..
}

# Install backend dependencies
install_backend_dependencies() {
    print_status "Installing backend dependencies..."
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv .venv
    fi
    
    # Activate virtual environment
    source .venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install dependencies
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    elif [ -f "pyproject.toml" ]; then
        pip install -e .
        pip install -e ".[dev,test]"
    else
        print_error "No requirements file found in backend directory"
        exit 1
    fi
    
    print_success "Backend dependencies installed"
    
    cd ..
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Environment file created from example"
            print_warning "Please update .env file with your actual configuration"
        else
            print_warning "No environment example file found"
        fi
    else
        print_status "Environment file already exists"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if Docker is available
    if command -v docker &> /dev/null; then
        print_status "Starting database with Docker..."
        docker-compose up -d postgres redis
        
        # Wait for database to be ready
        print_status "Waiting for database to be ready..."
        sleep 10
        
        # Run database migrations
        cd backend
        source .venv/bin/activate
        alembic upgrade head
        print_success "Database migrations completed"
        cd ..
    else
        print_warning "Docker not available. Please set up PostgreSQL and Redis manually"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    # Install pre-commit if available
    if command -v pre-commit &> /dev/null; then
        pre-commit install
        print_success "Git hooks installed"
    else
        print_warning "pre-commit not installed. Skipping Git hooks setup"
    fi
}

# Run initial tests
run_initial_tests() {
    print_status "Running initial tests..."
    
    # Test frontend
    cd frontend
    npm run lint
    npm run type-check
    print_success "Frontend tests passed"
    cd ..
    
    # Test backend
    cd backend
    source .venv/bin/activate
    python -m pytest tests/ -v --tb=short
    print_success "Backend tests passed"
    cd ..
}

# Main setup function
main() {
    echo "🎯 Soladia Marketplace Development Setup"
    echo "========================================"
    
    check_requirements
    install_root_dependencies
    install_frontend_dependencies
    install_backend_dependencies
    setup_environment
    setup_database
    setup_git_hooks
    
    print_success "🎉 Development environment setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env file with your configuration"
    echo "2. Run 'npm run dev' to start the development servers"
    echo "3. Visit http://localhost:4321 for frontend"
    echo "4. Visit http://localhost:8001 for backend API"
    echo ""
    echo "Available commands:"
    echo "- npm run dev          # Start development servers"
    echo "- npm run test         # Run all tests"
    echo "- npm run lint         # Run linting"
    echo "- npm run build        # Build for production"
    echo "- npm run docker:up    # Start Docker services"
    echo ""
}

# Run main function
main "$@"
