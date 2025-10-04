# Soladia Marketplace

A modern, decentralized marketplace built with Astro, TypeScript, FastAPI, and Solana blockchain integration.

## 🚀 Features

- **Modern Frontend**: Built with Astro, TypeScript, and Tailwind CSS
- **Fast Backend**: FastAPI with PostgreSQL database
- **Blockchain Integration**: Solana wallet integration for payments
- **Responsive Design**: Mobile-first approach with beautiful UI
- **Type Safety**: Full TypeScript support throughout
- **Performance**: Static site generation with Astro
- **Security**: JWT authentication and rate limiting

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