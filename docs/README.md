# Soladia Marketplace Documentation

Welcome to the Soladia Marketplace documentation! This comprehensive guide will help you understand, develop, and deploy the Soladia marketplace platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Frontend Development](#frontend-development)
- [Backend Development](#backend-development)
- [Solana Integration](#solana-integration)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)

## Overview

Soladia is a decentralized marketplace built on the Solana blockchain, providing a modern, secure, and efficient platform for buying and selling digital assets, NFTs, and services.

### Key Features

- **Multi-Wallet Support**: Phantom, Solflare, Backpack, and more
- **Real-time Updates**: WebSocket-based live updates
- **NFT Marketplace**: Complete NFT trading functionality
- **SPL Token Support**: Multi-token payment options
- **Escrow System**: Secure payment processing
- **Analytics Dashboard**: Comprehensive analytics and reporting
- **Admin Panel**: System monitoring and management

### Technology Stack

- **Frontend**: Astro, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python, SQLAlchemy
- **Database**: PostgreSQL
- **Blockchain**: Solana
- **Real-time**: WebSockets
- **Testing**: Vitest, Pytest
- **Deployment**: Docker, Docker Compose

## Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Solana        │
│   (Astro)       │◄──►│   (FastAPI)     │◄──►│   Blockchain    │
│                 │    │                 │    │                 │
│ • Components    │    │ • API Routes    │    │ • RPC Client    │
│ • Services      │    │ • WebSockets    │    │ • Transactions  │
│ • Pages         │    │ • Database      │    │ • Tokens        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Structure

```
src/
├── components/           # Reusable UI components
│   ├── solana/          # Solana-specific components
│   │   ├── SolanaWallet.astro
│   │   ├── PaymentModal.astro
│   │   ├── NFTCard.astro
│   │   └── TokenSelector.astro
│   ├── RealtimeDashboard.astro
│   └── AnalyticsDashboard.astro
├── services/            # Business logic services
│   └── solana/          # Solana services
│       ├── solana-wallet.ts
│       ├── solana-transaction.ts
│       └── solana-token.ts
├── pages/               # Application pages
│   ├── index.astro
│   ├── wallet.astro
│   ├── nft.astro
│   └── admin/
└── layouts/             # Page layouts
    └── Layout.astro
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL 13+
- Docker and Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/soladia-marketplace.git
   cd soladia-marketplace
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Set up the database**
   ```bash
   cd backend
   python -c "from database import engine, Base; Base.metadata.create_all(bind=engine)"
   ```

### Development

1. **Start the development servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd backend
   python -m uvicorn main:app --reload
   ```

2. **Access the application**
   - Frontend: http://localhost:4321
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Frontend Development

### Component Development

#### Creating a New Component

```astro
---
// MyComponent.astro
export interface Props {
  title: string;
  description?: string;
}

const { title, description = '' } = Astro.props;
---

<div class="my-component">
  <h2>{title}</h2>
  {description && <p>{description}</p>}
</div>

<style>
  .my-component {
    @apply p-4 bg-white rounded-lg shadow-sm;
  }
</style>
```

#### Using Solana Services

```typescript
import { enhancedSolanaWalletService } from '../services/solana/solana-wallet';

// Connect wallet
const result = await enhancedSolanaWalletService.connect('phantom');
if (result.success) {
  console.log('Connected:', result.publicKey);
}

// Get balance
const balance = await enhancedSolanaWalletService.getBalance();
console.log('Balance:', balance);
```

### Styling Guidelines

We use Tailwind CSS for styling. Follow these guidelines:

- Use utility classes for common styles
- Create component-specific styles when needed
- Use CSS custom properties for theming
- Follow mobile-first responsive design

```astro
<style>
  .my-component {
    @apply p-4 bg-white rounded-lg shadow-sm;
    @apply hover:shadow-md transition-shadow duration-200;
  }
  
  .my-component--large {
    @apply p-8 text-lg;
  }
</style>
```

## Backend Development

### API Development

#### Creating a New Endpoint

```python
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from schemas import MySchema
from services import MyService

router = APIRouter(prefix="/api/my-endpoint", tags=["my-endpoint"])

@router.get("/", response_model=List[MySchema])
async def get_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    service = MyService()
    return service.get_items(db, skip=skip, limit=limit)

@router.post("/", response_model=MySchema)
async def create_item(item: MySchema, db: Session = Depends(get_db)):
    service = MyService()
    return service.create_item(db, item)
```

#### WebSocket Endpoints

```python
from fastapi import WebSocket, WebSocketDisconnect
from websocket_service import manager

@router.websocket("/ws/my-endpoint")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle message
            await manager.send_personal_message("Response", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### Database Models

#### Creating a New Model

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class MyModel(Base):
    __tablename__ = "my_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="my_models")
```

## Solana Integration

### Wallet Integration

The Soladia marketplace supports multiple Solana wallets:

- **Phantom**: Most popular Solana wallet
- **Solflare**: Feature-rich wallet
- **Backpack**: Social wallet
- **Sollet**: Legacy wallet

#### Connecting Wallets

```typescript
// Connect to Phantom
const result = await enhancedSolanaWalletService.connect('phantom');

// Connect to Solflare
const result = await enhancedSolanaWalletService.connect('solflare');

// Connect to Backpack
const result = await enhancedSolanaWalletService.connect('backpack');
```

#### Transaction Handling

```typescript
// Sign a transaction
const transaction = new Transaction();
const result = await enhancedSolanaWalletService.signTransaction(transaction);

// Send a transaction
const signature = await enhancedSolanaWalletService.sendTransaction(transaction);
```

### RPC Integration

The backend uses a robust RPC client with:

- Connection pooling
- Retry logic
- Error handling
- Rate limiting

#### Using the RPC Client

```python
from solana.enhanced_service import EnhancedSolanaService
from solana.config import solana_config

async with EnhancedSolanaService(solana_config) as service:
    # Get wallet info
    wallet_info = await service.get_wallet_info(wallet_address)
    
    # Get token accounts
    tokens = await service.get_token_accounts(wallet_address)
    
    # Simulate payment
    result = await service.simulate_payment(from_wallet, to_wallet, amount)
```

## API Reference

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Solana Endpoints

- `GET /api/solana/health` - Check Solana service health
- `GET /api/solana/wallets/{address}/info` - Get wallet information
- `GET /api/solana/wallets/{address}/balance` - Get wallet balance
- `GET /api/solana/wallets/{address}/tokens` - Get token accounts
- `GET /api/solana/transactions/{signature}/status` - Get transaction status
- `POST /api/solana/payments/simulate` - Simulate payment
- `POST /api/solana/payments` - Create payment

### WebSocket Endpoints

- `WS /ws/solana` - Main WebSocket connection
- `WS /ws/solana/wallet/{address}` - Wallet-specific updates
- `WS /ws/solana/transactions` - Transaction updates
- `WS /ws/solana/nfts` - NFT updates
- `WS /ws/solana/market` - Market updates

### Product Endpoints

- `GET /api/products/` - List products
- `POST /api/products/` - Create product
- `GET /api/products/{id}` - Get product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

## Deployment

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Environment Configuration**
   ```bash
   # .env file
   DATABASE_URL=postgresql://user:password@localhost/soladia
   SOLANA_RPC_URL=https://api.devnet.solana.com
   SOLANA_NETWORK=devnet
   SECRET_KEY=your-secret-key
   ```

### Production Deployment

1. **Set up production database**
   ```bash
   # Create production database
   createdb soladia_production
   ```

2. **Run migrations**
   ```bash
   cd backend
   python -c "from database import engine, Base; Base.metadata.create_all(bind=engine)"
   ```

3. **Deploy with Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost/soladia` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_NETWORK` | Solana network | `devnet` |
| `SECRET_KEY` | JWT secret key | Required |
| `DEBUG` | Debug mode | `false` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Testing

### Frontend Testing

```bash
# Run frontend tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Backend Testing

```bash
# Run backend tests
cd backend
pytest

# Run tests with coverage
pytest --cov=.

# Run specific test file
pytest tests/test_solana_service.py
```

### Test Structure

```
tests/
├── frontend/
│   ├── solana-wallet.test.ts
│   ├── components.test.ts
│   └── services.test.ts
└── backend/
    ├── test_solana_service.py
    ├── test_api_endpoints.py
    └── test_websocket.py
```

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make your changes**
4. **Write tests**
5. **Run the test suite**
   ```bash
   npm run test
   pytest
   ```
6. **Commit your changes**
   ```bash
   git commit -m "Add my feature"
   ```
7. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```
8. **Create a Pull Request**

### Code Style

- **Frontend**: ESLint + Prettier
- **Backend**: Black + isort
- **TypeScript**: Strict mode enabled
- **Python**: Type hints required

### Commit Convention

We use conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process or auxiliary tool changes

## Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/soladia-marketplace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/soladia-marketplace/discussions)
- **Discord**: [Join our Discord](https://discord.gg/soladia)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Soladia Team**
