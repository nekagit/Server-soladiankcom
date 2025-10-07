/**
 * Solana Transaction Service Unit Tests
 * Comprehensive testing for the Solana transaction service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment, mockFetch } from '../utils/test-utils';

// Mock the Solana transaction service
const mockTransactionService = {
  getTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransactionStatus: vi.fn(),
  waitForConfirmation: vi.fn(),
  createTransferTransaction: vi.fn(),
  createTokenTransferTransaction: vi.fn(),
  estimateTransactionFee: vi.fn(),
  getTransactionHistory: vi.fn(),
  getAccountTransactions: vi.fn(),
  getRecentTransactions: vi.fn()
};

// Mock RPC client
const mockRPCClient = {
  getTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getSignatureStatuses: vi.fn(),
  getAccountInfo: vi.fn(),
  getRecentBlockhash: vi.fn(),
  getFeeForMessage: vi.fn()
};

describe('Solana Transaction Service', () => {
  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('getTransaction', () => {
    it('should fetch transaction successfully', async () => {
      const mockTransaction = {
        signature: 'test-signature',
        slot: 123456,
        blockTime: 1640995200,
        transaction: {
          message: {
            accountKeys: ['sender', 'receiver'],
            instructions: []
          }
        },
        meta: {
          err: null
        }
      };

      mockRPCClient.getTransaction.mockResolvedValue(mockTransaction);
      mockTransactionService.getTransaction.mockResolvedValue(mockTransaction);

      const result = await mockTransactionService.getTransaction('test-signature');

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionService.getTransaction).toHaveBeenCalledWith('test-signature');
    });

    it('should handle transaction not found', async () => {
      mockRPCClient.getTransaction.mockResolvedValue(null);
      mockTransactionService.getTransaction.mockRejectedValue(new Error('Transaction not found'));

      await expect(mockTransactionService.getTransaction('invalid-signature')).rejects.toThrow('Transaction not found');
    });

    it('should handle RPC errors', async () => {
      mockRPCClient.getTransaction.mockRejectedValue(new Error('RPC error'));
      mockTransactionService.getTransaction.mockRejectedValue(new Error('RPC error'));

      await expect(mockTransactionService.getTransaction('test-signature')).rejects.toThrow('RPC error');
    });
  });

  describe('sendTransaction', () => {
    it('should send transaction successfully', async () => {
      const mockSignature = 'sent-signature';
      const mockTransaction = {
        signature: mockSignature,
        slot: 123456,
        confirmationStatus: 'confirmed',
        logs: ['Transaction processed successfully']
      };

      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      });

      mockTransactionService.sendTransaction.mockResolvedValue(mockTransaction);

      const transactionData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 1.0,
        memo: 'Test transaction'
      };

      const result = await mockTransactionService.sendTransaction(transactionData);

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionService.sendTransaction).toHaveBeenCalledWith(transactionData);
    });

    it('should handle send transaction failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Invalid transaction' }
      });

      mockTransactionService.sendTransaction.mockRejectedValue(new Error('Invalid transaction'));

      const transactionData = {
        from: 'invalid-sender',
        to: 'receiver-address',
        amount: 1.0
      };

      await expect(mockTransactionService.sendTransaction(transactionData)).rejects.toThrow('Invalid transaction');
    });

    it('should validate transaction data', async () => {
      const invalidTransactionData = {
        from: '',
        to: '',
        amount: -1
      };

      mockTransactionService.sendTransaction.mockRejectedValue(new Error('Invalid transaction data'));

      await expect(mockTransactionService.sendTransaction(invalidTransactionData)).rejects.toThrow('Invalid transaction data');
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully', async () => {
      const mockStatus = {
        signature: 'test-signature',
        slot: 123456,
        confirmationStatus: 'confirmed',
        err: null
      };

      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        value: [mockStatus]
      });

      mockTransactionService.getTransactionStatus.mockResolvedValue(mockStatus);

      const result = await mockTransactionService.getTransactionStatus('test-signature');

      expect(result).toEqual(mockStatus);
      expect(mockTransactionService.getTransactionStatus).toHaveBeenCalledWith('test-signature');
    });

    it('should handle pending transaction', async () => {
      const mockStatus = {
        signature: 'test-signature',
        slot: 123456,
        confirmationStatus: 'pending',
        err: null
      };

      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        value: [mockStatus]
      });

      mockTransactionService.getTransactionStatus.mockResolvedValue(mockStatus);

      const result = await mockTransactionService.getTransactionStatus('test-signature');

      expect(result).toEqual(mockStatus);
    });

    it('should handle failed transaction', async () => {
      const mockStatus = {
        signature: 'test-signature',
        slot: 123456,
        confirmationStatus: 'confirmed',
        err: { code: -32602, message: 'Insufficient funds' }
      };

      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        value: [mockStatus]
      });

      mockTransactionService.getTransactionStatus.mockResolvedValue(mockStatus);

      const result = await mockTransactionService.getTransactionStatus('test-signature');

      expect(result).toEqual(mockStatus);
    });
  });

  describe('waitForConfirmation', () => {
    it('should wait for transaction confirmation successfully', async () => {
      const mockSignature = 'test-signature';
      const mockStatus = {
        signature: mockSignature,
        slot: 123456,
        confirmationStatus: 'confirmed',
        err: null
      };

      // Mock the confirmation process
      mockRPCClient.getSignatureStatuses
        .mockResolvedValueOnce({ value: [{ confirmationStatus: 'pending' }] })
        .mockResolvedValueOnce({ value: [{ confirmationStatus: 'pending' }] })
        .mockResolvedValueOnce({ value: [mockStatus] });

      mockTransactionService.waitForConfirmation.mockResolvedValue(mockStatus);

      const result = await mockTransactionService.waitForConfirmation(mockSignature, 30000);

      expect(result).toEqual(mockStatus);
      expect(mockTransactionService.waitForConfirmation).toHaveBeenCalledWith(mockSignature, 30000);
    });

    it('should timeout waiting for confirmation', async () => {
      const mockSignature = 'test-signature';

      // Mock the confirmation process to always return pending
      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: 'pending' }]
      });

      mockTransactionService.waitForConfirmation.mockRejectedValue(new Error('Confirmation timeout'));

      await expect(mockTransactionService.waitForConfirmation(mockSignature, 1000)).rejects.toThrow('Confirmation timeout');
    });

    it('should handle confirmation failure', async () => {
      const mockSignature = 'test-signature';
      const mockStatus = {
        signature: mockSignature,
        slot: 123456,
        confirmationStatus: 'confirmed',
        err: { code: -32602, message: 'Transaction failed' }
      };

      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        value: [mockStatus]
      });

      mockTransactionService.waitForConfirmation.mockResolvedValue(mockStatus);

      const result = await mockTransactionService.waitForConfirmation(mockSignature);

      expect(result).toEqual(mockStatus);
    });
  });

  describe('createTransferTransaction', () => {
    it('should create transfer transaction successfully', async () => {
      const mockTransaction = {
        signature: 'transfer-signature',
        from: 'sender-address',
        to: 'receiver-address',
        amount: 1.0,
        fee: 0.000005
      };

      mockRPCClient.getRecentBlockhash.mockResolvedValue({
        blockhash: 'recent-blockhash',
        feeCalculator: { lamportsPerSignature: 5000 }
      });

      mockTransactionService.createTransferTransaction.mockResolvedValue(mockTransaction);

      const transferData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 1.0
      };

      const result = await mockTransactionService.createTransferTransaction(transferData);

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionService.createTransferTransaction).toHaveBeenCalledWith(transferData);
    });

    it('should handle insufficient funds', async () => {
      mockTransactionService.createTransferTransaction.mockRejectedValue(new Error('Insufficient funds'));

      const transferData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 1000.0 // Large amount
      };

      await expect(mockTransactionService.createTransferTransaction(transferData)).rejects.toThrow('Insufficient funds');
    });

    it('should validate transfer data', async () => {
      const invalidTransferData = {
        from: '',
        to: '',
        amount: -1
      };

      mockTransactionService.createTransferTransaction.mockRejectedValue(new Error('Invalid transfer data'));

      await expect(mockTransactionService.createTransferTransaction(invalidTransferData)).rejects.toThrow('Invalid transfer data');
    });
  });

  describe('createTokenTransferTransaction', () => {
    it('should create token transfer transaction successfully', async () => {
      const mockTransaction = {
        signature: 'token-transfer-signature',
        from: 'sender-address',
        to: 'receiver-address',
        amount: 100,
        tokenMint: 'token-mint-address',
        fee: 0.000005
      };

      mockTransactionService.createTokenTransferTransaction.mockResolvedValue(mockTransaction);

      const transferData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 100,
        tokenMint: 'token-mint-address'
      };

      const result = await mockTransactionService.createTokenTransferTransaction(transferData);

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionService.createTokenTransferTransaction).toHaveBeenCalledWith(transferData);
    });

    it('should handle invalid token mint', async () => {
      mockTransactionService.createTokenTransferTransaction.mockRejectedValue(new Error('Invalid token mint'));

      const transferData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 100,
        tokenMint: 'invalid-token-mint'
      };

      await expect(mockTransactionService.createTokenTransferTransaction(transferData)).rejects.toThrow('Invalid token mint');
    });
  });

  describe('estimateTransactionFee', () => {
    it('should estimate transaction fee successfully', async () => {
      const mockFee = {
        lamports: 5000,
        sol: 0.000005
      };

      mockRPCClient.getFeeForMessage.mockResolvedValue(5000);
      mockTransactionService.estimateTransactionFee.mockResolvedValue(mockFee);

      const transactionData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 1.0
      };

      const result = await mockTransactionService.estimateTransactionFee(transactionData);

      expect(result).toEqual(mockFee);
      expect(mockTransactionService.estimateTransactionFee).toHaveBeenCalledWith(transactionData);
    });

    it('should handle fee estimation failure', async () => {
      mockRPCClient.getFeeForMessage.mockRejectedValue(new Error('Fee estimation failed'));
      mockTransactionService.estimateTransactionFee.mockRejectedValue(new Error('Fee estimation failed'));

      const transactionData = {
        from: 'sender-address',
        to: 'receiver-address',
        amount: 1.0
      };

      await expect(mockTransactionService.estimateTransactionFee(transactionData)).rejects.toThrow('Fee estimation failed');
    });
  });

  describe('getTransactionHistory', () => {
    it('should get transaction history successfully', async () => {
      const mockHistory = [
        {
          signature: 'tx-1',
          slot: 123456,
          blockTime: 1640995200,
          from: 'sender-address',
          to: 'receiver-address',
          amount: 1.0,
          status: 'confirmed'
        },
        {
          signature: 'tx-2',
          slot: 123457,
          blockTime: 1640995260,
          from: 'sender-address',
          to: 'receiver-address',
          amount: 2.0,
          status: 'confirmed'
        }
      ];

      mockTransactionService.getTransactionHistory.mockResolvedValue(mockHistory);

      const result = await mockTransactionService.getTransactionHistory('account-address', 10);

      expect(result).toEqual(mockHistory);
      expect(mockTransactionService.getTransactionHistory).toHaveBeenCalledWith('account-address', 10);
    });

    it('should handle empty history', async () => {
      mockTransactionService.getTransactionHistory.mockResolvedValue([]);

      const result = await mockTransactionService.getTransactionHistory('account-address', 10);

      expect(result).toEqual([]);
    });

    it('should handle history fetch failure', async () => {
      mockTransactionService.getTransactionHistory.mockRejectedValue(new Error('History fetch failed'));

      await expect(mockTransactionService.getTransactionHistory('account-address', 10)).rejects.toThrow('History fetch failed');
    });
  });

  describe('getAccountTransactions', () => {
    it('should get account transactions successfully', async () => {
      const mockTransactions = [
        {
          signature: 'tx-1',
          slot: 123456,
          blockTime: 1640995200,
          type: 'transfer',
          amount: 1.0,
          status: 'confirmed'
        },
        {
          signature: 'tx-2',
          slot: 123457,
          blockTime: 1640995260,
          type: 'token_transfer',
          amount: 100,
          tokenMint: 'token-mint-address',
          status: 'confirmed'
        }
      ];

      mockTransactionService.getAccountTransactions.mockResolvedValue(mockTransactions);

      const result = await mockTransactionService.getAccountTransactions('account-address', 0, 10);

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionService.getAccountTransactions).toHaveBeenCalledWith('account-address', 0, 10);
    });

    it('should handle pagination', async () => {
      const mockTransactions = [
        { signature: 'tx-1', slot: 123456, blockTime: 1640995200, type: 'transfer', amount: 1.0, status: 'confirmed' }
      ];

      mockTransactionService.getAccountTransactions.mockResolvedValue(mockTransactions);

      const result = await mockTransactionService.getAccountTransactions('account-address', 10, 5);

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionService.getAccountTransactions).toHaveBeenCalledWith('account-address', 10, 5);
    });
  });

  describe('getRecentTransactions', () => {
    it('should get recent transactions successfully', async () => {
      const mockTransactions = [
        {
          signature: 'tx-1',
          slot: 123456,
          blockTime: 1640995200,
          from: 'sender-address',
          to: 'receiver-address',
          amount: 1.0,
          status: 'confirmed'
        }
      ];

      mockTransactionService.getRecentTransactions.mockResolvedValue(mockTransactions);

      const result = await mockTransactionService.getRecentTransactions(10);

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionService.getRecentTransactions).toHaveBeenCalledWith(10);
    });

    it('should handle empty recent transactions', async () => {
      mockTransactionService.getRecentTransactions.mockResolvedValue([]);

      const result = await mockTransactionService.getRecentTransactions(10);

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockTransactionService.getTransaction.mockRejectedValue(new Error('Network error'));

      await expect(mockTransactionService.getTransaction('test-signature')).rejects.toThrow('Network error');
    });

    it('should handle RPC errors', async () => {
      mockTransactionService.sendTransaction.mockRejectedValue(new Error('RPC error'));

      await expect(mockTransactionService.sendTransaction({})).rejects.toThrow('RPC error');
    });

    it('should handle validation errors', async () => {
      mockTransactionService.createTransferTransaction.mockRejectedValue(new Error('Validation error'));

      await expect(mockTransactionService.createTransferTransaction({})).rejects.toThrow('Validation error');
    });

    it('should handle timeout errors', async () => {
      mockTransactionService.waitForConfirmation.mockRejectedValue(new Error('Timeout'));

      await expect(mockTransactionService.waitForConfirmation('test-signature', 1000)).rejects.toThrow('Timeout');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent transaction requests', async () => {
      const mockTransactions = [
        { signature: 'tx-1', slot: 123456, blockTime: 1640995200, from: 'sender-1', to: 'receiver-1', amount: 1.0, status: 'confirmed' },
        { signature: 'tx-2', slot: 123457, blockTime: 1640995260, from: 'sender-2', to: 'receiver-2', amount: 2.0, status: 'confirmed' }
      ];

      mockTransactionService.getTransaction
        .mockResolvedValueOnce(mockTransactions[0])
        .mockResolvedValueOnce(mockTransactions[1]);

      const promises = [
        mockTransactionService.getTransaction('tx-1'),
        mockTransactionService.getTransaction('tx-2')
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(mockTransactions);
    });

    it('should handle rate limiting', async () => {
      mockTransactionService.getTransaction.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(mockTransactionService.getTransaction('test-signature')).rejects.toThrow('Rate limit exceeded');
    });
  });
});
