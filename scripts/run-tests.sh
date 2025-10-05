#!/bin/bash

# Comprehensive Test Runner for Soladia Marketplace
# This script runs all tests: unit, integration, e2e, and performance tests

set -e

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies if needed
install_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists python3; then
        print_error "Python 3 is not installed. Please install Python 3 first."
        exit 1
    fi
    
    if ! command_exists pip; then
        print_error "pip is not installed. Please install pip first."
        exit 1
    fi
    
    # Install frontend dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Install backend dependencies
    if [ ! -d "backend/venv" ]; then
        print_status "Installing backend dependencies..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
    fi
    
    # Install Playwright browsers
    if ! command_exists playwright; then
        print_status "Installing Playwright..."
        npx playwright install
    fi
}

# Function to run frontend unit tests
run_frontend_tests() {
    print_status "Running frontend unit tests..."
    
    cd frontend
    
    # Run Vitest tests
    if command_exists npx; then
        npx vitest run --coverage
        if [ $? -eq 0 ]; then
            print_success "Frontend unit tests passed"
        else
            print_error "Frontend unit tests failed"
            exit 1
        fi
    else
        print_error "npx not found. Please install npm."
        exit 1
    fi
    
    cd ..
}

# Function to run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    
    cd backend
    
    # Activate virtual environment
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # Run pytest tests
    if command_exists pytest; then
        pytest tests/ -v --cov=. --cov-report=html --cov-report=term
        if [ $? -eq 0 ]; then
            print_success "Backend tests passed"
        else
            print_error "Backend tests failed"
            exit 1
        fi
    else
        print_error "pytest not found. Please install pytest."
        exit 1
    fi
    
    cd ..
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    cd backend
    
    # Activate virtual environment
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # Run integration tests
    pytest tests/test_integration.py -v
    if [ $? -eq 0 ]; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        exit 1
    fi
    
    cd ..
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    # Start backend server in background
    print_status "Starting backend server..."
    cd backend
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    python main.py &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 5
    
    # Start frontend server in background
    print_status "Starting frontend server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    sleep 10
    
    # Run Playwright tests
    if command_exists npx; then
        npx playwright test tests/e2e/ --reporter=html
        if [ $? -eq 0 ]; then
            print_success "E2E tests passed"
        else
            print_error "E2E tests failed"
            # Clean up background processes
            kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
            exit 1
        fi
    else
        print_error "npx not found. Please install npm."
        # Clean up background processes
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Clean up background processes
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Run Lighthouse CI
    if command_exists npx; then
        npx lighthouse-ci autorun
        if [ $? -eq 0 ]; then
            print_success "Performance tests passed"
        else
            print_warning "Performance tests failed or not configured"
        fi
    else
        print_warning "Lighthouse CI not available"
    fi
}

# Function to run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    # Run npm audit
    if command_exists npm; then
        npm audit --audit-level moderate
        if [ $? -eq 0 ]; then
            print_success "No security vulnerabilities found"
        else
            print_warning "Security vulnerabilities found"
        fi
    fi
    
    # Run Python security check
    if command_exists safety; then
        cd backend
        if [ -d "venv" ]; then
            source venv/bin/activate
        fi
        safety check
        if [ $? -eq 0 ]; then
            print_success "No Python security vulnerabilities found"
        else
            print_warning "Python security vulnerabilities found"
        fi
        cd ..
    else
        print_warning "Safety not installed. Install with: pip install safety"
    fi
}

# Function to generate test report
generate_test_report() {
    print_status "Generating test report..."
    
    # Create reports directory
    mkdir -p reports
    
    # Copy coverage reports
    if [ -d "frontend/coverage" ]; then
        cp -r frontend/coverage reports/frontend-coverage
    fi
    
    if [ -d "backend/htmlcov" ]; then
        cp -r backend/htmlcov reports/backend-coverage
    fi
    
    # Copy Playwright report
    if [ -d "test-results" ]; then
        cp -r test-results reports/playwright-report
    fi
    
    print_success "Test report generated in reports/ directory"
}

# Function to clean up test artifacts
cleanup() {
    print_status "Cleaning up test artifacts..."
    
    # Remove test databases
    rm -f test.db
    rm -f backend/test.db
    
    # Remove coverage files
    rm -rf frontend/coverage
    rm -rf backend/htmlcov
    rm -rf backend/.coverage
    
    # Remove test results
    rm -rf test-results
    rm -rf playwright-report
    
    print_success "Cleanup completed"
}

# Main function
main() {
    print_status "Starting Soladia Marketplace Test Suite"
    print_status "======================================"
    
    # Parse command line arguments
    RUN_UNIT=true
    RUN_INTEGRATION=true
    RUN_E2E=true
    RUN_PERFORMANCE=false
    RUN_SECURITY=false
    CLEANUP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                RUN_INTEGRATION=false
                RUN_E2E=false
                shift
                ;;
            --integration-only)
                RUN_UNIT=false
                RUN_E2E=false
                shift
                ;;
            --e2e-only)
                RUN_UNIT=false
                RUN_INTEGRATION=false
                shift
                ;;
            --performance)
                RUN_PERFORMANCE=true
                shift
                ;;
            --security)
                RUN_SECURITY=true
                shift
                ;;
            --cleanup)
                CLEANUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --unit-only        Run only unit tests"
                echo "  --integration-only Run only integration tests"
                echo "  --e2e-only         Run only E2E tests"
                echo "  --performance      Run performance tests"
                echo "  --security         Run security tests"
                echo "  --cleanup          Clean up test artifacts"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Install dependencies
    install_dependencies
    
    # Run tests based on flags
    if [ "$RUN_UNIT" = true ]; then
        run_frontend_tests
        run_backend_tests
    fi
    
    if [ "$RUN_INTEGRATION" = true ]; then
        run_integration_tests
    fi
    
    if [ "$RUN_E2E" = true ]; then
        run_e2e_tests
    fi
    
    if [ "$RUN_PERFORMANCE" = true ]; then
        run_performance_tests
    fi
    
    if [ "$RUN_SECURITY" = true ]; then
        run_security_tests
    fi
    
    # Generate test report
    generate_test_report
    
    # Cleanup if requested
    if [ "$CLEANUP" = true ]; then
        cleanup
    fi
    
    print_success "All tests completed successfully!"
    print_status "Test reports available in reports/ directory"
}

# Run main function
main "$@"
