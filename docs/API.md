# Soladia API Documentation

## Overview

The Soladia API provides comprehensive endpoints for managing Solana-based marketplace operations, including wallet management, transaction processing, NFT operations, and escrow functionality.

## Base URL

```
https://api.soladia.com
```

## Authentication

Most endpoints require authentication via Solana wallet signatures. Include the wallet address and signature in request headers:

```http
X-Wallet-Address: 11111111111111111111111111111112
X-Wallet-Signature: <base64-encoded-signature>
```

## Solana Endpoints

### Health Check

Check the health of Solana services.

```http
GET /api/solana/health
```

**Response:**
```json
{
  "status": "healthy",
  "rpc_url": "https://api.devnet.solana.com",
  "network": "devnet",
  "version": {
    "feature-set": 3604001754,
    "solana-core": "3.0.2"
  },
  "current_slot": 400405887,
  "timestamp": "2025-10-05T08:28:26.499681+00:00",
  "message": "Solana services are running with real RPC integration"
}
```

### Wallet Information

Get comprehensive wallet information.

```http
GET /api/solana/wallets/{wallet_address}/info
```

**Parameters:**
- `wallet_address` (string): Solana wallet address

**Response:**
```json
{
  "address": "11111111111111111111111111111112",
  "balance": 5.5,
  "lamports": 5500000000,
  "exists": true,
  "owner": null,
  "executable": false,
  "rent_epoch": 361,
  "network": "devnet"
}
```

### Wallet Balance

Get wallet balance in SOL and lamports.

```http
GET /api/solana/wallets/{wallet_address}/balance
```

**Response:**
```json
{
  "address": "11111111111111111111111111111112",
  "balance": 5.5,
  "lamports": 5500000000,
  "exists": true,
  "network": "devnet"
}
```

### Wallet Tokens

Get all token accounts for a wallet.

```http
GET /api/solana/wallets/{wallet_address}/tokens
```

**Response:**
```json
{
  "address": "11111111111111111111111111111112",
  "tokens": [
    {
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "name": "USD Coin",
      "symbol": "USDC",
      "decimals": 6,
      "balance": 1000000,
      "ui_amount": 1.0,
      "supply": 1000000000
    }
  ],
  "count": 1,
  "network": "devnet"
}
```

### Transaction Status

Get the status of a transaction.

```http
GET /api/solana/transactions/{signature}/status
```

**Parameters:**
- `signature` (string): Transaction signature

**Response:**
```json
{
  "signature": "5VERv8NMvbbJMEZDYzJ1SQDN3biszfBH6N7wUi6Zt5rK2Lf9SgYbGKpf5jHTYfHj7R4r",
  "slot": 400405887,
  "block_time": "2025-10-05T08:28:26.499681+00:00",
  "confirmation_status": "confirmed",
  "success": true,
  "error": null,
  "logs": ["Program log: Transfer successful"],
  "fee": 0.000005,
  "network": "devnet"
}
```

### NFT Metadata

Get NFT metadata.

```http
GET /api/solana/nfts/{mint}/metadata
```

**Parameters:**
- `mint` (string): NFT mint address

**Response:**
```json
{
  "mint": "11111111111111111111111111111112",
  "name": "Digital Art #001",
  "description": "Unique digital artwork",
  "image": "https://example.com/image.png",
  "attributes": [
    {"trait_type": "Color", "value": "Blue"},
    {"trait_type": "Rarity", "value": "Common"}
  ],
  "collection": "Digital Art Collection",
  "status": "verified",
  "network": "devnet"
}
```

### Token Information

Get token information.

```http
GET /api/solana/tokens/{mint}/info
```

**Response:**
```json
{
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "name": "USD Coin",
  "symbol": "USDC",
  "decimals": 6,
  "supply": 1000000000,
  "is_verified": true,
  "logo_url": "https://example.com/usdc-logo.png",
  "website": "https://www.centre.io/",
  "description": "USD Coin (USDC) is a fully-backed U.S. dollar stablecoin.",
  "network": "devnet"
}
```

### Payment Simulation

Simulate a payment transaction.

```http
POST /api/solana/payments/simulate
```

