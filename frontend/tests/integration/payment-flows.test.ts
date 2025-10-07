/**
 * Payment Flows Integration Tests
 * Comprehensive testing for payment processing workflows
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { enhancedPaymentProcessor } from '../../src/services/enhanced-payment-processor';
import { enhancedWalletService } from '../../src/services/enhanced-wallet-service';

// Mock the Solana service
vi.mock('../../src/services/solana', () => ({
  solanaService: {
    createTransferTransaction: vi.fn(),
    transferToken: vi.fn(),
    sendTransaction: vi.fn(),
    verifyTransaction: vi.fn(),
    createEscrow: vi.fn(),
    fundEscrow: vi.fn(),
    releaseEscrow: vi.fn(),
    cancelEscrow: vi.fn(),
    placeAuctionBid: vi.fn(),
    getTokenBalance: vi.fn(),
  }
}));

describe('Payment Flows Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock wallet service
    vi.mocked(enhancedWalletService.isConnected).mockReturnValue(true);
    vi.mocked(enhancedWalletService.getAddress).mockReturnValue('test-wallet-address');
    vi.mocked(enhancedWalletService.getBalance).mockReturnValue(10.0);
    vi.mocked(enhancedWalletService.getNetwork).mockReturnValue('mainnet');
    vi.mocked(enhancedWalletService.signTransaction).mockResolvedValue('signed-transaction');
    vi.mocked(enhancedWalletService.signAllTransactions).mockResolvedValue(['signed-tx1', 'signed-tx2']);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('SOL Payment Flow', () => {
    it('should complete SOL payment flow successfully', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      // Mock successful transaction creation
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: true,
        data: {
          transaction: 'test-transaction',
          fee: 0.000005
        }
      });

      // Mock successful signing
      vi.mocked(enhancedWalletService.signTransaction).mockResolvedValue('signed-transaction');

      // Mock successful sending
      vi.mocked(solanaService.sendTransaction).mockResolvedValue({
        success: true,
        data: {
          signature: 'test-signature'
        }
      });

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address',
        memo: 'Test payment'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(true);
      expect(response.signature).toBe('test-signature');
      expect(response.details?.amount).toBe(2.5);
      expect(response.details?.currency).toBe('SOL');
      expect(response.details?.recipient).toBe('recipient-address');
    });

    it('should handle insufficient SOL balance', async () => {
      vi.mocked(enhancedWalletService.getBalance).mockReturnValue(1.0);

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Insufficient SOL balance');
    });

    it('should handle wallet not connected', async () => {
      vi.mocked(enhancedWalletService.isConnected).mockReturnValue(false);

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Wallet not connected');
    });

    it('should handle transaction creation failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: false,
        error: 'Transaction creation failed'
      });

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Transaction creation failed');
    });

    it('should handle transaction signing failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: true,
        data: {
          transaction: 'test-transaction',
          fee: 0.000005
        }
      });

      vi.mocked(enhancedWalletService.signTransaction).mockRejectedValue(new Error('Signing failed'));

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Signing failed');
    });

    it('should handle transaction sending failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: true,
        data: {
          transaction: 'test-transaction',
          fee: 0.000005
        }
      });

      vi.mocked(enhancedWalletService.signTransaction).mockResolvedValue('signed-transaction');
      vi.mocked(solanaService.sendTransaction).mockResolvedValue({
        success: false,
        error: 'Transaction sending failed'
      });

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Transaction sending failed');
    });
  });

  describe('SPL Token Payment Flow', () => {
    it('should complete USDC payment flow successfully', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      // Mock token balance check
      vi.mocked(solanaService.getTokenBalance).mockResolvedValue(1000);

      // Mock successful token transfer
      vi.mocked(solanaService.transferToken).mockResolvedValue({
        success: true,
        data: {
          transaction: 'test-transaction',
          fee: 0.000005
        }
      });

      // Mock successful signing
      vi.mocked(enhancedWalletService.signTransaction).mockResolvedValue('signed-transaction');

      // Mock successful sending
      vi.mocked(solanaService.sendTransaction).mockResolvedValue({
        success: true,
        data: {
          signature: 'test-signature'
        }
      });

      const paymentRequest = {
        amount: 100,
        currency: 'USDC' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSPLTokenPayment(paymentRequest);

      expect(response.success).toBe(true);
      expect(response.signature).toBe('test-signature');
      expect(response.details?.amount).toBe(100);
      expect(response.details?.currency).toBe('USDC');
    });

    it('should handle insufficient token balance', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.getTokenBalance).mockResolvedValue(50);

      const paymentRequest = {
        amount: 100,
        currency: 'USDC' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSPLTokenPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Insufficient USDC balance');
    });

    it('should handle unsupported currency', async () => {
      const paymentRequest = {
        amount: 100,
        currency: 'INVALID' as any,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSPLTokenPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unsupported currency: INVALID');
    });

    it('should handle token transfer failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      vi.mocked(solanaService.getTokenBalance).mockResolvedValue(1000);
      vi.mocked(solanaService.transferToken).mockResolvedValue({
        success: false,
        error: 'Token transfer failed'
      });

      const paymentRequest = {
        amount: 100,
        currency: 'USDC' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSPLTokenPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Token transfer failed');
    });
  });

  describe('Payment Verification Flow', () => {
    it('should verify payment successfully', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.verifyTransaction).mockResolvedValue({
        success: true,
        data: {
          confirmed: true,
          success: true,
          blockTime: 1640995200,
          slot: 12345
        }
      });

      const status = await enhancedPaymentProcessor.verifyPayment('test-signature');

      expect(status.confirmed).toBe(true);
      expect(status.success).toBe(true);
      expect(status.signature).toBe('test-signature');
      expect(status.blockTime).toBe(1640995200);
      expect(status.slot).toBe(12345);
    });

    it('should handle verification failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.verifyTransaction).mockResolvedValue({
        success: false,
        error: 'Transaction not found'
      });

      const status = await enhancedPaymentProcessor.verifyPayment('test-signature');

      expect(status.confirmed).toBe(false);
      expect(status.success).toBe(false);
      expect(status.error).toBe('Transaction not found');
    });

    it('should handle failed transaction verification', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.verifyTransaction).mockResolvedValue({
        success: true,
        data: {
          confirmed: true,
          success: false,
          error: 'Insufficient funds'
        }
      });

      const status = await enhancedPaymentProcessor.verifyPayment('test-signature');

      expect(status.confirmed).toBe(true);
      expect(status.success).toBe(false);
      expect(status.error).toBe('Insufficient funds');
    });
  });

  describe('Escrow Payment Flow', () => {
    it('should complete escrow payment flow successfully', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      // Mock escrow creation
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      // Mock escrow funding
      vi.mocked(solanaService.fundEscrow).mockResolvedValue({
        success: true,
        data: {
          signature: 'fund-signature',
          fee: 0.000005
        }
      });

      // Mock escrow release
      vi.mocked(solanaService.releaseEscrow).mockResolvedValue({
        success: true,
        data: {
          signature: 'release-signature',
          fee: 0.000005
        }
      });

      // Create escrow
      const escrow = await enhancedPaymentProcessor.createEscrowPayment(
        2.5,
        'SOL',
        'seller-address',
        24
      );

      expect(escrow.amount).toBe(2.5);
      expect(escrow.currency).toBe('SOL');
      expect(escrow.seller).toBe('seller-address');
      expect(escrow.status).toBe('pending');

      // Fund escrow
      const fundResponse = await enhancedPaymentProcessor.fundEscrow(escrow.escrowAddress);

      expect(fundResponse.success).toBe(true);
      expect(fundResponse.signature).toBe('fund-signature');

      // Release escrow
      const releaseResponse = await enhancedPaymentProcessor.releaseEscrow(escrow.escrowAddress);

      expect(releaseResponse.success).toBe(true);
      expect(releaseResponse.signature).toBe('release-signature');
    });

    it('should handle escrow creation failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: false,
        error: 'Escrow creation failed'
      });

      await expect(
        enhancedPaymentProcessor.createEscrowPayment(2.5, 'SOL', 'seller-address')
      ).rejects.toThrow('Escrow creation failed');
    });

    it('should handle escrow funding failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      // Mock successful escrow creation
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      const escrow = await enhancedPaymentProcessor.createEscrowPayment(
        2.5,
        'SOL',
        'seller-address'
      );

      // Mock funding failure
      vi.mocked(solanaService.fundEscrow).mockResolvedValue({
        success: false,
        error: 'Funding failed'
      });

      const response = await enhancedPaymentProcessor.fundEscrow(escrow.escrowAddress);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Funding failed');
    });

    it('should handle escrow release failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      // Mock successful escrow creation and funding
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      vi.mocked(solanaService.fundEscrow).mockResolvedValue({
        success: true,
        data: {
          signature: 'fund-signature'
        }
      });

      const escrow = await enhancedPaymentProcessor.createEscrowPayment(
        2.5,
        'SOL',
        'seller-address'
      );

      await enhancedPaymentProcessor.fundEscrow(escrow.escrowAddress);

      // Mock release failure
      vi.mocked(solanaService.releaseEscrow).mockResolvedValue({
        success: false,
        error: 'Release failed'
      });

      const response = await enhancedPaymentProcessor.releaseEscrow(escrow.escrowAddress);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Release failed');
    });

    it('should handle escrow cancellation', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      // Mock successful escrow creation
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      const escrow = await enhancedPaymentProcessor.createEscrowPayment(
        2.5,
        'SOL',
        'seller-address'
      );

      // Mock cancellation
      vi.mocked(solanaService.cancelEscrow).mockResolvedValue({
        success: true,
        data: {
          signature: 'cancel-signature',
          fee: 0.000005
        }
      });

      const response = await enhancedPaymentProcessor.cancelEscrow(escrow.escrowAddress);

      expect(response.success).toBe(true);
      expect(response.signature).toBe('cancel-signature');
    });
  });

  describe('Auction Bidding Flow', () => {
    it('should complete auction bidding flow successfully', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.placeAuctionBid).mockResolvedValue({
        success: true,
        data: {
          signature: 'bid-signature'
        }
      });

      const bid = await enhancedPaymentProcessor.placeAuctionBid(
        'auction-123',
        5.0,
        'SOL'
      );

      expect(bid.auctionId).toBe('auction-123');
      expect(bid.bidder).toBe('test-wallet-address');
      expect(bid.amount).toBe(5.0);
      expect(bid.currency).toBe('SOL');
      expect(bid.signature).toBe('bid-signature');
    });

    it('should handle auction bidding failure', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.placeAuctionBid).mockResolvedValue({
        success: false,
        error: 'Bid too low'
      });

      await expect(
        enhancedPaymentProcessor.placeAuctionBid('auction-123', 1.0, 'SOL')
      ).rejects.toThrow('Bid too low');
    });
  });

  describe('Payment History Management', () => {
    it('should track payment history', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: true,
        data: {
          transaction: 'test-transaction',
          fee: 0.000005
        }
      });

      vi.mocked(enhancedWalletService.signTransaction).mockResolvedValue('signed-transaction');
      vi.mocked(solanaService.sendTransaction).mockResolvedValue({
        success: true,
        data: {
          signature: 'test-signature'
        }
      });

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      const history = enhancedPaymentProcessor.getPaymentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
      expect(history[0].signature).toBe('test-signature');
    });

    it('should track failed payments', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: false,
        error: 'Transaction failed'
      });

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      const history = enhancedPaymentProcessor.getPaymentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
      expect(history[0].error).toBe('Transaction failed');
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed transactions', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      // Mock first attempt failure
      vi.mocked(solanaService.createTransferTransaction)
        .mockResolvedValueOnce({
          success: false,
          error: 'Temporary failure'
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            transaction: 'test-transaction',
            fee: 0.000005
          }
        });

      vi.mocked(enhancedWalletService.signTransaction).mockResolvedValue('signed-transaction');
      vi.mocked(solanaService.sendTransaction).mockResolvedValue({
        success: true,
        data: {
          signature: 'test-signature'
        }
      });

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(true);
      expect(solanaService.createTransferTransaction).toHaveBeenCalledTimes(2);
    });

    it('should handle network timeouts gracefully', async () => {
      const { solanaService } = await import('../../src/services/solana');
      vi.mocked(solanaService.createTransferTransaction).mockRejectedValue(
        new Error('Request timeout')
      );

      const paymentRequest = {
        amount: 2.5,
        currency: 'SOL' as const,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Request timeout');
    });
  });

  describe('Concurrent Payment Handling', () => {
    it('should handle multiple concurrent payments', async () => {
      const { solanaService } = await import('../../src/services/solana');
      
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: true,
        data: {
          transaction: 'test-transaction',
          fee: 0.000005
        }
      });

      vi.mocked(enhancedWalletService.signTransaction).mockResolvedValue('signed-transaction');
      vi.mocked(solanaService.sendTransaction).mockResolvedValue({
        success: true,
        data: {
          signature: 'test-signature'
        }
      });

      const paymentRequests = [
        { amount: 1.0, currency: 'SOL' as const, recipient: 'recipient1' },
        { amount: 2.0, currency: 'SOL' as const, recipient: 'recipient2' },
        { amount: 3.0, currency: 'SOL' as const, recipient: 'recipient3' }
      ];

      const responses = await Promise.all(
        paymentRequests.map(request => enhancedPaymentProcessor.processSOLPayment(request))
      );

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      const history = enhancedPaymentProcessor.getPaymentHistory();
      expect(history).toHaveLength(3);
    });
  });
});
