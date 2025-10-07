/**
 * Enhanced Payment Processor Tests
 * Comprehensive testing for the enhanced payment processor
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  enhancedPaymentProcessor, 
  PaymentRequest, 
  PaymentResponse, 
  PaymentStatus, 
  EscrowPayment, 
  AuctionBid 
} from '../enhanced-payment-processor.ts';

// Mock the Solana service
vi.mock('../solana', () => ({
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

// Mock the enhanced wallet service
vi.mock('../enhanced-wallet-service', () => ({
  enhancedWalletService: {
    isConnected: vi.fn(() => true),
    getAddress: vi.fn(() => 'test-wallet-address'),
    getBalance: vi.fn(() => 10.0),
    getNetwork: vi.fn(() => 'mainnet'),
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
  }
}));

describe('EnhancedPaymentProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    // Reset payment processor state
    (enhancedPaymentProcessor as any).paymentHistory = [];
    (enhancedPaymentProcessor as any).escrowPayments.clear();
    (enhancedPaymentProcessor as any).auctionBids.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SOL Payment Processing', () => {
    it('should process SOL payment successfully', async () => {
      const { solanaService } = await import('../solana');
      const { enhancedWalletService } = await import('../enhanced-wallet-service');

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

      const paymentRequest: PaymentRequest = {
        amount: 1.5,
        currency: 'SOL',
        recipient: 'recipient-address',
        memo: 'Test payment'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(true);
      expect(response.signature).toBe('test-signature');
      expect(response.details?.amount).toBe(1.5);
      expect(response.details?.currency).toBe('SOL');
      expect(response.details?.recipient).toBe('recipient-address');
    });

    it('should handle insufficient SOL balance', async () => {
      const { enhancedWalletService } = await import('../enhanced-wallet-service');
      vi.mocked(enhancedWalletService.getBalance).mockReturnValue(0.5);

      const paymentRequest: PaymentRequest = {
        amount: 1.5,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Insufficient SOL balance');
    });

    it('should handle wallet not connected', async () => {
      const { enhancedWalletService } = await import('../enhanced-wallet-service');
      vi.mocked(enhancedWalletService.isConnected).mockReturnValue(false);

      const paymentRequest: PaymentRequest = {
        amount: 1.5,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Wallet not connected');
    });

    it('should handle transaction creation failure', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: false,
        error: 'Transaction creation failed'
      });

      const paymentRequest: PaymentRequest = {
        amount: 1.5,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Transaction creation failed');
    });

    it('should handle transaction signing failure', async () => {
      const { solanaService } = await import('../solana');
      const { enhancedWalletService } = await import('../enhanced-wallet-service');

      vi.mocked(solanaService.createTransferTransaction).mockResolvedValue({
        success: true,
        data: {
          transaction: 'test-transaction',
          fee: 0.000005
        }
      });

      vi.mocked(enhancedWalletService.signTransaction).mockRejectedValue(new Error('Signing failed'));

      const paymentRequest: PaymentRequest = {
        amount: 1.5,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Signing failed');
    });
  });

  describe('SPL Token Payment Processing', () => {
    it('should process USDC payment successfully', async () => {
      const { solanaService } = await import('../solana');
      const { enhancedWalletService } = await import('../enhanced-wallet-service');

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

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USDC',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSPLTokenPayment(paymentRequest);

      expect(response.success).toBe(true);
      expect(response.signature).toBe('test-signature');
      expect(response.details?.amount).toBe(100);
      expect(response.details?.currency).toBe('USDC');
    });

    it('should handle unsupported currency', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'INVALID' as any,
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSPLTokenPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unsupported currency: INVALID');
    });

    it('should handle insufficient token balance', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.getTokenBalance).mockResolvedValue(50);

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USDC',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSPLTokenPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Insufficient USDC balance');
    });
  });

  describe('Payment Verification', () => {
    it('should verify payment successfully', async () => {
      const { solanaService } = await import('../solana');
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
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.verifyTransaction).mockResolvedValue({
        success: false,
        error: 'Transaction not found'
      });

      const status = await enhancedPaymentProcessor.verifyPayment('test-signature');

      expect(status.confirmed).toBe(false);
      expect(status.success).toBe(false);
      expect(status.error).toBe('Transaction not found');
    });
  });

  describe('Escrow Payment Management', () => {
    it('should create escrow payment successfully', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      const escrow = await enhancedPaymentProcessor.createEscrowPayment(
        1.5,
        'SOL',
        'seller-address',
        24
      );

      expect(escrow.amount).toBe(1.5);
      expect(escrow.currency).toBe('SOL');
      expect(escrow.buyer).toBe('test-wallet-address');
      expect(escrow.seller).toBe('seller-address');
      expect(escrow.status).toBe('pending');
      expect(escrow.escrowAddress).toBe('test-escrow-address');
    });

    it('should fund escrow successfully', async () => {
      const { solanaService } = await import('../solana');
      
      // Create escrow first
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      const escrow = await enhancedPaymentProcessor.createEscrowPayment(
        1.5,
        'SOL',
        'seller-address'
      );

      // Mock funding
      vi.mocked(solanaService.fundEscrow).mockResolvedValue({
        success: true,
        data: {
          signature: 'fund-signature',
          fee: 0.000005
        }
      });

      const response = await enhancedPaymentProcessor.fundEscrow(escrow.escrowAddress);

      expect(response.success).toBe(true);
      expect(response.signature).toBe('fund-signature');
      expect(response.details?.amount).toBe(1.5);
    });

    it('should release escrow successfully', async () => {
      const { solanaService } = await import('../solana');
      
      // Create and fund escrow
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
        1.5,
        'SOL',
        'seller-address'
      );

      await enhancedPaymentProcessor.fundEscrow(escrow.escrowAddress);

      // Mock release
      vi.mocked(solanaService.releaseEscrow).mockResolvedValue({
        success: true,
        data: {
          signature: 'release-signature',
          fee: 0.000005
        }
      });

      const response = await enhancedPaymentProcessor.releaseEscrow(escrow.escrowAddress);

      expect(response.success).toBe(true);
      expect(response.signature).toBe('release-signature');
    });

    it('should cancel escrow successfully', async () => {
      const { solanaService } = await import('../solana');
      
      // Create escrow
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      const escrow = await enhancedPaymentProcessor.createEscrowPayment(
        1.5,
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

  describe('Auction Bidding', () => {
    it('should place auction bid successfully', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.placeAuctionBid).mockResolvedValue({
        success: true,
        data: {
          signature: 'bid-signature'
        }
      });

      const bid = await enhancedPaymentProcessor.placeAuctionBid(
        'auction-123',
        2.5,
        'SOL'
      );

      expect(bid.auctionId).toBe('auction-123');
      expect(bid.bidder).toBe('test-wallet-address');
      expect(bid.amount).toBe(2.5);
      expect(bid.currency).toBe('SOL');
      expect(bid.signature).toBe('bid-signature');
    });

    it('should handle bid placement failure', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.placeAuctionBid).mockResolvedValue({
        success: false,
        error: 'Bid too low'
      });

      await expect(
        enhancedPaymentProcessor.placeAuctionBid('auction-123', 1.0, 'SOL')
      ).rejects.toThrow('Bid too low');
    });
  });

  describe('Payment History', () => {
    it('should track payment history', async () => {
      const { solanaService } = await import('../solana');
      const { enhancedWalletService } = await import('../enhanced-wallet-service');

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

      const paymentRequest: PaymentRequest = {
        amount: 1.5,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      const history = enhancedPaymentProcessor.getPaymentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
      expect(history[0].signature).toBe('test-signature');
    });

    it('should load payment history from localStorage', () => {
      const mockHistory = [
        {
          success: true,
          signature: 'test-signature',
          details: {
            amount: 1.5,
            currency: 'SOL',
            recipient: 'recipient-address',
            fee: 0.000005,
            network: 'mainnet',
            timestamp: Date.now()
          }
        }
      ];

      localStorage.setItem('soladia-payment-history', JSON.stringify(mockHistory));

      // Create new instance to test loading
      const { EnhancedPaymentProcessor } = require('../enhanced-payment-processor');
      const processor = new EnhancedPaymentProcessor();

      const history = processor.getPaymentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].signature).toBe('test-signature');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.createTransferTransaction).mockRejectedValue(
        new Error('Network error')
      );

      const paymentRequest: PaymentRequest = {
        amount: 1.5,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });

    it('should handle invalid payment amounts', async () => {
      const paymentRequest: PaymentRequest = {
        amount: -1.5,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid payment amount');
    });

    it('should handle zero payment amounts', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 0,
        currency: 'SOL',
        recipient: 'recipient-address'
      };

      const response = await enhancedPaymentProcessor.processSOLPayment(paymentRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid payment amount');
    });
  });

  describe('Data Persistence', () => {
    it('should save escrow payments to localStorage', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.createEscrow).mockResolvedValue({
        success: true,
        data: {
          escrow_address: 'test-escrow-address'
        }
      });

      await enhancedPaymentProcessor.createEscrowPayment(
        1.5,
        'SOL',
        'seller-address'
      );

      const saved = localStorage.getItem('soladia-escrow-payments');
      expect(saved).toBeTruthy();

      const escrowPayments = JSON.parse(saved!);
      expect(escrowPayments).toHaveLength(1);
      expect(escrowPayments[0].amount).toBe(1.5);
    });

    it('should save auction bids to localStorage', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.placeAuctionBid).mockResolvedValue({
        success: true,
        data: {
          signature: 'bid-signature'
        }
      });

      await enhancedPaymentProcessor.placeAuctionBid(
        'auction-123',
        2.5,
        'SOL'
      );

      const saved = localStorage.getItem('soladia-auction-bids');
      expect(saved).toBeTruthy();

      const auctionBids = JSON.parse(saved!);
      expect(auctionBids['auction-123']).toHaveLength(1);
      expect(auctionBids['auction-123'][0].amount).toBe(2.5);
    });
  });

  describe('Utility Functions', () => {
    it('should get correct token mint addresses', () => {
      const processor = enhancedPaymentProcessor as any;
      
      expect(processor.getTokenMintAddress('USDC')).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(processor.getTokenMintAddress('USDT')).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
      expect(processor.getTokenMintAddress('RAY')).toBe('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R');
      expect(processor.getTokenMintAddress('SRM')).toBe('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt');
      expect(processor.getTokenMintAddress('INVALID')).toBeNull();
    });

    it('should get token balance', async () => {
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.getTokenBalance).mockResolvedValue(1000);

      const processor = enhancedPaymentProcessor as any;
      const balance = await processor.getTokenBalance('test-address', 'test-mint');

      expect(balance).toBe(1000);
    });
  });
});
