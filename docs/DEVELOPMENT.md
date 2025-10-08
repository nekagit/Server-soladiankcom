# Soladia Marketplace - Development Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.11
- **Docker** >= 20.10
- **Git** >= 2.30
- **PostgreSQL** >= 14
- **Redis** >= 6.0

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/soladia/marketplace.git
   cd marketplace
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/dev-setup.sh
   ./scripts/dev-setup.sh
   ```

3. **Start development servers**
   ```bash
   make dev
   # or
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:4321
   - Backend API: http://localhost:8001
   - API Documentation: http://localhost:8001/docs

## 🏗️ Project Structure

```
soladia-marketplace/
├── frontend/                 # Astro + TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Astro pages
│   │   ├── services/       # API and business logic
│   │   └── styles/         # CSS and styling
│   ├── public/             # Static assets
│   └── tests/              # Frontend tests
├── backend/                 # FastAPI + Python backend
│   ├── api/                # API endpoints
│   ├── models/             # Database models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   ├── solana/             # Solana integration
│   └── tests/              # Backend tests
├── mobile/                  # React Native mobile app
├── docs/                   # Documentation
├── scripts/                # Development scripts
├── k8s/                    # Kubernetes configurations
└── monitoring/             # Monitoring configurations
```

## 🛠️ Development Commands

### Using Make (Recommended)

```bash
# Development
make dev                    # Start all development servers
make dev-frontend          # Start frontend only
make dev-backend           # Start backend only

# Building
make build                 # Build entire application
make build-frontend        # Build frontend only
make build-backend         # Build backend only

# Testing
make test                  # Run all tests
make test-frontend         # Run frontend tests
make test-backend          # Run backend tests
make test-e2e              # Run E2E tests
make test-coverage         # Run tests with coverage

# Code Quality
make lint                  # Run linting
make format                # Format code
make type-check            # Run type checking
make quality-check         # Run comprehensive quality check

# Database
make db-migrate            # Run database migrations
make db-reset              # Reset database
make db-seed               # Seed database with sample data

# Docker
make docker-up             # Start Docker services
make docker-down           # Stop Docker services
make docker-build          # Build Docker images

# Security
make security-audit        # Run security audit
make security-fix          # Fix security issues

# Performance
make performance-test      # Run performance tests
make lighthouse            # Run Lighthouse test

# Deployment
make deploy-staging        # Deploy to staging
make deploy-production     # Deploy to production
```

### Using npm Scripts

```bash
# Development
npm run dev                # Start all development servers
npm run dev:frontend       # Start frontend only
npm run dev:backend        # Start backend only

# Building
npm run build              # Build entire application
npm run build:frontend     # Build frontend only
npm run build:backend      # Build backend only

# Testing
npm run test               # Run all tests
npm run test:frontend      # Run frontend tests
npm run test:backend       # Run backend tests
npm run test:integration   # Run integration tests
npm run test:coverage      # Run tests with coverage

# Code Quality
npm run lint               # Run linting
npm run format             # Format code
npm run type-check         # Run type checking

# Docker
npm run docker:up          # Start Docker services
npm run docker:down        # Stop Docker services
npm run docker:build       # Build Docker images

# Security
npm run security:audit     # Run security audit
npm run security:fix       # Fix security issues

# Performance
npm run performance:test   # Run performance tests
```

## 🔧 Development Environment

### VS Code Setup

1. **Install recommended extensions**
   ```bash
   # The .vscode/extensions.json file contains all recommended extensions
   # VS Code will prompt you to install them when you open the project
   ```

2. **Configure settings**
   - The `.vscode/settings.json` file contains project-specific settings
   - Includes formatting, linting, and debugging configurations

3. **Debugging**
   - Use `F5` to start debugging
   - Debug configurations are in `.vscode/launch.json`
   - Supports debugging both frontend and backend

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Key variables to configure:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SOLANA_RPC_URL`: Solana RPC endpoint
- `JWT_SECRET`: JWT signing secret
- `SECRET_KEY`: Application secret key

### Database Setup

1. **Start PostgreSQL and Redis**
   ```bash
   make docker-up
   ```

2. **Run migrations**
   ```bash
   make db-migrate
   ```

3. **Seed with sample data**
   ```bash
   make db-seed
   ```

## 🧪 Testing

### Frontend Testing

```bash
# Unit tests
make test-frontend

