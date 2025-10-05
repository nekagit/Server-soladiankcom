# Soladia Developer Guide

## Overview

This guide provides comprehensive information for developers who want to integrate with Soladia's API, build on our platform, or contribute to the project.

## Table of Contents

1. [Getting Started](#getting-started)
2. [API Integration](#api-integration)
3. [SDK Usage](#sdk-usage)
4. [Smart Contracts](#smart-contracts)
5. [WebSocket Integration](#websocket-integration)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Contributing](#contributing)

## Getting Started

### Prerequisites

- Node.js 18+ or Python 3.9+
- Solana CLI tools
- A Solana wallet (Phantom, Solflare, etc.)
- Basic knowledge of blockchain and Solana

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/soladia/soladia.git
   cd soladia
   ```

2. **Install Dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend
   pip install -r requirements.txt
   ```

3. **Set Up Environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Run Development Server**
   ```bash
   # Start both frontend and backend
   npm run dev
   ```

## API Integration

### Authentication

Soladia uses Solana wallet signatures for authentication:

```typescript
// JavaScript/TypeScript
const signature = await wallet.signMessage(new TextEncoder().encode(message));
const response = await fetch('/api/solana/wallets/info', {
  headers: {
    'X-Wallet-Address': walletAddress,
    'X-Wallet-Signature': signature,
    'Content-Type': 'application/json'
  }
});
```

```python
# Python
import requests
from solders.keypair import Keypair
from solders.signature import Signature

# Sign message with private key
signature = keypair.sign_message(message.encode())
headers = {
    'X-Wallet-Address': wallet_address,
    'X-Wallet-Signature': signature.base58(),
    'Content-Type': 'application/json'
}
response = requests.get('/api/solana/wallets/info', headers=headers)
```

### Rate Limiting

API requests are rate limited:

- **General endpoints**: 100 requests/minute
- **Payment endpoints**: 10 requests/minute
- **Wallet endpoints**: 50 requests/minute

Handle rate limits gracefully:

```typescript
async function makeRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
      return makeRequest(url, options);
    }
    
    return response;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

### Error Handling

All API endpoints return consistent error responses:

```json
{
  "detail": "Error message",
  "error_code": "INVALID_WALLET_ADDRESS",
  "timestamp": "2025-10-05T08:28:26.499681+00:00"
}
```

Handle errors appropriately:

```typescript
async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.error_code}: ${error.detail}`);
  }
  return response.json();
}
```

## SDK Usage

### JavaScript/TypeScript SDK

```typescript
import { SoladiaAPI } from '@soladia/sdk';

const api = new SoladiaAPI({
  baseURL: 'https://api.soladia.com',
  walletAddress: '11111111111111111111111111111112',
  privateKey: 'your-private-key' // For server-side usage
});

// Get wallet balance
const balance = await api.wallet.getBalance();
console.log(`Balance: ${balance.balance} SOL`);

// Create a payment
const payment = await api.payments.create({
  to: '11111111111111111111111111111113',
  amount: 1.0,
  memo: 'Payment for NFT'
});

// Get transaction status
const status = await api.transactions.getStatus(payment.transactionId);
console.log(`Status: ${status.status}`);
```

### Python SDK

```python
from soladia_sdk import SoladiaAPI

api = SoladiaAPI(
    base_url='https://api.soladia.com',
    wallet_address='11111111111111111111111111111112',
    private_key='your-private-key'  # For server-side usage
)

# Get wallet balance
balance = api.wallet.get_balance()
print(f"Balance: {balance.balance} SOL")

# Create a payment
payment = api.payments.create(
    to='11111111111111111111111111111113',
    amount=1.0,
    memo='Payment for NFT'
)

# Get transaction status
status = api.transactions.get_status(payment.transaction_id)
print(f"Status: {status.status}")
```

### SDK Features

- **Automatic retries**: Built-in retry logic for failed requests
- **Rate limiting**: Automatic rate limit handling
- **Type safety**: Full TypeScript support
- **Error handling**: Comprehensive error handling
- **WebSocket support**: Real-time updates

## Smart Contracts

### Escrow Contract

The escrow contract handles secure payments:

```typescript
// Deploy escrow contract
const escrowProgram = new Program(escrowIdl, programId, provider);

// Create escrow
const escrowAccount = Keypair.generate();
const createEscrowTx = await escrowProgram.methods
  .createEscrow(new BN(amount))
  .accounts({
    escrowAccount: escrowAccount.publicKey,
    buyer: buyerWallet.publicKey,
    seller: sellerWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([escrowAccount])
  .rpc();
```

### NFT Contract

For NFT operations:

```typescript
// Mint NFT
const mintKeypair = Keypair.generate();
const mintTx = await program.methods
  .mintNft(
    new BN(1), // supply
    new BN(0), // decimals
    "My NFT", // name
    "NFT Description", // description
    "https://example.com/metadata.json" // uri
  )
  .accounts({
    mint: mintKeypair.publicKey,
    owner: ownerWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([mintKeypair])
  .rpc();
```

### Auction Contract

For NFT auctions:

```typescript
// Create auction
const auctionTx = await auctionProgram.methods
  .createAuction(
    new BN(startPrice),
    new BN(reservePrice),
    new BN(duration)
  )
  .accounts({
    auction: auctionAccount.publicKey,
    nftMint: nftMint,
    seller: sellerWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## WebSocket Integration

### Real-time Updates

Connect to WebSocket for real-time updates:

```typescript
const ws = new WebSocket('wss://api.soladia.com/ws/solana');

ws.onopen = () => {
  console.log('Connected to Soladia WebSocket');
  
  // Subscribe to wallet updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'wallet',
    wallet: '11111111111111111111111111111112'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'wallet:connected':
      console.log('Wallet connected:', data.wallet);
      break;
    case 'transaction:confirmed':
      console.log('Transaction confirmed:', data.transaction);
      break;
    case 'nft:listed':
      console.log('NFT listed:', data.nft);
      break;
  }
};
```

### WebSocket Events

| Event | Description | Data |
|-------|-------------|------|
| `wallet:connected` | Wallet connection | `{wallet, timestamp}` |
| `wallet:disconnected` | Wallet disconnection | `{wallet, timestamp}` |
| `transaction:confirmed` | Transaction confirmed | `{signature, amount, timestamp}` |
| `transaction:failed` | Transaction failed | `{signature, error, timestamp}` |
| `nft:listed` | NFT listed for sale | `{nft, price, timestamp}` |
| `nft:sold` | NFT sold | `{nft, price, buyer, timestamp}` |

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SoladiaAPI } from '../src/api';

describe('SoladiaAPI', () => {
  it('should get wallet balance', async () => {
    const api = new SoladiaAPI({
      baseURL: 'https://api.soladia.com',
      walletAddress: '11111111111111111111111111111112'
    });

    const balance = await api.wallet.getBalance();
    expect(balance.balance).toBeGreaterThanOrEqual(0);
  });
});
```

### Integration Tests

```typescript
describe('Payment Integration', () => {
  it('should create and confirm payment', async () => {
    const api = new SoladiaAPI(config);
    
    // Create payment
    const payment = await api.payments.create({
      to: '11111111111111111111111111111113',
      amount: 1.0
    });
    
    expect(payment.transactionId).toBeDefined();
    
    // Wait for confirmation
    const status = await api.transactions.waitForConfirmation(
      payment.transactionId
    );
    
    expect(status.status).toBe('confirmed');
  });
});
```

### Mock Testing

```typescript
import { vi } from 'vitest';

// Mock Solana RPC
vi.mock('@solana/web3.js', () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getBalance: vi.fn().mockResolvedValue(1000000000),
    getAccountInfo: vi.fn().mockResolvedValue({
      data: Buffer.from('test'),
      owner: '11111111111111111111111111111112'
    })
  }))
}));
```

## Deployment

### Environment Setup

```bash
# Production environment variables
export SOLANA_NETWORK=mainnet-beta
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export DATABASE_URL=postgresql://user:pass@host:port/db
export REDIS_URL=redis://host:port
export JWT_SECRET=your-jwt-secret
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
  
  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=soladia
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

### Development Setup

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/soladia.git
   cd soladia
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

4. **Test Changes**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Submit Pull Request**
   - Push your changes
   - Create pull request
   - Wait for review

### Code Style

- **TypeScript**: Use strict mode
- **ESLint**: Follow our ESLint configuration
- **Prettier**: Use Prettier for formatting
- **Commits**: Use conventional commits

### Testing Requirements

- **Unit Tests**: All new code must have unit tests
- **Integration Tests**: API endpoints need integration tests
- **Coverage**: Maintain 80%+ test coverage
- **E2E Tests**: Critical user flows need E2E tests

### Documentation

- **API Docs**: Update API documentation for new endpoints
- **User Guide**: Update user guide for new features
- **Code Comments**: Add JSDoc comments for functions
- **README**: Update README for setup changes

## Advanced Topics

### Custom Integrations

```typescript
// Custom Solana program integration
import { Program, AnchorProvider } from '@coral-xyz/anchor';

class CustomSolanaProgram {
  constructor(programId: PublicKey, provider: AnchorProvider) {
    this.program = new Program(idl, programId, provider);
  }

  async customMethod(params: CustomParams) {
    return await this.program.methods
      .customMethod(params)
      .rpc();
  }
}
```

### Performance Optimization

```typescript
// Connection pooling
const connectionPool = new ConnectionPool({
  maxConnections: 10,
  rpcUrl: 'https://api.mainnet-beta.solana.com'
});

// Batch requests
const batchRequests = async (requests: Request[]) => {
  const batch = await Promise.all(requests);
  return batch;
};
```

### Security Best Practices

```typescript
// Input validation
import { z } from 'zod';

const walletAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

## Support

### Getting Help

- **Discord**: [discord.gg/soladia](https://discord.gg/soladia)
- **GitHub Issues**: [github.com/soladia/issues](https://github.com/soladia/issues)
- **Email**: dev-support@soladia.com
- **Documentation**: [docs.soladia.com](https://docs.soladia.com)

### Resources

- **Solana Docs**: [docs.solana.com](https://docs.solana.com)
- **Anchor Framework**: [anchor-lang.com](https://anchor-lang.com)
- **Web3.js**: [solana-labs.github.io/solana-web3.js](https://solana-labs.github.io/solana-web3.js)

---

**Ready to build?** Start with our [Quick Start Guide](#getting-started) or explore our [API Documentation](./API.md) for detailed endpoint information.
