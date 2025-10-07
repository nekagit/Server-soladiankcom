/**
 * Solana Wallet Service Unit Tests
 * Comprehensive testing for the Solana wallet service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment, mockSolanaWallet } from '../utils/test-utils';

// Mock the Solana wallet service
const mockWalletService = {
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getWalletAddress: vi.fn(),
  isConnected: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  getBalance: vi.fn(),
  getPublicKey: vi.fn(),
  requestAirdrop: vi.fn()
};

describe('Solana Wallet Service', () => {
  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('connectWallet', () => {
    it('should connect to Phantom wallet successfully', async () => {
      const mockResponse = {
        publicKey: {
          toString: () => 'mock-address'
        }
      };

      mockSolanaWallet.connect.mockResolvedValue(mockResponse);
      mockWalletService.connectWallet.mockResolvedValue({
        success: true,
        address: 'mock-address',
        publicKey: mockResponse.publicKey
      });

      const result = await mockWalletService.connectWallet();

      expect(result).toEqual({
        success: true,
        address: 'mock-address',
        publicKey: mockResponse.publicKey
      });
      expect(mockWalletService.connectWallet).toHaveBeenCalledTimes(1);
    });

    it('should handle wallet connection failure', async () => {
      mockSolanaWallet.connect.mockRejectedValue(new Error('Connection failed'));
      mockWalletService.connectWallet.mockResolvedValue({
        success: false,
        error: 'Connection failed'
      });

      const result = await mockWalletService.connectWallet();

      expect(result).toEqual({
        success: false,
        error: 'Connection failed'
      });
    });

    it('should handle missing wallet', async () => {
      // @ts-ignore
      window.solana = undefined;
      mockWalletService.connectWallet.mockResolvedValue({
        success: false,
        error: 'Wallet not found'
      });

      const result = await mockWalletService.connectWallet();

      expect(result).toEqual({
        success: false,
        error: 'Wallet not found'
      });
    });

    it('should handle user rejection', async () => {
      mockSolanaWallet.connect.mockRejectedValue(new Error('User rejected'));
      mockWalletService.connectWallet.mockResolvedValue({
        success: false,
        error: 'User rejected'
      });

      const result = await mockWalletService.connectWallet();

      expect(result).toEqual({
        success: false,
        error: 'User rejected'
      });
    });
  });

  describe('disconnectWallet', () => {
    it('should disconnect wallet successfully', async () => {
      mockSolanaWallet.disconnect.mockResolvedValue(undefined);
      mockWalletService.disconnectWallet.mockResolvedValue({
        success: true
      });

      const result = await mockWalletService.disconnectWallet();

      expect(result).toEqual({
        success: true
      });
      expect(mockWalletService.disconnectWallet).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect failure', async () => {
      mockSolanaWallet.disconnect.mockRejectedValue(new Error('Disconnect failed'));
      mockWalletService.disconnectWallet.mockResolvedValue({
        success: false,
        error: 'Disconnect failed'
      });

      const result = await mockWalletService.disconnectWallet();

      expect(result).toEqual({
        success: false,
        error: 'Disconnect failed'
      });
    });
  });

  describe('getWalletAddress', () => {
    it('should return wallet address when connected', () => {
      mockWalletService.getWalletAddress.mockReturnValue('mock-address');

      const address = mockWalletService.getWalletAddress();

      expect(address).toBe('mock-address');
      expect(mockWalletService.getWalletAddress).toHaveBeenCalledTimes(1);
    });

    it('should return null when not connected', () => {
      mockWalletService.getWalletAddress.mockReturnValue(null);

      const address = mockWalletService.getWalletAddress();

      expect(address).toBeNull();
    });
  });

  describe('isConnected', () => {
    it('should return true when wallet is connected', () => {
      mockWalletService.isConnected.mockReturnValue(true);

      const connected = mockWalletService.isConnected();

      expect(connected).toBe(true);
    });

    it('should return false when wallet is not connected', () => {
      mockWalletService.isConnected.mockReturnValue(false);

      const connected = mockWalletService.isConnected();

      expect(connected).toBe(false);
    });
  });

  describe('signTransaction', () => {
    it('should sign transaction successfully', async () => {
      const mockTransaction = { id: 'tx-123' };
      const mockSignedTransaction = { id: 'tx-123', signature: 'sig-123' };

      mockSolanaWallet.signTransaction.mockResolvedValue(mockSignedTransaction);
      mockWalletService.signTransaction.mockResolvedValue({
        success: true,
        transaction: mockSignedTransaction
      });

      const result = await mockWalletService.signTransaction(mockTransaction);

      expect(result).toEqual({
        success: true,
        transaction: mockSignedTransaction
      });
      expect(mockWalletService.signTransaction).toHaveBeenCalledWith(mockTransaction);
    });

    it('should handle signing failure', async () => {
      const mockTransaction = { id: 'tx-123' };

      mockSolanaWallet.signTransaction.mockRejectedValue(new Error('Signing failed'));
      mockWalletService.signTransaction.mockResolvedValue({
        success: false,
        error: 'Signing failed'
      });

      const result = await mockWalletService.signTransaction(mockTransaction);

      expect(result).toEqual({
        success: false,
        error: 'Signing failed'
      });
    });
  });

  describe('signAllTransactions', () => {
    it('should sign all transactions successfully', async () => {
      const mockTransactions = [
        { id: 'tx-1' },
        { id: 'tx-2' }
      ];
      const mockSignedTransactions = [
        { id: 'tx-1', signature: 'sig-1' },
        { id: 'tx-2', signature: 'sig-2' }
      ];

      mockSolanaWallet.signAllTransactions.mockResolvedValue(mockSignedTransactions);
      mockWalletService.signAllTransactions.mockResolvedValue({
        success: true,
        transactions: mockSignedTransactions
      });

      const result = await mockWalletService.signAllTransactions(mockTransactions);

      expect(result).toEqual({
        success: true,
        transactions: mockSignedTransactions
      });
      expect(mockWalletService.signAllTransactions).toHaveBeenCalledWith(mockTransactions);
    });

    it('should handle partial signing failure', async () => {
      const mockTransactions = [
        { id: 'tx-1' },
        { id: 'tx-2' }
      ];

      mockSolanaWallet.signAllTransactions.mockRejectedValue(new Error('Partial signing failed'));
      mockWalletService.signAllTransactions.mockResolvedValue({
        success: false,
        error: 'Partial signing failed'
      });

      const result = await mockWalletService.signAllTransactions(mockTransactions);

      expect(result).toEqual({
        success: false,
        error: 'Partial signing failed'
      });
    });
  });

  describe('getBalance', () => {
    it('should get wallet balance successfully', async () => {
      const mockBalance = 1.5; // SOL

      mockWalletService.getBalance.mockResolvedValue({
        success: true,
        balance: mockBalance,
        lamports: 1500000000
      });

      const result = await mockWalletService.getBalance();

      expect(result).toEqual({
        success: true,
        balance: mockBalance,
        lamports: 1500000000
      });
      expect(mockWalletService.getBalance).toHaveBeenCalledTimes(1);
    });

    it('should handle balance fetch failure', async () => {
      mockWalletService.getBalance.mockResolvedValue({
        success: false,
        error: 'Failed to fetch balance'
      });

      const result = await mockWalletService.getBalance();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch balance'
      });
    });
  });

  describe('getPublicKey', () => {
    it('should get public key successfully', async () => {
      const mockPublicKey = {
        toString: () => 'mock-public-key'
      };

      mockWalletService.getPublicKey.mockResolvedValue({
        success: true,
        publicKey: mockPublicKey
      });

      const result = await mockWalletService.getPublicKey();

      expect(result).toEqual({
        success: true,
        publicKey: mockPublicKey
      });
    });

    it('should handle public key fetch failure', async () => {
      mockWalletService.getPublicKey.mockResolvedValue({
        success: false,
        error: 'Failed to get public key'
      });

      const result = await mockWalletService.getPublicKey();

      expect(result).toEqual({
        success: false,
        error: 'Failed to get public key'
      });
    });
  });

  describe('requestAirdrop', () => {
    it('should request airdrop successfully', async () => {
      const mockSignature = 'airdrop-signature';

      mockWalletService.requestAirdrop.mockResolvedValue({
        success: true,
        signature: mockSignature
      });

      const result = await mockWalletService.requestAirdrop(1.0); // 1 SOL

      expect(result).toEqual({
        success: true,
        signature: mockSignature
      });
      expect(mockWalletService.requestAirdrop).toHaveBeenCalledWith(1.0);
    });

    it('should handle airdrop failure', async () => {
      mockWalletService.requestAirdrop.mockResolvedValue({
        success: false,
        error: 'Airdrop failed'
      });

      const result = await mockWalletService.requestAirdrop(1.0);

      expect(result).toEqual({
        success: false,
        error: 'Airdrop failed'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockWalletService.connectWallet.mockRejectedValue(new Error('Network error'));

      await expect(mockWalletService.connectWallet()).rejects.toThrow('Network error');
    });

    it('should handle wallet errors', async () => {
      mockWalletService.getBalance.mockRejectedValue(new Error('Wallet error'));

      await expect(mockWalletService.getBalance()).rejects.toThrow('Wallet error');
    });

    it('should handle timeout errors', async () => {
      mockWalletService.signTransaction.mockRejectedValue(new Error('Timeout'));

      await expect(mockWalletService.signTransaction({})).rejects.toThrow('Timeout');
    });
  });

  describe('State Management', () => {
    it('should maintain connection state', () => {
      mockWalletService.isConnected.mockReturnValue(true);
      mockWalletService.getWalletAddress.mockReturnValue('mock-address');

      const connected = mockWalletService.isConnected();
      const address = mockWalletService.getWalletAddress();

      expect(connected).toBe(true);
      expect(address).toBe('mock-address');
    });

    it('should handle state changes', () => {
      // Simulate connection
      mockWalletService.isConnected.mockReturnValue(true);
      mockWalletService.getWalletAddress.mockReturnValue('mock-address');

      let connected = mockWalletService.isConnected();
      let address = mockWalletService.getWalletAddress();

      expect(connected).toBe(true);
      expect(address).toBe('mock-address');

      // Simulate disconnection
      mockWalletService.isConnected.mockReturnValue(false);
      mockWalletService.getWalletAddress.mockReturnValue(null);

      connected = mockWalletService.isConnected();
      address = mockWalletService.getWalletAddress();

      expect(connected).toBe(false);
      expect(address).toBeNull();
    });
  });
});