# E2E tests
make test-e2e

# Coverage
cd frontend && npm run test:coverage
```

### Backend Testing

```bash
# Unit tests
make test-backend

# Integration tests
cd backend && python3 -m pytest tests/integration/

# Coverage
cd backend && python3 -m pytest --cov=. --cov-report=html
```

### Test Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Test application performance and load

## 🔍 Code Quality

### Linting and Formatting

```bash
# Run linting
make lint

# Fix linting issues
make lint:fix

# Format code
make format
```

### Type Checking

```bash
# Frontend type checking
make type-check:frontend

# Backend type checking
make type-check:backend
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

## 🚀 Deployment

### Staging Deployment

```bash
make deploy-staging
```

### Production Deployment

```bash
make deploy-production
```

### Manual Deployment

```bash
# Build and test
make build
make test

# Deploy with Docker
make docker-prod
```

## 📊 Monitoring

### Start Monitoring

```bash
make monitor
```

### Access Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
- **Application Metrics**: http://localhost:8000/metrics

## 🐛 Debugging

### Frontend Debugging

1. **VS Code Debugger**
   - Set breakpoints in TypeScript/JavaScript files
   - Use `F5` to start debugging

2. **Browser DevTools**
   - Use Chrome DevTools for debugging
   - Check Network tab for API calls
   - Use Console for JavaScript debugging

### Backend Debugging

1. **VS Code Debugger**
   - Set breakpoints in Python files
   - Use `F5` to start debugging

2. **Logging**
   - Check application logs
   - Use structured logging for better debugging

### Database Debugging

1. **Database Logs**
   ```bash
   make docker-logs
   ```

2. **Database Access**
   ```bash
   # Connect to PostgreSQL
   docker exec -it soladia_postgres psql -U postgres -d soladia
   ```

## 🔒 Security

### Security Checks

```bash
# Run security audit
make security-audit

# Fix security issues
make security-fix
```

### Security Best Practices

1. **Environment Variables**
   - Never commit secrets to version control
   - Use strong, unique secrets
   - Rotate secrets regularly

2. **Dependencies**
   - Keep dependencies updated
   - Use `npm audit` to check for vulnerabilities
   - Use `safety` for Python dependencies

3. **Code Security**
   - Validate all inputs
   - Use parameterized queries
   - Implement proper authentication and authorization

## 📈 Performance

### Performance Testing

```bash
# Run performance tests
make performance-test

# Run Lighthouse
make lighthouse
```

### Performance Optimization

1. **Frontend**
   - Use code splitting
   - Implement lazy loading
   - Optimize images
   - Use CDN for static assets

2. **Backend**
   - Optimize database queries
   - Use caching
   - Implement connection pooling
   - Monitor memory usage

## 🤝 Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Write tests
   - Update documentation

3. **Run quality checks**
   ```bash
   make quality-check
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Standards

1. **TypeScript/JavaScript**
   - Use strict type checking
   - Follow ESLint rules
   - Use Prettier for formatting

2. **Python**
   - Follow PEP 8
   - Use Black for formatting
   - Use isort for import sorting

3. **Commits**
   - Use conventional commit messages
   - Keep commits atomic
   - Write descriptive commit messages

## 📚 Additional Resources

- [Astro Documentation](https://docs.astro.build/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill processes using ports
   lsof -ti:4321 | xargs kill -9
   lsof -ti:8001 | xargs kill -9
   ```

2. **Database connection issues**
   ```bash
   # Restart database
   make docker-down
   make docker-up
   make db-migrate
   ```

3. **Node modules issues**
   ```bash
   # Clean and reinstall
   make clean-deps
   make install
   ```

4. **Python virtual environment issues**
   ```bash
   # Recreate virtual environment
   cd backend
   rm -rf .venv
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

### Getting Help

- Check the [Issues](https://github.com/soladia/marketplace/issues) page
- Join our [Discord](https://discord.gg/soladia)
- Read the [Documentation](https://docs.soladia.com)
- Contact the team at [team@soladia.com](mailto:team@soladia.com)
