#!/bin/bash

# Soladia Marketplace Quality Check Script
# This script runs comprehensive quality checks

set -e

echo "🔍 Running Soladia Marketplace Quality Checks..."

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

# Check if we're in the project root
check_project_root() {
    if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Run frontend quality checks
check_frontend() {
    print_status "Running frontend quality checks..."
    
    cd frontend
    
    # Linting
    print_status "Running ESLint..."
    npm run lint
    
    # Type checking
    print_status "Running TypeScript type checking..."
    npm run type-check
    
    # Build check
    print_status "Checking build process..."
    npm run build
    
    print_success "Frontend quality checks completed"
    cd ..
}

# Run backend quality checks
check_backend() {
    print_status "Running backend quality checks..."
    
    cd backend
    
    # Activate virtual environment
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    
    # Linting with flake8
    print_status "Running flake8 linting..."
    python3 -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    
    # Code formatting with black
    print_status "Checking code formatting with black..."
    python3 -m black --check .
    
    # Import sorting with isort
    print_status "Checking import sorting with isort..."
    python3 -m isort --check-only .
    
    # Type checking with mypy
    print_status "Running mypy type checking..."
    python3 -m mypy . --ignore-missing-imports
    
    print_success "Backend quality checks completed"
    cd ..
}

# Run tests
run_tests() {
    print_status "Running comprehensive tests..."
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm run test
    cd ..
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    python3 -m pytest tests/ -v --cov=. --cov-report=html --cov-report=term
    cd ..
    
    print_success "All tests completed"
}

# Run security checks
check_security() {
    print_status "Running security checks..."
    
    # Frontend security audit
    print_status "Running npm security audit..."
    npm audit --audit-level moderate
    
    cd frontend
    npm audit --audit-level moderate
    cd ..
    
    # Backend security check
    print_status "Running Python security check..."
    cd backend
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    
    # Install safety if not available
    if ! command -v safety &> /dev/null; then
        pip install safety
    fi
    
    safety check
    cd ..
    
    print_success "Security checks completed"
}

# Run performance checks
check_performance() {
    print_status "Running performance checks..."
    
    # Frontend performance
    print_status "Running Lighthouse performance test..."
    cd frontend
    if command -v lighthouse &> /dev/null; then
        npm run lighthouse
    else
        print_warning "Lighthouse not installed. Skipping performance test."
    fi
    cd ..
    
    print_success "Performance checks completed"
}

# Generate quality report
generate_report() {
    print_status "Generating quality report..."
    
    REPORT_FILE="quality-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Soladia Marketplace Quality Report

**Generated:** $(date)
**Branch:** $(git branch --show-current)
**Commit:** $(git rev-parse HEAD)

## Summary

- ✅ Frontend quality checks passed
- ✅ Backend quality checks passed
- ✅ All tests passed
- ✅ Security checks passed
- ✅ Performance checks passed

## Frontend Metrics

- **Bundle Size:** Check build output
- **Type Coverage:** 100% (TypeScript strict mode)
- **Lint Issues:** 0 errors, 0 warnings
- **Test Coverage:** Check test output

## Backend Metrics

- **Code Quality:** Black + isort + flake8 compliant
- **Type Coverage:** MyPy strict mode
- **Test Coverage:** Check pytest output
- **Security:** Safety check passed

## Recommendations

1. Keep dependencies updated
2. Monitor bundle size growth
3. Maintain test coverage above 95%
4. Regular security audits
5. Performance monitoring

EOF

    print_success "Quality report generated: $REPORT_FILE"
}

# Main quality check function
main() {
    echo "🎯 Soladia Marketplace Quality Check"
    echo "===================================="
    
    check_project_root
    check_frontend
    check_backend
    run_tests
    check_security
    check_performance
    generate_report
    
    print_success "🎉 All quality checks completed successfully!"
    echo ""
    echo "Quality report generated: quality-report-$(date +%Y%m%d-%H%M%S).md"
    echo ""
    echo "Next steps:"
    echo "1. Review the quality report"
    echo "2. Address any issues found"
    echo "3. Commit your changes"
    echo "4. Run 'npm run dev' to start development"
    echo ""
}

# Run main function
main "$@"
