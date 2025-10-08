# Soladia Marketplace

A premium Solana-powered marketplace that combines cutting-edge blockchain technology with exceptional user experience.

## 🚀 Features

### ✅ **Completed Features**

- **🔐 Authentication System**: Complete JWT-based authentication with role management
- **🎨 Component Library**: Atomic design system with reusable components
- **🔌 API Integration**: Centralized API client with error handling and retry logic
- **🧪 Testing Suite**: Comprehensive testing with Vitest and React Testing Library
- **⚡ Performance Optimization**: Core Web Vitals monitoring and optimization
- **♿ Accessibility**: WCAG 2.1 AA compliance with screen reader support
- **📱 Responsive Design**: Mobile-first approach with Tailwind CSS
- **🎯 TypeScript**: Strict type checking throughout the codebase

### 🚧 **In Development**

- **🛒 E-commerce Features**: Product catalog, shopping cart, checkout
- **💎 NFT Marketplace**: NFT creation, trading, and management
- **🔗 Solana Integration**: Wallet connection and blockchain transactions
- **📊 Analytics Dashboard**: User and transaction analytics
- **🌐 Social Features**: User profiles, reviews, and social interactions

## 🏗️ Architecture

### **Frontend Stack**
- **Framework**: Astro + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom CSS Properties
- **Components**: Atomic Design System
- **State Management**: Centralized services with localStorage
- **Testing**: Vitest + React Testing Library
- **Performance**: Lazy loading, code splitting, Core Web Vitals

### **Backend Stack**
- **Framework**: FastAPI + Python 3.11+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT + OAuth2 + Solana wallet integration
- **Blockchain**: Solana RPC client with connection pooling
- **Caching**: Redis for session and data caching

### **Blockchain Integration**
- **Primary Network**: Solana Mainnet
- **Wallet Support**: Phantom, Solflare, Backpack
- **Token Support**: SOL + SPL tokens
- **Smart Contracts**: Escrow, Auction, NFT marketplace programs

## 🚀 Quick Start

### **Prerequisites**
- Node.js >= 18.0.0
- Python >= 3.11
- PostgreSQL >= 14
- Redis >= 6.0
- Solana CLI (latest version)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/soladia-marketplace.git
   cd soladia-marketplace
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   pip install -r requirements.txt
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Run migrations
   cd backend
   alembic upgrade head
   ```

5. **Start Development Servers**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individually
   npm run dev:frontend  # Frontend on http://localhost:4321
   npm run dev:backend   # Backend on http://localhost:8000
   ```

## 📁 Project Structure

```
soladia-marketplace/
├── frontend/                 # Astro frontend application
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── atoms/        # Basic UI elements
│   │   │   ├── molecules/    # Component combinations
│   │   │   └── organisms/    # Complex components
│   │   ├── layouts/          # Page layouts
│   │   ├── pages/            # Application pages
│   │   ├── services/         # API and utility services
│   │   ├── styles/           # Global styles
│   │   └── tests/            # Test files
│   ├── public/               # Static assets
│   └── package.json
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── core/            # Core configuration
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic
│   ├── tests/               # Backend tests
│   └── requirements.txt
├── docs/                    # Documentation
├── scripts/                 # Development scripts
├── docker-compose.yml       # Docker configuration
└── README.md
```

## 🧪 Testing

### **Frontend Testing**
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### **Backend Testing**
```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py
```

## 🚀 Deployment

### **Development**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d
```

### **Production**
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d
```

### **Kubernetes**
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
```

## 📊 Performance

### **Core Web Vitals**
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### **Performance Monitoring**
```javascript
// Check performance metrics
performanceService.getMetrics();

// Get Core Web Vitals scores
performanceService.getCoreWebVitalsScore();
```

## ♿ Accessibility

### **WCAG 2.1 AA Compliance**
- Screen reader support
- Keyboard navigation
- Color contrast compliance
- Focus management
- ARIA labels and roles

### **Accessibility Testing**
```javascript
// Run accessibility audit
accessibilityService.runAudit();

// Announce to screen readers
accessibilityService.announce('Message');
```

## 🔧 Development Tools

### **Available Scripts**
```bash
# Development
npm run dev              # Start all services
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only

# Building
npm run build            # Build all services
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only

# Testing
npm run test             # Run all tests
npm run test:frontend    # Run frontend tests
npm run test:backend     # Run backend tests

# Linting
npm run lint             # Lint all code
npm run lint:fix         # Fix linting issues

# Formatting
npm run format           # Format all code
```

### **Development Dashboard**
Visit `/dev-dashboard` to access:
- Component showcase
- Performance monitoring
- Accessibility testing
- API testing tools
- Development status

## 🎨 Design System

### **Color Palette**
```css
--soladia-primary: #E60012;        /* Soladia Red */
--soladia-secondary: #0066CC;      /* Soladia Blue */
--soladia-accent: #FFD700;         /* Soladia Gold */
--soladia-success: #00A650;        /* Success Green */
--soladia-warning: #FF8C00;        /* Warning Orange */
--soladia-error: #DC2626;          /* Error Red */
```

### **Typography**
- **Primary Font**: Inter (body text)
- **Display Font**: Poppins (headings)

### **Spacing Scale**
```css
--soladia-space-xs: 0.25rem;    /* 4px */
--soladia-space-sm: 0.5rem;     /* 8px */
--soladia-space-md: 1rem;       /* 16px */
--soladia-space-lg: 1.5rem;     /* 24px */
--soladia-space-xl: 2rem;       /* 32px */
--soladia-space-2xl: 3rem;      /* 48px */
```

## 🔐 Security

### **Authentication**
- JWT tokens with secure storage
- Role-based access control
- Session management
- Password hashing with bcrypt

### **API Security**
- Request validation with Pydantic
- Rate limiting
- CORS configuration
- Input sanitization

### **Frontend Security**
- Content Security Policy (CSP)
- XSS protection
- CSRF tokens
- Secure headers

## 📈 Monitoring

### **Application Monitoring**
- Prometheus metrics
- Grafana dashboards
- Error tracking
- Performance monitoring

### **Logging**
- Structured logging
- Log aggregation
- Error reporting
- Audit trails

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Standards**
- Follow TypeScript strict mode
- Use ESLint and Prettier
- Write comprehensive tests
- Follow atomic design principles
- Ensure accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Astro](https://astro.build/) - Modern web framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Solana](https://solana.com/) - High-performance blockchain
- [Vite](https://vitejs.dev/) - Next generation frontend tooling

## 📞 Support

- **Documentation**: [docs.soladia.com](https://docs.soladia.com)
- **Discord**: [discord.gg/soladia](https://discord.gg/soladia)
- **Email**: support@soladia.com
- **GitHub Issues**: [github.com/soladia/issues](https://github.com/soladia/issues)

---

**Built with ❤️ by the Soladia Team**