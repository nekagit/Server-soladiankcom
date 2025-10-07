import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SolanaTransactionService } from '../solana/solana-transaction'

// Mock the Solana RPC client
const mockRPCClient = {
  getTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getSignatureStatuses: vi.fn()
}

describe('SolanaTransactionService', () => {
  let transactionService: SolanaTransactionService

  beforeEach(() => {
    vi.clearAllMocks()
    transactionService = new SolanaTransactionService(mockRPCClient as any)
  })

  describe('getTransaction', () => {
    it('should fetch transaction successfully', async () => {
      const mockTransaction = {
        signature: 'test-signature',
        slot: 123456,
        blockTime: 1640995200,
        meta: { err: null },
        transaction: {
          message: {
            accountKeys: ['sender', 'receiver'],
            instructions: []
          }
        }
      }

      mockRPCClient.getTransaction.mockResolvedValue({
        result: mockTransaction,
        error: null
      })

      const result = await transactionService.getTransaction('test-signature')

      expect(result).toEqual(mockTransaction)
      expect(mockRPCClient.getTransaction).toHaveBeenCalledWith('test-signature')
    })

    it('should handle transaction not found', async () => {
      mockRPCClient.getTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Transaction not found' }
      })

      await expect(transactionService.getTransaction('invalid-signature'))
        .rejects.toThrow('Transaction not found')
    })
  })

  describe('sendTransaction', () => {
    it('should send transaction successfully', async () => {
      const mockSignature = 'sent-signature'
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      })

      const result = await transactionService.sendTransaction('encoded-transaction')

      expect(result).toEqual(mockSignature)
      expect(mockRPCClient.sendTransaction).toHaveBeenCalledWith('encoded-transaction')
    })

    it('should handle send transaction failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Invalid transaction' }
      })

      await expect(transactionService.sendTransaction('invalid-transaction'))
        .rejects.toThrow('Invalid transaction')
    })
  })

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully', async () => {
      const mockStatus = {
        signature: 'test-signature',
        slot: 123456,
        err: null,
        confirmationStatus: 'confirmed'
      }

      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        result: { value: [mockStatus] },
        error: null
      })

      const result = await transactionService.getTransactionStatus('test-signature')

      expect(result).toEqual(mockStatus)
      expect(mockRPCClient.getSignatureStatuses).toHaveBeenCalledWith(['test-signature'])
    })
  })

  describe('waitForConfirmation', () => {
    it('should wait for transaction confirmation', async () => {
      const mockStatus = {
        signature: 'test-signature',
        slot: 123456,
        err: null,
        confirmationStatus: 'confirmed'
      }

      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        result: { value: [mockStatus] },
        error: null
      })

      const result = await transactionService.waitForConfirmation('test-signature', 1000)

      expect(result).toEqual(mockStatus)
    })

    it('should timeout waiting for confirmation', async () => {
      mockRPCClient.getSignatureStatuses.mockResolvedValue({
        result: { value: [null] },
        error: null
      })

      await expect(transactionService.waitForConfirmation('test-signature', 100))
        .rejects.toThrow('Transaction confirmation timeout')
    })
  })
})