**Parameters:**
- `from_wallet` (string): Sender wallet address
- `to_wallet` (string): Recipient wallet address
- `amount` (number): Payment amount
- `token` (string): Token symbol (default: "SOL")

**Response:**
```json
{
  "simulation": {
    "success": true,
    "from_balance": 10.5,
    "amount": 1.0,
    "token": "SOL",
    "error": null
  },
  "network": "devnet",
  "timestamp": 1696500000.0
}
```

### Create Payment

Create a payment transaction.

```http
POST /api/solana/payments
```

**Parameters:**
- `from_wallet` (string): Sender wallet address
- `to_wallet` (string): Recipient wallet address
- `amount` (number): Payment amount
- `memo` (string, optional): Payment memo
- `token` (string): Token symbol (default: "SOL")

**Response:**
```json
{
  "payment": {
    "from_wallet": "11111111111111111111111111111112",
    "to_wallet": "11111111111111111111111111111113",
    "amount": 1.0,
    "memo": "Test payment",
    "status": "created",
    "message": "Transaction created (mock implementation)"
  },
  "network": "devnet",
  "timestamp": 1696500000.0
}
```

### Network Information

Get network information.

```http
GET /api/solana/network/info
```

**Response:**
```json
{
  "network": "devnet",
  "rpc_url": "https://api.devnet.solana.com",
  "version": "3.0.2",
  "genesis_hash": "EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
}
```

### Fee Estimation

Estimate transaction fees.

```http
GET /api/solana/fees/estimate?transaction_size=1232
```

**Parameters:**
- `transaction_size` (integer): Transaction size in bytes (default: 1232)

**Response:**
```json
{
  "fee_estimation": {
    "base_fee": 0.000005,
    "priority_fee": 0.000001,
    "total_fee": 0.000006,
    "lamports": 6000
  },
  "network": "devnet"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "detail": "Error message",
  "error_code": "INVALID_WALLET_ADDRESS",
  "timestamp": "2025-10-05T08:28:26.499681+00:00"
}
```

### Common Error Codes

- `INVALID_WALLET_ADDRESS`: Invalid Solana wallet address format
- `WALLET_NOT_FOUND`: Wallet address not found on the network
- `INSUFFICIENT_BALANCE`: Insufficient balance for transaction
- `INVALID_TRANSACTION`: Invalid transaction signature or format
- `NETWORK_ERROR`: Solana network connection error
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limiting

API requests are rate limited to prevent abuse:

- **General endpoints**: 100 requests per minute
- **Payment endpoints**: 10 requests per minute
- **Wallet endpoints**: 50 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696500060
```

## WebSocket Support

Real-time updates are available via WebSocket connections:

```javascript
const ws = new WebSocket('wss://api.soladia.com/ws/solana');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

### WebSocket Events

- `wallet:connected`: Wallet connection event
- `wallet:disconnected`: Wallet disconnection event
- `transaction:confirmed`: Transaction confirmation event
- `transaction:failed`: Transaction failure event
- `nft:listed`: NFT listing event
- `nft:sold`: NFT sale event

## SDK Examples

### JavaScript/TypeScript

```typescript
import { SoladiaAPI } from '@soladia/sdk';

const api = new SoladiaAPI({
  baseURL: 'https://api.soladia.com',
  walletAddress: '11111111111111111111111111111112'
});

// Get wallet balance
const balance = await api.wallet.getBalance();

// Create payment
const payment = await api.payments.create({
  to: '11111111111111111111111111111113',
  amount: 1.0,
  memo: 'Test payment'
});
```

### Python

```python
from soladia_sdk import SoladiaAPI

api = SoladiaAPI(
    base_url='https://api.soladia.com',
    wallet_address='11111111111111111111111111111112'
)

# Get wallet balance
balance = api.wallet.get_balance()

# Create payment
payment = api.payments.create(
    to='11111111111111111111111111111113',
    amount=1.0,
    memo='Test payment'
)
```

## Support

For API support and questions:

- **Email**: api-support@soladia.com
- **Discord**: https://discord.gg/soladia
- **Documentation**: https://docs.soladia.com
- **GitHub**: https://github.com/soladia/api
