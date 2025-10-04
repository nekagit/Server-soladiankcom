/**
 * Test suite for Solana wallet service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enhancedSolanaWalletService } from '../services/solana/solana-wallet';

// Mock window.solana
const mockPhantom = {
  isPhantom: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  request: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  publicKey: null,
  isConnected: false,
};

const mockSolflare = {
  isSolflare: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  request: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  publicKey: null,
  isConnected: false,
};

const mockBackpack = {
  isBackpack: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  request: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  publicKey: null,
  isConnected: false,
};

// Mock window object
Object.defineProperty(window, 'solana', {
  value: mockPhantom,
  writable: true,
});

Object.defineProperty(window, 'solflare', {
  value: mockSolflare,
  writable: true,
});

Object.defineProperty(window, 'backpack', {
  value: mockBackpack,
  writable: true,
});

describe('Enhanced Solana Wallet Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset wallet state
    enhancedSolanaWalletService.disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Wallet Detection', () => {
    it('should detect Phantom wallet', () => {
      const wallets = enhancedSolanaWalletService.getAvailableWallets();
      expect(wallets).toContain('phantom');
    });

    it('should detect Solflare wallet', () => {
      const wallets = enhancedSolanaWalletService.getAvailableWallets();
      expect(wallets).toContain('solflare');
    });

    it('should detect Backpack wallet', () => {
      const wallets = enhancedSolanaWalletService.getAvailableWallets();
      expect(wallets).toContain('backpack');
    });
  });

  describe('Connection Management', () => {
    it('should connect to Phantom wallet successfully', async () => {
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;

      const result = await enhancedSolanaWalletService.connect('phantom');

      expect(result.success).toBe(true);
      expect(result.wallet).toBe('phantom');
      expect(result.publicKey).toBe('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
      expect(enhancedSolanaWalletService.isConnected()).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockPhantom.connect.mockRejectedValue(new Error('User rejected'));

      const result = await enhancedSolanaWalletService.connect('phantom');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User rejected');
      expect(enhancedSolanaWalletService.isConnected()).toBe(false);
    });

    it('should disconnect wallet successfully', async () => {
      // First connect
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;
      await enhancedSolanaWalletService.connect('phantom');

      // Then disconnect
      mockPhantom.disconnect.mockResolvedValue(undefined);
      const result = await enhancedSolanaWalletService.disconnect();

      expect(result.success).toBe(true);
      expect(enhancedSolanaWalletService.isConnected()).toBe(false);
      expect(enhancedSolanaWalletService.getCurrentWallet()).toBe(null);
    });
  });

  describe('Wallet Information', () => {
    it('should get current wallet info when connected', async () => {
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;
      await enhancedSolanaWalletService.connect('phantom');

      const walletInfo = enhancedSolanaWalletService.getWalletInfo();

      expect(walletInfo).toEqual({
        wallet: 'phantom',
        publicKey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        isConnected: true,
        network: 'devnet'
      });
    });

    it('should return null wallet info when disconnected', () => {
      const walletInfo = enhancedSolanaWalletService.getWalletInfo();
      expect(walletInfo).toBe(null);
    });
  });

  describe('Transaction Signing', () => {
    it('should sign transaction successfully', async () => {
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;
      await enhancedSolanaWalletService.connect('phantom');

      const mockTransaction = { serialize: () => new Uint8Array([1, 2, 3]) };
      const mockSignedTransaction = { serialize: () => new Uint8Array([4, 5, 6]) };
      mockPhantom.signTransaction.mockResolvedValue(mockSignedTransaction);

      const result = await enhancedSolanaWalletService.signTransaction(mockTransaction);

      expect(result.success).toBe(true);
      expect(result.signedTransaction).toBe(mockSignedTransaction);
    });

    it('should handle transaction signing failure', async () => {
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;
      await enhancedSolanaWalletService.connect('phantom');

      const mockTransaction = { serialize: () => new Uint8Array([1, 2, 3]) };
      mockPhantom.signTransaction.mockRejectedValue(new Error('Transaction rejected'));

      const result = await enhancedSolanaWalletService.signTransaction(mockTransaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction rejected');
    });

    it('should return error when not connected', async () => {
      const mockTransaction = { serialize: () => new Uint8Array([1, 2, 3]) };
      const result = await enhancedSolanaWalletService.signTransaction(mockTransaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No wallet connected');
    });
  });

  describe('Balance Management', () => {
    it('should get wallet balance', async () => {
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;
      await enhancedSolanaWalletService.connect('phantom');

      // Mock fetch for balance API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          balance: 2.5,
          lamports: 2500000000,
          exists: true
        })
      });

      const balance = await enhancedSolanaWalletService.getBalance();

      expect(balance).toBe(2.5);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/solana/wallets/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/balance')
      );
    });

    it('should handle balance fetch error', async () => {
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;
      await enhancedSolanaWalletService.connect('phantom');

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const balance = await enhancedSolanaWalletService.getBalance();

      expect(balance).toBe(0);
    });
  });

  describe('Event Handling', () => {
    it('should handle wallet account change', () => {
      const mockCallback = vi.fn();
      enhancedSolanaWalletService.onAccountChange(mockCallback);

      // Simulate account change
      const mockPublicKey = { toString: () => 'NewPublicKey' };
      mockPhantom.publicKey = mockPublicKey;
      
      // Trigger the event handler
      const eventHandler = mockPhantom.on.mock.calls.find(call => call[0] === 'accountChanged');
      if (eventHandler) {
        eventHandler[1](mockPublicKey);
      }

      expect(mockCallback).toHaveBeenCalledWith(mockPublicKey);
    });

    it('should handle wallet disconnect event', () => {
      const mockCallback = vi.fn();
      enhancedSolanaWalletService.onDisconnect(mockCallback);

      // Trigger the disconnect event
      const eventHandler = mockPhantom.on.mock.calls.find(call => call[0] === 'disconnect');
      if (eventHandler) {
        eventHandler[1]();
      }

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle wallet not found error', async () => {
      // Remove wallet from window
      delete (window as any).solana;

      const result = await enhancedSolanaWalletService.connect('phantom');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Phantom wallet not found');
    });

    it('should handle network errors gracefully', async () => {
      const mockPublicKey = { toString: () => '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' };
      mockPhantom.connect.mockResolvedValue({ publicKey: mockPublicKey });
      mockPhantom.publicKey = mockPublicKey;
      mockPhantom.isConnected = true;
      await enhancedSolanaWalletService.connect('phantom');

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const balance = await enhancedSolanaWalletService.getBalance();
      expect(balance).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('should validate Solana address format', () => {
      const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      const invalidAddress = 'invalid-address';

      expect(enhancedSolanaWalletService.isValidAddress(validAddress)).toBe(true);
      expect(enhancedSolanaWalletService.isValidAddress(invalidAddress)).toBe(false);
    });

    it('should format balance correctly', () => {
      expect(enhancedSolanaWalletService.formatBalance(2.5)).toBe('2.5 SOL');
      expect(enhancedSolanaWalletService.formatBalance(0.001)).toBe('0.001 SOL');
      expect(enhancedSolanaWalletService.formatBalance(1000)).toBe('1,000 SOL');
    });

    it('should get network info', () => {
      const networkInfo = enhancedSolanaWalletService.getNetworkInfo();
      
      expect(networkInfo).toEqual({
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        explorerUrl: 'https://explorer.solana.com/?cluster=devnet'
      });
    });
  });
});
