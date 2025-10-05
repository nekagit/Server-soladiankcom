# Soladia Marketplace

A premium Solana-powered marketplace that combines cutting-edge blockchain technology with exceptional user experience. Built with modern web technologies and comprehensive Solana integration.

## 🎨 Brand Identity

**Soladia** represents innovation, trust, and the future of digital commerce. Our brand values include:
- **Innovation**: Leading the future of blockchain commerce
- **Trust**: Secure, transparent, and reliable transactions
- **Accessibility**: Making blockchain technology accessible to everyone
- **Community**: Building a vibrant ecosystem of creators and collectors

## 🚀 Core Features

### Marketplace Features
- **NFT Marketplace**: Complete NFT listing, bidding, and trading system
- **Multi-Wallet Support**: Phantom, Solflare, Backpack wallet integration
- **SPL Token Support**: Native SOL and SPL token transactions
- **Escrow System**: Secure payment processing with smart contracts
- **Auction System**: Real-time bidding with automatic settlement
- **Search & Filtering**: Advanced search with AI-powered recommendations

### Advanced Features
- **AI/ML Engine**: Personalized recommendations and fraud detection
- **Social Trading**: Leaderboards, social feed, and copy trading
- **Enterprise API**: API key management, webhooks, and analytics
- **Blockchain Analytics**: Real-time network stats and visualization
- **PWA Support**: Offline capabilities and mobile app installation
- **Real-time Updates**: WebSocket integration for live data

### Technical Features
- **Dark Mode**: Complete theme switching with smooth transitions
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Accessibility**: WCAG 2.1 AA compliance with screen reader support
- **Performance**: Optimized CSS with hardware acceleration
- **Security**: Advanced security features and fraud detection
- **Monitoring**: Comprehensive monitoring with Prometheus and Grafana

## 🛠️ Technology Stack

### Frontend
- **Astro** - Modern static site generator
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Reliable database
- **SQLAlchemy** - Python SQL toolkit
- **Pydantic** - Data validation using Python type annotations

### Blockchain
- **Solana** - High-performance blockchain
- **Phantom Wallet** - Solana wallet integration

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and static file serving

## 📁 Project Structure

```
soladiankcom/
├── src/
│   ├── components/          # Astro components
│   ├── layouts/            # Page layouts
│   ├── pages/              # File-based routing
│   ├── services/           # API services
│   ├── styles/             # Global styles
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── backend/                # FastAPI backend
├── docker/                 # Docker configurations
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+
- Docker (optional)

### Development Setup

1. **Clone and navigate to the project**
   ```bash
   cd soladiankcom
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb soladia
   
   # Run migrations
   cd backend
   alembic upgrade head
   ```

6. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev:full
   
   # Or start them separately
   npm run dev          # Frontend on http://localhost:3000
   npm run dev:backend  # Backend on http://localhost:8000
   ```

### Docker Setup

1. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 📚 Available Scripts

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Backend Scripts
- `npm run dev:backend` - Start backend development server
- `npm run dev:full` - Start both frontend and backend

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

- `PUBLIC_API_BASE_URL` - Backend API URL
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `SOLANA_RPC_URL` - Solana RPC endpoint

### Database Configuration

The application uses PostgreSQL with SQLAlchemy ORM. Database migrations are handled by Alembic.

## 🎨 Design System

The application uses a custom design system inspired by eBay's bold, distinctive style:

- **Primary Colors**: Soladia Red (#E60012) and Blue (#0066CC)
- **Typography**: Inter and Poppins fonts
- **Components**: Reusable Astro components
- **Responsive**: Mobile-first design approach

## 🔐 Authentication

- JWT-based authentication
- Solana wallet integration
- Role-based access control
- Secure session management

## 💳 Payment Integration

- Solana blockchain payments
- Phantom wallet integration
- Secure transaction handling
- Real-time payment status

## 📱 API Documentation

The backend provides comprehensive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## 📚 Comprehensive Documentation

### Brand & Design System
- [**Brand Guidelines**](./docs/BRAND_GUIDELINES.md) - Complete brand identity and design system
- [**Styling Status**](./docs/STYLING_STATUS.md) - Current styling architecture and status
- [**Color Schema**](./docs/COLOR_SCHEMA.md) - Structured color definitions
- [**Brand Implementation**](./docs/BRAND_IMPLEMENTATION.md) - Implementation guide for brand elements
- [**Dark Mode Optimization**](./docs/DARK_MODE_OPTIMIZATION.md) - Dark mode implementation guide

### Technical Documentation
- [**Features Documentation**](./docs/FEATURES_DOCUMENTATION.md) - Comprehensive feature overview
- [**API Documentation**](./docs/API.md) - Complete API documentation
- [**Developer Guide**](./docs/DEVELOPER_GUIDE.md) - Developer setup and contribution guide
- [**Deployment Guide**](./docs/DEPLOYMENT_GUIDE.md) - Production deployment guide
- [**Monitoring Guide**](./docs/MONITORING_GUIDE.md) - Monitoring and observability guide

### User Documentation
- [**User Guide**](./docs/USER_GUIDE.md) - User manual and tutorials
- [**Project Structure**](./PROJECT_STRUCTURE.md) - Detailed project architecture
- [**Solana Migration Demo**](./SOLANA_MIGRATION_DEMO.md) - Solana integration demonstration
- [**Solana Migration Success**](./SOLANA_MIGRATION_SUCCESS.md) - Migration completion summary

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests
cd backend
pytest

# Integration tests
npm run test:integration
```

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup

1. Set production environment variables
2. Configure SSL certificates
3. Set up database backups
4. Configure monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Contact the development team

## 🔄 Migration from solanankcom

This project is a modernized version of the original solanankcom marketplace:

- **Frontend**: Migrated from HTML/HTMX to Astro/TypeScript
- **Styling**: Enhanced Tailwind CSS configuration
- **Type Safety**: Added comprehensive TypeScript types
- **Performance**: Improved with Astro's static generation
- **Developer Experience**: Better tooling and development workflow

See `.cursorrules` for detailed migration information.