/**
 * Solana API Integration Tests
 * Comprehensive testing for Solana API endpoints and services
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { solanaService } from '../../src/services/solana';

// Mock fetch globally
global.fetch = vi.fn();

describe('Solana API Integration Tests', () => {
  const baseURL = 'http://localhost:8000/api/solana';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('should check Solana network health successfully', async () => {
      const mockResponse = {
        status: 'healthy',
        network: 'mainnet',
        timestamp: '2024-01-01T00:00:00Z',
        blockHeight: 123456789,
        slot: 987654321
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockResponse }),
        status: 200
      } as Response);

      const response = await solanaService.getHealthStatus();

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/health`);
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('healthy');
      expect(response.data.network).toBe('mainnet');
    });

    it('should handle health check failure', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Network unavailable' }),
        status: 500
      } as Response);

      const response = await solanaService.getHealthStatus();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network unavailable');
    });

    it('should handle network timeout', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network timeout'));

      const response = await solanaService.getHealthStatus();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network timeout');
    });
  });

  describe('Wallet Information Endpoints', () => {
    it('should get wallet information successfully', async () => {
      const mockWalletInfo = {
        address: 'test-wallet-address',
        balance: 2.5,
        lamports: 2500000000,
        network: 'mainnet',
        owner: '11111111111111111111111111111112',
        executable: false,
        rent_epoch: 0
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockWalletInfo }),
        status: 200
      } as Response);

      const response = await solanaService.getWalletInfo('test-wallet-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/wallets/test-wallet-address/info`);
      expect(response.success).toBe(true);
      expect(response.data.address).toBe('test-wallet-address');
      expect(response.data.balance).toBe(2.5);
    });

    it('should get wallet balance successfully', async () => {
      const mockBalance = {
        balance_sol: 2.5,
        balance_lamports: 2500000000,
        token_accounts: [
          {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            balance: 1000,
            decimals: 6
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockBalance }),
        status: 200
      } as Response);

      const response = await solanaService.getWalletBalance('test-wallet-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/wallets/test-wallet-address/balance`);
      expect(response.success).toBe(true);
      expect(response.data.balance_sol).toBe(2.5);
      expect(response.data.token_accounts).toHaveLength(1);
    });

    it('should handle invalid wallet address', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid wallet address' }),
        status: 400
      } as Response);

      const response = await solanaService.getWalletInfo('invalid-address');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid wallet address');
    });
  });

  describe('Transaction Endpoints', () => {
    it('should create transfer transaction successfully', async () => {
      const transactionData = {
        from_address: 'from-address',
        to_address: 'to-address',
        amount: 1.5,
        memo: 'Test transfer'
      };

      const mockTransaction = {
        transaction: 'base64-encoded-transaction',
        signature: 'test-signature',
        fee: 5000,
        blockhash: 'test-blockhash'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTransaction }),
        status: 200
      } as Response);

      const response = await solanaService.createTransferTransaction(transactionData);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/transactions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });
      expect(response.success).toBe(true);
      expect(response.data.transaction).toBe('base64-encoded-transaction');
    });

    it('should verify transaction successfully', async () => {
      const mockVerification = {
        confirmed: true,
        success: true,
        slot: 12345,
        blockTime: 1640995200,
        fee: 5000,
        error: null
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockVerification }),
        status: 200
      } as Response);

      const response = await solanaService.verifyTransaction('test-signature');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/transactions/test-signature/verify`);
      expect(response.success).toBe(true);
      expect(response.data.confirmed).toBe(true);
      expect(response.data.success).toBe(true);
    });

    it('should get transaction details successfully', async () => {
      const mockTransaction = {
        signature: 'test-signature',
        slot: 12345,
        blockTime: 1640995200,
        confirmationStatus: 'confirmed',
        err: null,
        fee: 5000,
        accounts: ['account1', 'account2'],
        instructions: [
          {
            programId: 'program1',
            accounts: ['acc1'],
            data: 'data1'
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTransaction }),
        status: 200
      } as Response);

      const response = await solanaService.getTransaction('test-signature');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/transactions/test-signature`);
      expect(response.success).toBe(true);
      expect(response.data.signature).toBe('test-signature');
      expect(response.data.slot).toBe(12345);
    });

    it('should get transaction history successfully', async () => {
      const mockHistory = {
        transactions: [
          {
            signature: 'tx1',
            slot: 12345,
            blockTime: 1640995200,
            type: 'transfer',
            amount: 1.5,
            currency: 'SOL'
          },
          {
            signature: 'tx2',
            slot: 12346,
            blockTime: 1640995260,
            type: 'transfer',
            amount: 2.0,
            currency: 'SOL'
          }
        ],
        total: 2,
        hasMore: false
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockHistory }),
        status: 200
      } as Response);

      const response = await solanaService.getTransactionHistory('test-address', 10);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/wallets/test-address/transactions?limit=10`);
      expect(response.success).toBe(true);
      expect(response.data.transactions).toHaveLength(2);
    });
  });

  describe('Token Endpoints', () => {
    it('should get token information successfully', async () => {
      const mockTokenInfo = {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        supply: 1000000000,
        owner: 'owner-program'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTokenInfo }),
        status: 200
      } as Response);

      const response = await solanaService.getTokenInfo('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`);
      expect(response.success).toBe(true);
      expect(response.data.name).toBe('USD Coin');
      expect(response.data.symbol).toBe('USDC');
    });

    it('should get user tokens successfully', async () => {
      const mockUserTokens = [
        {
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          balance: 1000,
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC'
        },
        {
          mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          balance: 500,
          decimals: 6,
          name: 'Tether USD',
          symbol: 'USDT'
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockUserTokens }),
        status: 200
      } as Response);

      const response = await solanaService.getUserTokens('test-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/wallets/test-address/tokens`);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });

    it('should transfer token successfully', async () => {
      const transferData = {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        from_address: 'from-address',
        to_address: 'to-address',
        amount: 1000
      };

      const mockTransfer = {
        signature: 'transfer-signature',
        transaction: 'base64-encoded-transaction',
        fee: 5000
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTransfer }),
        status: 200
      } as Response);

      const response = await solanaService.transferToken(transferData);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/tokens/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferData)
      });
      expect(response.success).toBe(true);
      expect(response.data.signature).toBe('transfer-signature');
    });
  });

  describe('NFT Endpoints', () => {
    it('should get NFT information successfully', async () => {
      const mockNFTInfo = {
        mint: 'test-nft-mint',
        name: 'Test NFT',
        description: 'Test NFT Description',
        image: 'https://example.com/image.jpg',
        attributes: [
          { trait_type: 'Color', value: 'Blue' },
          { trait_type: 'Rarity', value: 'Rare' }
        ],
        collection: 'Test Collection',
        owner: 'test-owner'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockNFTInfo }),
        status: 200
      } as Response);

      const response = await solanaService.getNFTInfo('test-nft-mint');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/nfts/test-nft-mint`);
      expect(response.success).toBe(true);
      expect(response.data.name).toBe('Test NFT');
      expect(response.data.attributes).toHaveLength(2);
    });

    it('should get user NFTs successfully', async () => {
      const mockUserNFTs = [
        {
          mint: 'nft1',
          name: 'NFT 1',
          image: 'https://example.com/nft1.jpg',
          collection: 'Collection 1'
        },
        {
          mint: 'nft2',
          name: 'NFT 2',
          image: 'https://example.com/nft2.jpg',
          collection: 'Collection 2'
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockUserNFTs }),
        status: 200
      } as Response);

      const response = await solanaService.getUserNFTs('test-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/wallets/test-address/nfts`);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });

    it('should create NFT successfully', async () => {
      const nftData = {
        name: 'Test NFT',
        description: 'Test NFT Description',
        image: 'https://example.com/image.jpg',
        attributes: [
          { trait_type: 'Color', value: 'Blue' }
        ]
      };

      const mockCreateNFT = {
        mint: 'new-nft-mint',
        signature: 'create-signature',
        transaction: 'base64-encoded-transaction'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockCreateNFT }),
        status: 200
      } as Response);

      const response = await solanaService.createNFT(nftData);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/nfts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nftData)
      });
      expect(response.success).toBe(true);
      expect(response.data.mint).toBe('new-nft-mint');
    });

    it('should transfer NFT successfully', async () => {
      const transferData = {
        mint: 'test-nft-mint',
        from_address: 'from-address',
        to_address: 'to-address'
      };

      const mockTransfer = {
        signature: 'transfer-signature',
        transaction: 'base64-encoded-transaction'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTransfer }),
        status: 200
      } as Response);

      const response = await solanaService.transferNFT(
        transferData.mint,
        transferData.from_address,
        transferData.to_address
      );

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/nfts/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferData)
      });
      expect(response.success).toBe(true);
      expect(response.data.signature).toBe('transfer-signature');
    });
  });

  describe('Escrow Endpoints', () => {
    it('should create escrow successfully', async () => {
      const escrowData = {
        amount: 2.5,
        currency: 'SOL',
        buyer: 'buyer-address',
        seller: 'seller-address',
        expires_in_hours: 24
      };

      const mockEscrow = {
        escrow_address: 'escrow-address',
        signature: 'create-signature',
        transaction: 'base64-encoded-transaction'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockEscrow }),
        status: 200
      } as Response);

      const response = await solanaService.createEscrow(escrowData);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/escrow/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(escrowData)
      });
      expect(response.success).toBe(true);
      expect(response.data.escrow_address).toBe('escrow-address');
    });

    it('should fund escrow successfully', async () => {
      const mockFund = {
        signature: 'fund-signature',
        transaction: 'base64-encoded-transaction',
        fee: 5000
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockFund }),
        status: 200
      } as Response);

      const response = await solanaService.fundEscrow('escrow-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/escrow/escrow-address/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(response.success).toBe(true);
      expect(response.data.signature).toBe('fund-signature');
    });

    it('should release escrow successfully', async () => {
      const mockRelease = {
        signature: 'release-signature',
        transaction: 'base64-encoded-transaction',
        fee: 5000
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockRelease }),
        status: 200
      } as Response);

      const response = await solanaService.releaseEscrow('escrow-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/escrow/escrow-address/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(response.success).toBe(true);
      expect(response.data.signature).toBe('release-signature');
    });

    it('should cancel escrow successfully', async () => {
      const mockCancel = {
        signature: 'cancel-signature',
        transaction: 'base64-encoded-transaction',
        fee: 5000
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockCancel }),
        status: 200
      } as Response);

      const response = await solanaService.cancelEscrow('escrow-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/escrow/escrow-address/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(response.success).toBe(true);
      expect(response.data.signature).toBe('cancel-signature');
    });

    it('should get escrow information successfully', async () => {
      const mockEscrowInfo = {
        escrow_address: 'escrow-address',
        amount: 2.5,
        currency: 'SOL',
        buyer: 'buyer-address',
        seller: 'seller-address',
        status: 'funded',
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-02T00:00:00Z'
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockEscrowInfo }),
        status: 200
      } as Response);

      const response = await solanaService.getEscrowInfo('escrow-address');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/escrow/escrow-address`);
      expect(response.success).toBe(true);
      expect(response.data.escrow_address).toBe('escrow-address');
      expect(response.data.status).toBe('funded');
    });
  });

  describe('Network Information Endpoints', () => {
    it('should get network information successfully', async () => {
      const mockNetworkInfo = {
        network: 'mainnet',
        blockHeight: 123456789,
        slot: 987654321,
        epoch: 123,
        slotTime: 1640995200,
        totalSupply: 500000000,
        circulatingSupply: 400000000
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockNetworkInfo }),
        status: 200
      } as Response);

      const response = await solanaService.getNetworkInfo();

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/network`);
      expect(response.success).toBe(true);
      expect(response.data.network).toBe('mainnet');
      expect(response.data.blockHeight).toBe(123456789);
    });

    it('should get recent blocks successfully', async () => {
      const mockBlocks = [
        {
          slot: 12345,
          blockhash: 'blockhash1',
          blockTime: 1640995200,
          transactionCount: 100
        },
        {
          slot: 12346,
          blockhash: 'blockhash2',
          blockTime: 1640995260,
          transactionCount: 150
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockBlocks }),
        status: 200
      } as Response);

      const response = await solanaService.getRecentBlocks(10);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/network/blocks?limit=10`);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });

    it('should get recent transactions successfully', async () => {
      const mockTransactions = [
        {
          signature: 'tx1',
          slot: 12345,
          blockTime: 1640995200,
          fee: 5000,
          success: true
        },
        {
          signature: 'tx2',
          slot: 12346,
          blockTime: 1640995260,
          fee: 5000,
          success: true
        }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTransactions }),
        status: 200
      } as Response);

      const response = await solanaService.getRecentTransactions(10);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/network/transactions?limit=10`);
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const response = await solanaService.getHealthStatus();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });

    it('should handle HTTP errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Internal server error' }),
        status: 500
      } as Response);

      const response = await solanaService.getHealthStatus();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Internal server error');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
        status: 200
      } as Response);

      const response = await solanaService.getHealthStatus();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid JSON');
    });

    it('should handle timeout errors gracefully', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const response = await solanaService.getHealthStatus();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Request timeout');
    });
  });

  describe('Request Configuration', () => {
    it('should use correct headers for all requests', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
        status: 200
      } as Response);

      await solanaService.getHealthStatus();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle different HTTP methods correctly', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
        status: 200
      } as Response);

      // GET request
      await solanaService.getHealthStatus();
      expect(fetch).toHaveBeenCalledWith(expect.any(String), undefined);

      // POST request
      await solanaService.createTransferTransaction({
        from_address: 'from',
        to_address: 'to',
        amount: 1.0
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );
    });
  });
});
