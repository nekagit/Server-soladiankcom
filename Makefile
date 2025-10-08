# Soladia Marketplace Makefile
# Provides convenient commands for development and deployment

.PHONY: help install dev build test lint format clean docker-up docker-down deploy

# Default target
help: ## Show this help message
	@echo "Soladia Marketplace - Available Commands"
	@echo "========================================"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation
install: ## Install all dependencies
	@echo "Installing dependencies..."
	npm install
	cd frontend && npm install
	cd backend && python3 -m pip install --upgrade pip && pip install -r requirements.txt

install-dev: ## Install development dependencies
	@echo "Installing development dependencies..."
	npm install
	cd frontend && npm install
	cd backend && python3 -m pip install --upgrade pip && pip install -r requirements.txt && pip install -e ".[dev,test]"

# Development
dev: ## Start development servers
	@echo "Starting development servers..."
	npm run dev

dev-frontend: ## Start frontend development server
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

dev-backend: ## Start backend development server
	@echo "Starting backend development server..."
	cd backend && python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Building
build: ## Build the entire application
	@echo "Building application..."
	npm run build

build-frontend: ## Build frontend
	@echo "Building frontend..."
	cd frontend && npm run build

build-backend: ## Build backend
	@echo "Building backend..."
	cd backend && echo "Backend build completed"

# Testing
test: ## Run all tests
	@echo "Running all tests..."
	npm run test

test-frontend: ## Run frontend tests
	@echo "Running frontend tests..."
	cd frontend && npm run test

test-backend: ## Run backend tests
	@echo "Running backend tests..."
	cd backend && python3 -m pytest tests/ -v

test-e2e: ## Run end-to-end tests
	@echo "Running E2E tests..."
	cd frontend && npm run test:e2e

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	npm run test:coverage

# Code Quality
lint: ## Run linting
	@echo "Running linting..."
	npm run lint

lint-frontend: ## Run frontend linting
	@echo "Running frontend linting..."
	cd frontend && npm run lint

lint-backend: ## Run backend linting
	@echo "Running backend linting..."
	cd backend && python3 -m flake8 . && python3 -m black --check . && python3 -m isort --check-only .

format: ## Format code
	@echo "Formatting code..."
	npm run format

format-frontend: ## Format frontend code
	@echo "Formatting frontend code..."
	cd frontend && npm run format

format-backend: ## Format backend code
	@echo "Formatting backend code..."
	cd backend && python3 -m black . && python3 -m isort .

type-check: ## Run type checking
	@echo "Running type checking..."
	npm run type-check

# Database
db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	cd backend && alembic upgrade head

db-reset: ## Reset database
	@echo "Resetting database..."
	cd backend && alembic downgrade base && alembic upgrade head

db-seed: ## Seed database with sample data
	@echo "Seeding database..."
	cd backend && python3 scripts/seed_database.py

# Docker
docker-up: ## Start Docker services
	@echo "Starting Docker services..."
	docker-compose up -d

docker-down: ## Stop Docker services
	@echo "Stopping Docker services..."
	docker-compose down

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	docker-compose build

docker-logs: ## View Docker logs
	@echo "Viewing Docker logs..."
	docker-compose logs -f

docker-prod: ## Start production Docker services
	@echo "Starting production Docker services..."
	docker-compose -f docker-compose.prod.yml up -d

# Security
security-audit: ## Run security audit
	@echo "Running security audit..."
	npm run security:audit

security-fix: ## Fix security issues
	@echo "Fixing security issues..."
	npm run security:fix

# Performance
performance-test: ## Run performance tests
	@echo "Running performance tests..."
	npm run performance:test

lighthouse: ## Run Lighthouse performance test
	@echo "Running Lighthouse test..."
	cd frontend && npm run lighthouse

# Monitoring
monitor: ## Start monitoring services
	@echo "Starting monitoring services..."
	docker-compose -f docker-compose.monitoring.yml up -d

# Deployment
deploy-staging: ## Deploy to staging
	@echo "Deploying to staging..."
	./scripts/deploy.sh --environment staging

deploy-production: ## Deploy to production
	@echo "Deploying to production..."
	./scripts/deploy.sh --environment production

# Quality Check
quality-check: ## Run comprehensive quality check
	@echo "Running quality check..."
	./scripts/quality-check.sh

# Cleanup
clean: ## Clean build artifacts and dependencies
	@echo "Cleaning up..."
	npm run clean
	docker system prune -f

clean-deps: ## Clean dependencies
	@echo "Cleaning dependencies..."
	rm -rf node_modules frontend/node_modules backend/__pycache__ backend/.pytest_cache

# Setup
setup: ## Setup development environment
	@echo "Setting up development environment..."
	./scripts/dev-setup.sh

# Documentation
docs-serve: ## Serve documentation
	@echo "Serving documentation..."
	npm run docs:serve

docs-build: ## Build documentation
	@echo "Building documentation..."
	npm run docs:build

# Health Check
health: ## Check application health
	@echo "Checking application health..."
	curl -f http://localhost:8000/health && curl -f http://localhost:4321/

# Backup
backup-db: ## Backup database
	@echo "Backing up database..."
	npm run backup:db

restore-db: ## Restore database
	@echo "Restoring database..."
	npm run restore:db
